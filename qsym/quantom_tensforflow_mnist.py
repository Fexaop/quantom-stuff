from __future__ import annotations

import argparse
import math
import pickle
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import matplotlib.pyplot as plt
import numpy as np
import tkinter as tk

try:
    import cirq
    import tensorflow as tf
    from sklearn.decomposition import PCA
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import MinMaxScaler
except ImportError as exc:
    print(f"Missing dependency: {exc}")
    print("Install required packages with:")
    print("  pip install tensorflow[and-cuda] cirq scikit-learn matplotlib")
    sys.exit(1)


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "cirq_tensorflow_mnist_0_9_model.keras"
DEFAULT_ARTIFACT_PATH = Path(__file__).resolve().parent / "cirq_tensorflow_mnist_0_9_artifacts.pkl"
DEFAULT_HISTORY_PLOT = Path(__file__).resolve().parent / "cirq_tensorflow_mnist_0_9_history.png"


@dataclass
class DatasetBundle:
    x_train: np.ndarray
    x_valid: np.ndarray
    x_test: np.ndarray
    y_train: np.ndarray
    y_valid: np.ndarray
    y_test: np.ndarray


class EpochLogger(tf.keras.callbacks.Callback):
    def __init__(self, total_epochs: int):
        super().__init__()
        self.total_epochs = total_epochs

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        loss = float(logs.get("loss", 0.0))
        acc = float(logs.get("accuracy", 0.0))
        val_loss = float(logs.get("val_loss", 0.0))
        val_acc = float(logs.get("val_accuracy", 0.0))
        print(
            f"[Epoch {epoch + 1:02d}/{self.total_epochs:02d}] "
            f"loss: {loss:.4f} | acc: {acc * 100:5.2f}% | "
            f"val_loss: {val_loss:.4f} | val_acc: {val_acc * 100:5.2f}%"
        )


def configure_tensorflow_gpu(gpu_index: int = 0, require_gpu: bool = False) -> str:
    """Configure TensorFlow to use a CUDA GPU when available."""
    print(f"TensorFlow version: {tf.__version__}")
    print(f"TensorFlow built with CUDA: {tf.test.is_built_with_cuda()}")

    gpus = tf.config.list_physical_devices("GPU")
    if not gpus:
        if require_gpu:
            raise RuntimeError(
                "No CUDA GPU detected by TensorFlow and --require-gpu was set."
            )
        print("No CUDA GPU detected by TensorFlow. Falling back to CPU.")
        return "/CPU:0"

    if gpu_index < 0 or gpu_index >= len(gpus):
        raise ValueError(
            f"Invalid --gpu-index {gpu_index}. TensorFlow found {len(gpus)} GPU(s)."
        )

    selected_gpu = gpus[gpu_index]
    try:
        tf.config.set_visible_devices(selected_gpu, "GPU")
        tf.config.experimental.set_memory_growth(selected_gpu, True)
    except RuntimeError as exc:
        raise RuntimeError(
            "TensorFlow runtime already initialized before GPU configuration. "
            "Restart and run again."
        ) from exc

    logical_gpus = tf.config.list_logical_devices("GPU")
    print(f"Using CUDA GPU index {gpu_index}: {selected_gpu.name}")
    print(f"Logical GPUs visible to TensorFlow: {len(logical_gpus)}")
    return "/GPU:0"


def load_mnist_0_9(max_samples: int, valid_size: float, seed: int) -> DatasetBundle:
    """Load MNIST with all labels 0..9 and create train/valid/test splits."""
    (x_train_full, y_train_full), (x_test, y_test) = tf.keras.datasets.mnist.load_data()

    x_train_full = x_train_full.astype(np.float32) / 255.0
    x_test = x_test.astype(np.float32) / 255.0

    if max_samples > 0 and max_samples < len(x_train_full):
        x_train_full, _, y_train_full, _ = train_test_split(
            x_train_full,
            y_train_full,
            train_size=max_samples,
            stratify=y_train_full,
            random_state=seed,
        )
        print(f"Using a stratified train subset with {len(x_train_full)} samples.")
    else:
        print(f"Using full train set with {len(x_train_full)} samples.")

    x_train, x_valid, y_train, y_valid = train_test_split(
        x_train_full,
        y_train_full,
        test_size=valid_size,
        stratify=y_train_full,
        random_state=seed,
    )

    x_train = x_train[..., np.newaxis].astype(np.float32)
    x_valid = x_valid[..., np.newaxis].astype(np.float32)
    x_test = x_test[..., np.newaxis].astype(np.float32)

    return DatasetBundle(
        x_train=x_train,
        x_valid=x_valid,
        x_test=x_test,
        y_train=y_train.astype(np.int64),
        y_valid=y_valid.astype(np.int64),
        y_test=y_test.astype(np.int64),
    )


