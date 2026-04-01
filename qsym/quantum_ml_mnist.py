#!/usr/bin/env python3
"""
Quantum handwritten digit classifier with training progress and drawing UI.

This script supports:
1) Loading handwritten digits data from scikit-learn (MNIST when available, else fallback).
2) Training a hybrid quantum-classical classifier using PennyLane qubits.
3) Showing batch and epoch training progress.
4) Opening a drawing canvas where you can draw a number and get predictions.

Examples:
  python3 quantum_ml_mnist.py --mode train
  python3 quantum_ml_mnist.py --mode draw
  python3 quantum_ml_mnist.py --mode train-and-draw
"""

from __future__ import annotations

import argparse
import math
import pickle
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pennylane as qml
import tkinter as tk
from pennylane import numpy as pnp
from sklearn.datasets import fetch_openml, load_digits
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "quantum_digit_model.pkl"
DEFAULT_HISTORY_PLOT = Path(__file__).resolve().parent / "quantum_training_history.png"


@dataclass
class DatasetBundle:
    x_train_raw: np.ndarray
    x_test_raw: np.ndarray
    y_train: np.ndarray
    y_test: np.ndarray
    dataset_name: str
    image_shape: Tuple[int, int]


def load_handwritten_dataset(source: str, max_samples: int, test_size: float, seed: int) -> DatasetBundle:
    """Load handwritten digits data from sklearn.

    source:
      - auto: try MNIST from OpenML, fallback to sklearn digits dataset.
      - mnist: force OpenML MNIST (will fallback if download fails).
      - digits: use sklearn built-in digits dataset.
    """
    x_data = None
    y_data = None
    dataset_name = ""
    image_shape = (0, 0)

    if source in {"auto", "mnist"}:
        try:
            print("Loading MNIST from sklearn OpenML...")
            mnist = fetch_openml("mnist_784", version=1, as_frame=False)
            x_data = mnist.data.astype(np.float32) / 255.0
            y_data = mnist.target.astype(np.int64)
            dataset_name = "MNIST (OpenML)"
            image_shape = (28, 28)
            print(f"Loaded {len(x_data)} MNIST samples.")
        except Exception as exc:
            if source == "mnist":
                print("Warning: Could not load OpenML MNIST, falling back to sklearn digits.")
                print(f"Reason: {exc}")
            elif source == "auto":
                print("OpenML MNIST unavailable, falling back to sklearn digits dataset.")

    if x_data is None or y_data is None:
        digits = load_digits()
        x_data = digits.data.astype(np.float32) / 16.0
        y_data = digits.target.astype(np.int64)
        dataset_name = "Digits (sklearn load_digits)"
        image_shape = (8, 8)
        print(f"Loaded {len(x_data)} digits samples from sklearn built-in dataset.")

    if max_samples > 0 and len(x_data) > max_samples:
        x_data, _, y_data, _ = train_test_split(
            x_data,
            y_data,
            train_size=max_samples,
            random_state=seed,
            stratify=y_data,
        )
        print(f"Using a stratified subset of {len(x_data)} samples for faster quantum training.")

    x_train_raw, x_test_raw, y_train, y_test = train_test_split(
        x_data,
        y_data,
        test_size=test_size,
        random_state=seed,
        stratify=y_data,
    )

    return DatasetBundle(
        x_train_raw=x_train_raw,
        x_test_raw=x_test_raw,
        y_train=y_train,
        y_test=y_test,
        dataset_name=dataset_name,
        image_shape=image_shape,
    )


def build_quantum_qnode(n_qubits: int, n_layers: int):
    """Create a parameterized quantum circuit returning full state probabilities."""
    device = qml.device("default.qubit", wires=n_qubits)

    @qml.qnode(device, interface="autograd")
    def qnode(x_features, input_scales, q_weights):
        # Re-upload data at every layer with trainable scaling for more expressive features.
        for layer in range(n_layers):
            scaled_features = x_features * input_scales[layer]
            qml.AngleEmbedding(scaled_features, wires=range(n_qubits), rotation="Y")

            for wire in range(n_qubits):
                qml.Rot(
                    q_weights[layer, wire, 0],
                    q_weights[layer, wire, 1],
                    q_weights[layer, wire, 2],
                    wires=wire,
                )

            if n_qubits > 1:
                for wire in range(n_qubits - 1):
                    qml.CNOT(wires=[wire, wire + 1])
                qml.CNOT(wires=[n_qubits - 1, 0])

        return qml.probs(wires=range(n_qubits))

    return qnode