def preprocess_for_cirq(
    x_train: np.ndarray,
    x_valid: np.ndarray,
    x_test: np.ndarray,
    n_qubits: int,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, PCA, MinMaxScaler]:
    """Reduce image vectors to qubit-sized angle vectors for Cirq encoding."""
    x_train_flat = x_train.reshape(len(x_train), -1)
    x_valid_flat = x_valid.reshape(len(x_valid), -1)
    x_test_flat = x_test.reshape(len(x_test), -1)

    n_features = x_train_flat.shape[1]
    n_qubits = max(2, min(n_qubits, n_features))

    pca = PCA(n_components=n_qubits, random_state=0)
    x_train_pca = pca.fit_transform(x_train_flat)
    x_valid_pca = pca.transform(x_valid_flat)
    x_test_pca = pca.transform(x_test_flat)

    scaler = MinMaxScaler(feature_range=(-np.pi, np.pi))
    x_train_angles = scaler.fit_transform(x_train_pca).astype(np.float32)
    x_valid_angles = scaler.transform(x_valid_pca).astype(np.float32)
    x_test_angles = scaler.transform(x_test_pca).astype(np.float32)

    # Binary bits for X-gate encoding.
    x_train_bin = (x_train_angles > 0.0).astype(np.float32)
    x_valid_bin = (x_valid_angles > 0.0).astype(np.float32)
    x_test_bin = (x_test_angles > 0.0).astype(np.float32)

    return (
        x_train_angles,
        x_valid_angles,
        x_test_angles,
        x_train_bin,
        x_valid_bin,
        x_test_bin,
        pca,
        scaler,
    )


class CirqFeatureExtractor:

    def __init__(self, n_qubits: int, n_layers: int):
        self.n_qubits = n_qubits
        self.n_layers = n_layers
        self.qubits = cirq.LineQubit.range(n_qubits)
        self.simulator = cirq.Simulator()

        z_terms = [cirq.Z(q) for q in self.qubits]
        zz_terms = []
        for i in range(n_qubits):
            j = (i + 1) % n_qubits
            zz_terms.append(cirq.Z(self.qubits[i]) * cirq.Z(self.qubits[j]))
        self.observables = z_terms + zz_terms

    def _build_circuit(self, angle_vals: np.ndarray, bit_vals: np.ndarray) -> cirq.Circuit:
        c = cirq.Circuit()
        for i, bit in enumerate(bit_vals):
            if bit > 0.5:
                c.append(cirq.X(self.qubits[i]))
        for _ in range(self.n_layers):
            for i, q in enumerate(self.qubits):
                c.append(cirq.ry(float(angle_vals[i]))(q))

            for i in range(self.n_qubits - 1):
                c.append(cirq.CZ(self.qubits[i], self.qubits[i + 1]))
            c.append(cirq.CZ(self.qubits[-1], self.qubits[0]))

        return c

    def transform_one(self, angle_vals: np.ndarray, bit_vals: np.ndarray) -> np.ndarray:
        c = self._build_circuit(angle_vals, bit_vals)
        vals = self.simulator.simulate_expectation_values(c, observables=self.observables)
        return np.asarray([float(np.real(v)) for v in vals], dtype=np.float32)

    def transform(self, x_angles: np.ndarray, x_bits: np.ndarray, label: str = "Cirq") -> np.ndarray:
        out = np.zeros((len(x_angles), len(self.observables)), dtype=np.float32)
        if len(x_angles) == 0:
            return out

        log_every = max(1, len(x_angles) // 10)
        for idx, (angles, bits) in enumerate(zip(x_angles, x_bits)):
            out[idx] = self.transform_one(angles, bits)
            if (idx + 1) % log_every == 0 or (idx + 1) == len(x_angles):
                print(f"{label}: encoded {idx + 1}/{len(x_angles)}")

        return out


def build_hybrid_model(image_shape: Tuple[int, int, int], cirq_dim: int, learning_rate: float) -> tf.keras.Model:
    image_input = tf.keras.layers.Input(shape=image_shape, name="image")
    x = tf.keras.layers.Conv2D(32, (3, 3), activation="relu")(image_input)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)
    x = tf.keras.layers.Conv2D(64, (3, 3), activation="relu")(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)
    x = tf.keras.layers.Conv2D(128, (3, 3), activation="relu")(x)
    x = tf.keras.layers.Flatten()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    x = tf.keras.layers.Dense(128, activation="relu")(x)

    cirq_input = tf.keras.layers.Input(shape=(cirq_dim,), name="cirq_features")
    q = tf.keras.layers.BatchNormalization()(cirq_input)
    q = tf.keras.layers.Dense(64, activation="relu")(q)
    q = tf.keras.layers.Dropout(0.15)(q)

    fused = tf.keras.layers.Concatenate()([x, q])
    fused = tf.keras.layers.Dense(128, activation="relu")(fused)
    fused = tf.keras.layers.Dropout(0.25)(fused)
    output = tf.keras.layers.Dense(10, activation="softmax")(fused)

    model = tf.keras.Model(inputs=[image_input, cirq_input], outputs=output)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=["accuracy"],
    )
    return model