def softmax(logits: pnp.ndarray) -> pnp.ndarray:
    shifted = logits - pnp.max(logits)
    exp_vals = pnp.exp(shifted)
    return exp_vals / pnp.sum(exp_vals)


def model_forward(
    input_scales: pnp.ndarray,
    q_weights: pnp.ndarray,
    dense_w1: pnp.ndarray,
    dense_b1: pnp.ndarray,
    dense_w2: pnp.ndarray,
    dense_b2: pnp.ndarray,
    x_sample: pnp.ndarray,
    qnode,
) -> pnp.ndarray:
    quantum_features = qnode(x_sample, input_scales, q_weights)
    hidden = pnp.tanh(pnp.dot(quantum_features, dense_w1) + dense_b1)
    logits = pnp.dot(hidden, dense_w2) + dense_b2
    return logits


def sample_cross_entropy(
    input_scales: pnp.ndarray,
    q_weights: pnp.ndarray,
    dense_w1: pnp.ndarray,
    dense_b1: pnp.ndarray,
    dense_w2: pnp.ndarray,
    dense_b2: pnp.ndarray,
    x_sample: pnp.ndarray,
    y_label: int,
    qnode,
) -> pnp.ndarray:
    logits = model_forward(
        input_scales,
        q_weights,
        dense_w1,
        dense_b1,
        dense_w2,
        dense_b2,
        x_sample,
        qnode,
    )
    probabilities = softmax(logits)
    return -pnp.log(probabilities[y_label] + 1e-10)


def batch_loss(
    input_scales: pnp.ndarray,
    q_weights: pnp.ndarray,
    dense_w1: pnp.ndarray,
    dense_b1: pnp.ndarray,
    dense_w2: pnp.ndarray,
    dense_b2: pnp.ndarray,
    x_batch: pnp.ndarray,
    y_batch: np.ndarray,
    qnode,
) -> pnp.ndarray:
    losses = [
        sample_cross_entropy(
            input_scales,
            q_weights,
            dense_w1,
            dense_b1,
            dense_w2,
            dense_b2,
            x,
            int(y),
            qnode,
        )
        for x, y in zip(x_batch, y_batch)
    ]
    return pnp.mean(pnp.stack(losses))


def evaluate(
    input_scales: pnp.ndarray,
    q_weights: pnp.ndarray,
    dense_w1: pnp.ndarray,
    dense_b1: pnp.ndarray,
    dense_w2: pnp.ndarray,
    dense_b2: pnp.ndarray,
    x_data: pnp.ndarray,
    y_data: np.ndarray,
    qnode,
) -> Tuple[float, float]:
    losses: List[float] = []
    correct = 0

    for x_sample, y_label in zip(x_data, y_data):
        logits = model_forward(
            input_scales,
            q_weights,
            dense_w1,
            dense_b1,
            dense_w2,
            dense_b2,
            x_sample,
            qnode,
        )
        probs = np.asarray(softmax(logits), dtype=np.float64)
        losses.append(float(-np.log(probs[int(y_label)] + 1e-10)))
        pred = int(np.argmax(probs))
        correct += int(pred == int(y_label))

    return float(np.mean(losses)), correct / len(y_data)


def preprocess_for_quantum(
    x_train_raw: np.ndarray,
    x_test_raw: np.ndarray,
    n_qubits: int,
) -> Tuple[np.ndarray, np.ndarray, PCA, MinMaxScaler]:
    """Project raw features to qubit-sized vectors and scale to angle range."""
    pca = PCA(n_components=n_qubits, random_state=0)
    x_train_reduced = pca.fit_transform(x_train_raw)
    x_test_reduced = pca.transform(x_test_raw)

    angle_scaler = MinMaxScaler(feature_range=(-np.pi, np.pi))
    x_train_angles = angle_scaler.fit_transform(x_train_reduced)
    x_test_angles = angle_scaler.transform(x_test_reduced)

    return x_train_angles, x_test_angles, pca, angle_scaler