def save_history_plot(history: tf.keras.callbacks.History, plot_path: Path) -> None:
    hist = history.history
    if not hist:
        return

    epochs = list(range(1, len(hist.get("loss", [])) + 1))
    train_loss = hist.get("loss", [])
    val_loss = hist.get("val_loss", [])
    train_acc = hist.get("accuracy", [])
    val_acc = hist.get("val_accuracy", [])

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    axes[0].plot(epochs, train_loss, marker="o", label="Train")
    axes[0].plot(epochs, val_loss, marker="o", label="Valid")
    axes[0].set_title("Loss by Epoch")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].grid(alpha=0.3)
    axes[0].legend()

    axes[1].plot(epochs, train_acc, marker="o", label="Train")
    axes[1].plot(epochs, val_acc, marker="o", label="Valid")
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
    print("TensorFlow + Cirq MNIST (0-9) Training")

    tf.keras.utils.set_random_seed(args.seed)
    np.random.seed(args.seed)

    dataset = load_mnist_0_9(
        max_samples=args.max_samples,
        valid_size=args.valid_size,
        seed=args.seed,
    )

    (
        x_train_angles,
        x_valid_angles,
        x_test_angles,
        x_train_bits,
        x_valid_bits,
        x_test_bits,
        pca,
        scaler,
    ) = preprocess_for_cirq(
        dataset.x_train,
        dataset.x_valid,
        dataset.x_test,
        n_qubits=args.n_qubits,
    )

    n_qubits_actual = x_train_angles.shape[1]
    print(f"Train samples: {len(dataset.x_train)}")
    print(f"Valid samples: {len(dataset.x_valid)}")
    print(f"Test samples:  {len(dataset.x_test)}")
    print(f"Qubits: {n_qubits_actual} | Cirq layers: {args.cirq_layers}")
    print(f"Target accuracy: {args.target_accuracy * 100:.2f}%")
    print("-" * 80)

    extractor = CirqFeatureExtractor(n_qubits=n_qubits_actual, n_layers=args.cirq_layers)
    x_train_cirq = extractor.transform(x_train_angles, x_train_bits, label="Train features")
    x_valid_cirq = extractor.transform(x_valid_angles, x_valid_bits, label="Valid features")
    x_test_cirq = extractor.transform(x_test_angles, x_test_bits, label="Test features")

    with tf.device(args.tf_device):
        model = build_hybrid_model(
            image_shape=(28, 28, 1),
            cirq_dim=x_train_cirq.shape[1],
            learning_rate=args.learning_rate,
        )

        callbacks = [
            EpochLogger(args.epochs),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_accuracy",
                mode="max",
                factor=0.5,
                patience=2,
                min_lr=1e-6,
                verbose=1,
            ),
        ]

        print("-" * 80)
        print(f"Starting TensorFlow training on device {args.tf_device}. Showing all epochs:")
        history = model.fit(
            x={"image": dataset.x_train, "cirq_features": x_train_cirq},
            y=dataset.y_train,
            validation_data=({"image": dataset.x_valid, "cirq_features": x_valid_cirq}, dataset.y_valid),
            epochs=args.epochs,
            batch_size=args.batch_size,
            verbose=0,
            callbacks=callbacks,
        )

        test_loss, test_acc = model.evaluate(
            x={"image": dataset.x_test, "cirq_features": x_test_cirq},
            y=dataset.y_test,
            verbose=0,
        )

    print("-" * 80)
    print(f"Final test loss: {test_loss:.4f}")
    print(f"Final test accuracy: {test_acc * 100:5.2f}%")

    model_path = Path(args.model_path)
    artifact_path = Path(args.artifact_path)
    history_plot_path = Path(args.history_plot)

    model.save(model_path)

    artifacts = {
        "pca": pca,
        "scaler": scaler,
        "n_qubits": n_qubits_actual,
        "cirq_layers": args.cirq_layers,
        "history": history.history,
        "target_accuracy": args.target_accuracy,
        "seed": args.seed,
    }
    with artifact_path.open("wb") as handle:
        pickle.dump(artifacts, handle)

    save_history_plot(history, history_plot_path)

    print(f"Model saved to: {model_path}")
    print(f"Artifacts saved to: {artifact_path}")
    print(f"History plot saved to: {history_plot_path}")

    if test_acc < args.target_accuracy:
        print(
            f"Warning: target accuracy {args.target_accuracy * 100:.2f}% not reached. "
            f"Current test accuracy: {test_acc * 100:.2f}%"
        )
        if args.strict_target:
            print("Exiting with non-zero code because --strict-target is enabled.")
            return {"model": model, "artifacts": artifacts, "test_acc": test_acc, "target_failed": True}

    return {"model": model, "artifacts": artifacts, "test_acc": test_acc, "target_failed": False}