def save_training_plot(history: List[Dict[str, float]], plot_path: Path) -> None:
    if not history:
        return

    epochs = [entry["epoch"] for entry in history]
    train_loss = [entry["train_loss"] for entry in history]
    test_loss = [entry["test_loss"] for entry in history]
    train_acc = [entry["train_acc"] for entry in history]
    test_acc = [entry["test_acc"] for entry in history]

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    axes[0].plot(epochs, train_loss, marker="o", label="Train")
    axes[0].plot(epochs, test_loss, marker="o", label="Test")
    axes[0].set_title("Loss by Epoch")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Cross-Entropy")
    axes[0].grid(alpha=0.3)
    axes[0].legend()

    axes[1].plot(epochs, train_acc, marker="o", label="Train")
    axes[1].plot(epochs, test_acc, marker="o", label="Test")
    axes[1].set_title("Accuracy by Epoch")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].set_ylim(0.0, 1.0)
    axes[1].grid(alpha=0.3)
    axes[1].legend()

    plt.tight_layout()
    fig.savefig(plot_path, dpi=150)
    plt.close(fig)


def train_model(args) -> Dict:
    print("=" * 80)
    print("Quantum Handwritten Digit Training")
    print("=" * 80)

    dataset = load_handwritten_dataset(
        source=args.dataset,
        max_samples=args.max_samples,
        test_size=args.test_size,
        seed=args.seed,
    )

    n_features = dataset.x_train_raw.shape[1]
    if args.n_qubits > n_features:
        print(
            f"Requested {args.n_qubits} qubits but dataset has only {n_features} features. "
            f"Using {n_features} qubits instead."
        )
    n_qubits = min(args.n_qubits, n_features)

    x_train_angles, x_test_angles, pca, angle_scaler = preprocess_for_quantum(
        dataset.x_train_raw,
        dataset.x_test_raw,
        n_qubits=n_qubits,
    )

    x_train_q = pnp.array(x_train_angles, requires_grad=False)
    x_test_q = pnp.array(x_test_angles, requires_grad=False)
    y_train = dataset.y_train
    y_test = dataset.y_test

    qnode = build_quantum_qnode(n_qubits=n_qubits, n_layers=args.n_layers)
    q_feature_dim = 2 ** n_qubits

    rng = np.random.default_rng(args.seed)
    input_scales = pnp.array(np.ones((args.n_layers, n_qubits), dtype=np.float64), requires_grad=True)
    q_weights = pnp.array(
        rng.normal(loc=0.0, scale=0.15, size=(args.n_layers, n_qubits, 3)),
        requires_grad=True,
    )
    dense_w1 = pnp.array(
        rng.normal(loc=0.0, scale=1.0 / np.sqrt(q_feature_dim), size=(q_feature_dim, args.hidden_dim)),
        requires_grad=True,
    )
    dense_b1 = pnp.array(np.zeros(args.hidden_dim, dtype=np.float64), requires_grad=True)
    dense_w2 = pnp.array(
        rng.normal(loc=0.0, scale=1.0 / np.sqrt(args.hidden_dim), size=(args.hidden_dim, 10)),
        requires_grad=True,
    )
    dense_b2 = pnp.array(np.zeros(10, dtype=np.float64), requires_grad=True)

    optimizer = qml.AdamOptimizer(stepsize=args.learning_rate)

    total_batches = math.ceil(len(x_train_q) / args.batch_size)
    history: List[Dict[str, float]] = []

    print(f"Dataset: {dataset.dataset_name}")
    print(f"Train samples: {len(x_train_q)} | Test samples: {len(x_test_q)}")
    print(f"Qubits: {n_qubits} | Layers: {args.n_layers} | Epochs: {args.epochs}")
    print(f"Quantum feature dimension: {q_feature_dim} | Hidden size: {args.hidden_dim}")
    print(f"Batch size: {args.batch_size} | Learning rate: {args.learning_rate}")
    print("-" * 80)

    for epoch in range(1, args.epochs + 1):
        permutation = rng.permutation(len(x_train_q))
        x_epoch = x_train_q[permutation]
        y_epoch = y_train[permutation]

        running_batch_losses: List[float] = []

        for batch_idx in range(total_batches):
            start = batch_idx * args.batch_size
            end = min(start + args.batch_size, len(x_epoch))
            x_batch = x_epoch[start:end]
            y_batch = y_epoch[start:end]

            objective = lambda inp, qw, w1, b1, w2, b2: batch_loss(
                inp,
                qw,
                w1,
                b1,
                w2,
                b2,
                x_batch,
                y_batch,
                qnode,
            )
            (
                input_scales,
                q_weights,
                dense_w1,
                dense_b1,
                dense_w2,
                dense_b2,
            ), batch_loss_val = optimizer.step_and_cost(
                objective,
                input_scales,
                q_weights,
                dense_w1,
                dense_b1,
                dense_w2,
                dense_b2,
            )
            running_batch_losses.append(float(batch_loss_val))

            if args.batch_log_interval > 0 and (
                (batch_idx + 1) % args.batch_log_interval == 0 or (batch_idx + 1) == total_batches
            ):
                print(
                    f"Epoch {epoch:02d}/{args.epochs:02d} "
                    f"Batch {batch_idx + 1:03d}/{total_batches:03d} "
                    f"Loss {float(batch_loss_val):.4f}"
                )

        train_loss, train_acc = evaluate(
            input_scales,
            q_weights,
            dense_w1,
            dense_b1,
            dense_w2,
            dense_b2,
            x_train_q,
            y_train,
            qnode,
        )
        test_loss, test_acc = evaluate(
            input_scales,
            q_weights,
            dense_w1,
            dense_b1,
            dense_w2,
            dense_b2,
            x_test_q,
            y_test,
            qnode,
        )

        summary = {
            "epoch": float(epoch),
            "batch_loss_mean": float(np.mean(running_batch_losses)),
            "train_loss": train_loss,
            "train_acc": train_acc,
            "test_loss": test_loss,
            "test_acc": test_acc,
        }
        history.append(summary)

        print(
            f"[Epoch {epoch:02d}/{args.epochs:02d}] "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc * 100:5.2f}% | "
            f"Test Loss: {test_loss:.4f} | Test Acc: {test_acc * 100:5.2f}%"
        )
        print("-" * 80)

    model_data = {
        "input_scales": np.asarray(input_scales, dtype=np.float64),
        "q_weights": np.asarray(q_weights, dtype=np.float64),
        "dense_w1": np.asarray(dense_w1, dtype=np.float64),
        "dense_b1": np.asarray(dense_b1, dtype=np.float64),
        "dense_w2": np.asarray(dense_w2, dtype=np.float64),
        "dense_b2": np.asarray(dense_b2, dtype=np.float64),
        "hidden_dim": args.hidden_dim,
        "n_qubits": n_qubits,
        "n_layers": args.n_layers,
        "dataset_name": dataset.dataset_name,
        "image_shape": dataset.image_shape,
        "pca": pca,
        "angle_scaler": angle_scaler,
        "history": history,
        "seed": args.seed,
    }

    model_path = Path(args.model_path)
    with model_path.open("wb") as f:
        pickle.dump(model_data, f)

    history_plot_path = Path(args.history_plot)
    save_training_plot(history, history_plot_path)

    print(f"Model saved to: {model_path}")
    print(f"Training plot saved to: {history_plot_path}")
    print("Training complete.")

    return model_data


def average_resize(image: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    """Resize by averaging over source blocks, avoiding extra dependencies."""
    in_h, in_w = image.shape
    y_edges = np.linspace(0, in_h, out_h + 1, dtype=int)
    x_edges = np.linspace(0, in_w, out_w + 1, dtype=int)

    resized = np.zeros((out_h, out_w), dtype=np.float32)
    for i in range(out_h):
        for j in range(out_w):
            block = image[y_edges[i]: y_edges[i + 1], x_edges[j]: x_edges[j + 1]]
            if block.size:
                resized[i, j] = float(block.mean())

    return resized


class DigitDrawApp:
    def __init__(self, model_data: Dict):
        self.model_data = model_data
        self.n_qubits = int(model_data["n_qubits"])
        self.n_layers = int(model_data["n_layers"])
        self.image_shape = tuple(model_data["image_shape"])

        self.pca: PCA = model_data["pca"]
        self.angle_scaler: MinMaxScaler = model_data["angle_scaler"]

        self.input_scales = pnp.array(model_data["input_scales"], requires_grad=False)
        self.q_weights = pnp.array(model_data["q_weights"], requires_grad=False)
        self.dense_w1 = pnp.array(model_data["dense_w1"], requires_grad=False)
        self.dense_b1 = pnp.array(model_data["dense_b1"], requires_grad=False)
        self.dense_w2 = pnp.array(model_data["dense_w2"], requires_grad=False)
        self.dense_b2 = pnp.array(model_data["dense_b2"], requires_grad=False)
        self.qnode = build_quantum_qnode(n_qubits=self.n_qubits, n_layers=self.n_layers)

        self.grid_size = 28
        self.pixel_scale = 14
        self.brush_radius = 2
        self.pixels = np.zeros((self.grid_size, self.grid_size), dtype=np.float32)

        self.root = tk.Tk()
        self.root.title("Quantum Digit Predictor")

        self.prediction_text = tk.StringVar(value="Draw a digit and press Predict")
        self.probability_text = tk.StringVar(value="")

        self._build_ui()

    def _build_ui(self) -> None:
        container = tk.Frame(self.root, padx=10, pady=10)
        container.pack(fill=tk.BOTH, expand=True)

        canvas_size = self.grid_size * self.pixel_scale
        self.canvas = tk.Canvas(
            container,
            width=canvas_size,
            height=canvas_size,
            bg="black",
            highlightthickness=1,
            highlightbackground="#555555",
        )
        self.canvas.grid(row=0, column=0, columnspan=3, pady=(0, 10))

        self.canvas.bind("<Button-1>", self._paint)
        self.canvas.bind("<B1-Motion>", self._paint)

        predict_button = tk.Button(container, text="Predict", width=16, command=self.predict)
        clear_button = tk.Button(container, text="Clear", width=16, command=self.clear)
        quit_button = tk.Button(container, text="Quit", width=16, command=self.root.destroy)

        predict_button.grid(row=1, column=0, padx=4, pady=4)
        clear_button.grid(row=1, column=1, padx=4, pady=4)
        quit_button.grid(row=1, column=2, padx=4, pady=4)

        prediction_label = tk.Label(
            container,
            textvariable=self.prediction_text,
            font=("Helvetica", 15, "bold"),
            anchor="w",
            justify=tk.LEFT,
        )
        prediction_label.grid(row=2, column=0, columnspan=3, sticky="w")

        probs_label = tk.Label(
            container,
            textvariable=self.probability_text,
            font=("Helvetica", 11),
            anchor="w",
            justify=tk.LEFT,
        )
        probs_label.grid(row=3, column=0, columnspan=3, sticky="w")

    def _paint(self, event) -> None:
        x_center = int(event.x / self.pixel_scale)
        y_center = int(event.y / self.pixel_scale)

        for dy in range(-self.brush_radius, self.brush_radius + 1):
            for dx in range(-self.brush_radius, self.brush_radius + 1):
                x_idx = x_center + dx
                y_idx = y_center + dy
                if not (0 <= x_idx < self.grid_size and 0 <= y_idx < self.grid_size):
                    continue

                distance = math.sqrt(dx * dx + dy * dy)
                value = max(0.0, 1.0 - (distance / (self.brush_radius + 0.5)))
                if value <= 0.0:
                    continue

                self.pixels[y_idx, x_idx] = max(self.pixels[y_idx, x_idx], value)
                gray = int(np.clip(self.pixels[y_idx, x_idx] * 255.0, 0, 255))
                color = f"#{gray:02x}{gray:02x}{gray:02x}"

                x0 = x_idx * self.pixel_scale
                y0 = y_idx * self.pixel_scale
                x1 = x0 + self.pixel_scale
                y1 = y0 + self.pixel_scale
                self.canvas.create_rectangle(x0, y0, x1, y1, fill=color, outline=color)

    def clear(self) -> None:
        self.pixels.fill(0.0)
        self.canvas.delete("all")
        self.prediction_text.set("Draw a digit and press Predict")
        self.probability_text.set("")

    def _prepare_raw_input(self) -> np.ndarray:
        target_h, target_w = self.image_shape
        resized = average_resize(self.pixels, target_h, target_w)
        return resized.reshape(1, -1)

    def predict(self) -> None:
        if np.max(self.pixels) <= 1e-6:
            self.prediction_text.set("Canvas is empty. Draw a number first.")
            self.probability_text.set("")
            return

        x_raw = self._prepare_raw_input()
        x_reduced = self.pca.transform(x_raw)
        x_angles = self.angle_scaler.transform(x_reduced)[0]

        logits = model_forward(
            self.input_scales,
            self.q_weights,
            self.dense_w1,
            self.dense_b1,
            self.dense_w2,
            self.dense_b2,
            pnp.array(x_angles, requires_grad=False),
            self.qnode,
        )
        probs = np.asarray(softmax(logits), dtype=np.float64)

        prediction = int(np.argmax(probs))
        top3 = np.argsort(probs)[-3:][::-1]
        top3_text = " | ".join([f"{digit}: {probs[digit] * 100:5.2f}%" for digit in top3])

        self.prediction_text.set(f"Predicted digit: {prediction}")
        self.probability_text.set(f"Top probabilities -> {top3_text}")

    def run(self) -> None:
        self.root.mainloop()


def load_model(model_path: Path) -> Dict:
    with model_path.open("rb") as f:
        model_data = pickle.load(f)

    required_keys = {
        "input_scales",
        "q_weights",
        "dense_w1",
        "dense_b1",
        "dense_w2",
        "dense_b2",
        "n_qubits",
        "n_layers",
        "pca",
        "angle_scaler",
        "image_shape",
    }
    missing = sorted(required_keys.difference(model_data.keys()))
    if missing:
        missing_text = ", ".join(missing)
        raise ValueError(
            "Model format is outdated or incomplete. "
            f"Missing keys: {missing_text}. Please retrain with --mode train."
        )

    return model_data


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train and run a quantum handwritten digit classifier with drawing UI."
    )

    parser.add_argument(
        "--mode",
        choices=["train", "draw", "train-and-draw"],
        default="train-and-draw",
        help="train: train and save model | draw: open draw UI using saved model | train-and-draw: do both",
    )

    parser.add_argument(
        "--dataset",
        choices=["auto", "mnist", "digits"],
        default="auto",
        help="Dataset source from sklearn. auto tries MNIST first, then falls back to digits.",
    )

    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=24, help="Mini-batch size.")
    parser.add_argument("--n-qubits", type=int, default=6, help="Number of qubits/features used by the quantum circuit.")
    parser.add_argument("--n-layers", type=int, default=3, help="Number of variational circuit layers.")
    parser.add_argument("--hidden-dim", type=int, default=48, help="Hidden layer size in the classical head.")
    parser.add_argument("--learning-rate", type=float, default=0.02, help="Optimizer learning rate.")
    parser.add_argument("--max-samples", type=int, default=2000, help="Max samples to use for training/testing (0 means full dataset).")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument(
        "--batch-log-interval",
        type=int,
        default=4,
        help="Print batch loss every N batches. Use 0 to disable batch logs.",
    )

    parser.add_argument(
        "--model-path",
        type=str,
        default=str(DEFAULT_MODEL_PATH),
        help="Path to save/load trained model.",
    )
    parser.add_argument(
        "--history-plot",
        type=str,
        default=str(DEFAULT_HISTORY_PLOT),
        help="Path to save training history plot.",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    model_path = Path(args.model_path)

    model_data = None

    if args.mode in {"train", "train-and-draw"}:
        model_data = train_model(args)

    if args.mode in {"draw", "train-and-draw"}:
        if model_data is None:
            if not model_path.exists():
                print(f"Model file not found at {model_path}")
                print("Run with --mode train first.")
                return 1
            model_data = load_model(model_path)

        print("Launching drawing app...")
        app = DigitDrawApp(model_data)
        app.run()

    return 0


if __name__ == "__main__":
    sys.exit(main())