def load_artifacts(artifact_path: Path) -> Dict:
    with artifact_path.open("rb") as handle:
        artifacts = pickle.load(handle)

    required = {"pca", "scaler", "n_qubits", "cirq_layers"}
    missing = sorted(required.difference(artifacts.keys()))
    if missing:
        missing_text = ", ".join(missing)
        raise ValueError(
            "Artifact file is missing required keys: "
            f"{missing_text}. Retrain using --mode train."
        )
    return artifacts


class DigitDrawApp:
    def __init__(self, model: tf.keras.Model, artifacts: Dict, tf_device: str):
        self.model = model
        self.tf_device = tf_device

        self.pca: PCA = artifacts["pca"]
        self.scaler: MinMaxScaler = artifacts["scaler"]
        self.n_qubits = int(artifacts["n_qubits"])
        self.cirq_layers = int(artifacts["cirq_layers"])
        self.extractor = CirqFeatureExtractor(self.n_qubits, self.cirq_layers)

        self.grid_size = 28
        self.pixel_scale = 14
        self.brush_radius = 2
        self.pixels = np.zeros((self.grid_size, self.grid_size), dtype=np.float32)

        self.root = tk.Tk()
        self.root.title("TensorFlow + Cirq MNIST 0-9 Predictor")

        self.prediction_text = tk.StringVar(value="Draw a digit (0-9) and press Predict")
        self.probability_text = tk.StringVar(value="")

        self._build_ui()

    def _build_ui(self) -> None:
        frame = tk.Frame(self.root, padx=10, pady=10)
        frame.pack(fill=tk.BOTH, expand=True)

        canvas_size = self.grid_size * self.pixel_scale
        self.canvas = tk.Canvas(
            frame,
            width=canvas_size,
            height=canvas_size,
            bg="black",
            highlightthickness=1,
            highlightbackground="#555555",
        )
        self.canvas.grid(row=0, column=0, columnspan=3, pady=(0, 10))

        self.canvas.bind("<Button-1>", self._paint)
        self.canvas.bind("<B1-Motion>", self._paint)

        tk.Button(frame, text="Predict", width=16, command=self.predict).grid(row=1, column=0, padx=4, pady=4)
        tk.Button(frame, text="Clear", width=16, command=self.clear).grid(row=1, column=1, padx=4, pady=4)
        tk.Button(frame, text="Quit", width=16, command=self.root.destroy).grid(row=1, column=2, padx=4, pady=4)

        tk.Label(
            frame,
            textvariable=self.prediction_text,
            font=("Helvetica", 15, "bold"),
            anchor="w",
            justify=tk.LEFT,
        ).grid(row=2, column=0, columnspan=3, sticky="w")

        tk.Label(
            frame,
            textvariable=self.probability_text,
            font=("Helvetica", 11),
            anchor="w",
            justify=tk.LEFT,
        ).grid(row=3, column=0, columnspan=3, sticky="w")

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
        self.prediction_text.set("Draw a digit (0-9) and press Predict")
        self.probability_text.set("")

    def _prepare_model_inputs(self) -> Tuple[np.ndarray, np.ndarray]:
        image_input = self.pixels.astype(np.float32)[np.newaxis, ..., np.newaxis]

        flat = image_input.reshape(1, -1)
        angles = self.scaler.transform(self.pca.transform(flat)).astype(np.float32)
        bits = (angles > 0.0).astype(np.float32)
        cirq_features = self.extractor.transform_one(angles[0], bits[0]).reshape(1, -1).astype(np.float32)

        return image_input, cirq_features

    def predict(self) -> None:
        if np.max(self.pixels) <= 1e-6:
            self.prediction_text.set("Canvas is empty. Draw a digit first.")
            self.probability_text.set("")
            return

        image_input, cirq_features = self._prepare_model_inputs()

        with tf.device(self.tf_device):
            probs = self.model.predict(
                x={"image": image_input, "cirq_features": cirq_features},
                verbose=0,
            )[0]

        pred = int(np.argmax(probs))
        top3 = np.argsort(probs)[-3:][::-1]
        top3_text = " | ".join([f"{digit}: {probs[digit] * 100:5.2f}%" for digit in top3])

        self.prediction_text.set(f"Predicted digit: {pred}")
        self.probability_text.set(f"Top probabilities -> {top3_text}")

    def run(self) -> None:
        self.root.mainloop()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train and run a TensorFlow + Cirq MNIST 0-9 classifier with draw GUI."
    )

    parser.add_argument(
        "--mode",
        choices=["train", "draw", "train-and-draw"],
        default="train-and-draw",
        help="train: train and save | draw: load and predict | train-and-draw: do both",
    )

    parser.add_argument("--epochs", type=int, default=20, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=128, help="Mini-batch size.")
    parser.add_argument("--learning-rate", type=float, default=0.001, help="Learning rate.")

    parser.add_argument("--n-qubits", type=int, default=10, help="Number of qubits for Cirq feature branch.")
    parser.add_argument("--cirq-layers", type=int, default=4, help="Number of Cirq encoding layers.")

    parser.add_argument(
        "--max-samples",
        type=int,
        default=20000,
        help="Maximum number of train samples to use from MNIST train split (0 means full 60000).",
    )
    parser.add_argument("--valid-size", type=float, default=0.15, help="Validation split ratio from train split.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")

    parser.add_argument("--target-accuracy", type=float, default=0.90, help="Desired minimum test accuracy.")
    parser.add_argument(
        "--strict-target",
        action="store_true",
        help="Exit with non-zero code if test accuracy is below --target-accuracy.",
    )

    parser.add_argument("--gpu-index", type=int, default=0, help="CUDA GPU index to use.")
    parser.add_argument(
        "--require-gpu",
        action="store_true",
        help="Exit with error if TensorFlow cannot detect a CUDA GPU.",
    )

    parser.add_argument("--model-path", type=str, default=str(DEFAULT_MODEL_PATH), help="Saved TensorFlow model path.")
    parser.add_argument("--artifact-path", type=str, default=str(DEFAULT_ARTIFACT_PATH), help="Saved preprocessing artifact path.")
    parser.add_argument("--history-plot", type=str, default=str(DEFAULT_HISTORY_PLOT), help="Saved training plot path.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        args.tf_device = configure_tensorflow_gpu(
            gpu_index=args.gpu_index,
            require_gpu=args.require_gpu,
        )
    except (ValueError, RuntimeError) as exc:
        print(f"GPU configuration error: {exc}")
        return 1

    model = None
    artifacts = None

    if args.mode in {"train", "train-and-draw"}:
        output = train_model(args)
        model = output["model"]
        artifacts = output["artifacts"]

        if output.get("target_failed", False):
            return 1

    if args.mode in {"draw", "train-and-draw"}:
        model_path = Path(args.model_path)
        artifact_path = Path(args.artifact_path)

        if model is None or artifacts is None:
            if not model_path.exists() or not artifact_path.exists():
                print("Saved model or artifacts not found.")
                print("Run with --mode train first.")
                return 1

            with tf.device(args.tf_device):
                model = tf.keras.models.load_model(model_path)
            artifacts = load_artifacts(artifact_path)

        print("Launching drawing app...")
        app = DigitDrawApp(model=model, artifacts=artifacts, tf_device=args.tf_device)
        app.run()

    return 0


if __name__ == "__main__":
    sys.exit(main())
