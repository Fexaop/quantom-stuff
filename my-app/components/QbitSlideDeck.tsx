"use client";

import { useMemo, useState } from "react";

type ShapeKind = "circle" | "square" | "diamond" | "hex" | "pill";

type GateCategory = "Pauli" | "Superposition" | "Phase" | "Rotation" | "Generalized";

type Gate = {
  gate: string;
  symbol: string;
  description: string;
  meaning: string;
  layerRole: string;
  category: GateCategory;
  shape: ShapeKind;
};

const GATES: Gate[] = [
  {
    gate: "X",
    symbol: "cirq.X",
    description: "Pauli-X bit flip",
    meaning: "Swaps amplitudes of |0> and |1>, similar to a NOT in the computational basis.",
    layerRole: "Useful for basis toggling and preparing control patterns before entangling.",
    category: "Pauli",
    shape: "square",
  },
  {
    gate: "Y",
    symbol: "cirq.Y",
    description: "Pauli-Y phase-aware flip",
    meaning: "Rotates by pi around Y, mixing amplitude with an imaginary phase component.",
    layerRole: "Introduces richer phase structure than X alone in variational blocks.",
    category: "Pauli",
    shape: "square",
  },
  {
    gate: "Z",
    symbol: "cirq.Z",
    description: "Pauli-Z phase flip",
    meaning: "Keeps |0> unchanged and flips phase of |1>, changing interference behavior.",
    layerRole: "Critical for phase conditioning before measurement and readout.",
    category: "Pauli",
    shape: "square",
  },
  {
    gate: "H",
    symbol: "cirq.H",
    description: "Hadamard superposition",
    meaning: "Maps basis states into equal superpositions so both paths can interfere.",
    layerRole: "Typically first step of a quantum layer to unlock quantum parallelism.",
    category: "Superposition",
    shape: "diamond",
  },
  {
    gate: "S",
    symbol: "cirq.S",
    description: "Phase gate (sqrt(Z))",
    meaning: "Applies a quarter-turn phase to |1> while leaving |0> untouched.",
    layerRole: "Fine phase offset to shape constructive/destructive interference.",
    category: "Phase",
    shape: "hex",
  },
  {
    gate: "T",
    symbol: "cirq.T",
    description: "pi/8 gate (sqrt(S))",
    meaning: "Adds a smaller phase step than S, enabling precise phase tuning.",
    layerRole: "Useful in deeper circuits where subtle phase control matters.",
    category: "Phase",
    shape: "hex",
  },
  {
    gate: "RX(theta)",
    symbol: "cirq.rx(theta)",
    description: "X-axis rotation",
    meaning: "Continuously rotates state vector around X by learnable angle theta.",
    layerRole: "Parameterized gate that behaves like a trainable weight.",
    category: "Rotation",
    shape: "pill",
  },
  {
    gate: "RY(theta)",
    symbol: "cirq.ry(theta)",
    description: "Y-axis rotation",
    meaning: "Adjusts probability amplitudes directly with a smooth learnable rotation.",
    layerRole: "Common encoder gate when mapping normalized features to qubits.",
    category: "Rotation",
    shape: "pill",
  },
  {
    gate: "RZ(theta)",
    symbol: "cirq.rz(theta)",
    description: "Z-axis rotation",
    meaning: "Applies learnable phase rotation without changing basis probabilities.",
    layerRole: "Helps optimize phase relationships before entanglement and readout.",
    category: "Rotation",
    shape: "pill",
  },
  {
    gate: "PhasedX",
    symbol: "cirq.PhasedXGate",
    description: "Phase-shifted X rotation",
    meaning: "Generalized X rotation where axis itself is phase-shifted in the XY plane.",
    layerRole: "Compact way to model richer rotations with fewer separate gates.",
    category: "Generalized",
    shape: "diamond",
  },
];

const SLIDE_ACCENTS = [
  {
    active: "border-cosmic-300/80 bg-cosmic-500/38 text-white",
    inactive: "border-cosmic-700/55 bg-black/35 text-white/75 hover:border-cosmic-400/70",
  },
  {
    active: "border-nebula-300/80 bg-nebula-500/38 text-white",
    inactive: "border-nebula-700/55 bg-black/35 text-white/75 hover:border-nebula-400/70",
  },
  {
    active: "border-starlight-300/80 bg-starlight-500/38 text-white",
    inactive: "border-starlight-700/55 bg-black/35 text-white/75 hover:border-starlight-400/70",
  },
  {
    active: "border-solar-300/80 bg-solar-500/35 text-solar-50",
    inactive: "border-solar-700/55 bg-black/35 text-white/75 hover:border-solar-400/70",
  },
] as const;

const SLIDE_CANVAS_ACCENTS = [
  "bg-cosmic-950/52",
  "bg-nebula-950/50",
  "bg-starlight-950/50",
  "bg-solar-950/40",
] as const;

const OBJECT_TILES: Array<{ title: string; shape: ShapeKind; tone: string; detail: string }> = [
  {
    title: "Input Node",
    shape: "circle",
    tone: "border-cosmic-300/70 bg-cosmic-700/30",
    detail: "Pixel or PCA feature",
  },
  {
    title: "Gate Unit",
    shape: "square",
    tone: "border-nebula-300/70 bg-nebula-700/30",
    detail: "X/Y/Z or phase op",
  },
  {
    title: "Rotation",
    shape: "pill",
    tone: "border-starlight-300/70 bg-starlight-700/30",
    detail: "RX(theta) RY(theta) RZ(theta)",
  },
  {
    title: "Entangle",
    shape: "diamond",
    tone: "border-solar-300/70 bg-solar-700/30",
    detail: "CZ links between wires",
  },
];

function gateCategoryClasses(category: GateCategory): string {
  if (category === "Pauli") {
    return "border-cosmic-300/70 bg-cosmic-500/30 text-cosmic-50";
  }
  if (category === "Superposition") {
    return "border-starlight-300/70 bg-starlight-500/30 text-starlight-50";
  }
  if (category === "Phase") {
    return "border-nebula-300/70 bg-nebula-500/30 text-nebula-50";
  }
  if (category === "Rotation") {
    return "border-aurora-300/70 bg-aurora-500/30 text-aurora-50";
  }
  return "border-solar-300/70 bg-solar-500/30 text-solar-50";
}

const CLASSICAL_LOSS = [1.8, 1.52, 1.28, 1.07, 0.92, 0.82, 0.74, 0.68, 0.63, 0.59];
const HYBRID_LOSS = [1.8, 1.46, 1.18, 0.96, 0.8, 0.68, 0.58, 0.5, 0.45, 0.41];
const CLASSICAL_ACC = [58, 66, 73, 79, 83, 86, 88, 90, 91, 92];
const HYBRID_ACC = [58, 69, 77, 83, 87, 90, 92, 94, 95, 96];

const COIN_TOSS_MIN = 100;
const COIN_TOSS_MAX = 10000;

const MNIST_PIPELINE_STEPS = [
  {
    name: "Step 1: Setup + device check",
    functions: "parse_args(), configure_tensorflow_gpu()",
    baby: "First we choose the knobs, then we ask TensorFlow: do we have a GPU or should we use CPU?",
    io: "CLI flags -> tf_device string (/GPU:0 or /CPU:0)",
  },
  {
    name: "Step 2: Load and split MNIST",
    functions: "load_mnist_0_9()",
    baby: "We open the digit pictures, normalize pixels to 0..1, then split into train/valid/test groups.",
    io: "Raw MNIST -> DatasetBundle with x/y train, valid, test",
  },
  {
    name: "Step 3: Make qubit-friendly features",
    functions: "preprocess_for_cirq()",
    baby: "We flatten images, compress with PCA, scale values into -pi..pi angles, and also make sign bits.",
    io: "Image tensors -> angle vectors + binary vectors + PCA/scaler",
  },
  {
    name: "Step 4: Run Cirq feature extractor",
    functions: "CirqFeatureExtractor.transform()",
    baby: "For each sample: optional X gates from bits, repeated RY rotations, CZ ring links, then expectation readout.",
    io: "Angles/bits -> dense quantum feature vector",
  },
  {
    name: "Step 5: Build two-branch model",
    functions: "build_hybrid_model()",
    baby: "One branch learns from pixels (CNN), one branch learns from quantum features, then both are merged.",
    io: "image + cirq_features -> softmax probabilities for digits 0..9",
  },
  {
    name: "Step 6: Train, validate, test",
    functions: "train_model(), EpochLogger",
    baby: "We fit epoch by epoch, print metrics, adjust learning rate when needed, then evaluate on test data.",
    io: "Train/valid/test tensors -> trained model + history + test accuracy",
  },
  {
    name: "Step 7: Save + interactive drawing",
    functions: "model.save(), load_artifacts(), DigitDrawApp",
    baby: "We save model/tools, then a canvas app lets you draw a digit and run the same hybrid prediction path.",
    io: "Saved files + drawn digit -> predicted class + top probabilities",
  },
] as const;

const SCRIPT_DEFAULTS = {
  maxSamples: 20000,
  qubits: 10,
  cirqLayers: 4,
  epochs: 20,
  batchSize: 128,
  targetAccuracy: 90,
} as const;

const OLED_BABY_STEPS = [
  "Open image path and convert pixels to RGB array.",
  "Pick a movable 10x10 window with get_grid_samples().",
  "Turn each pixel into 3 qubits using create_qubit_circuit(r,g,b).",
  "Compute statevector and binary label for all 100 pixels.",
  "Use PixelInteractor to drag window, click pixels, and refresh Bloch/info panels.",
  "Save matrix_states to qubit_matrix.npy for later analysis.",
] as const;

const COIN_BABY_STEPS = [
  "hadamard_gate() creates equal amplitudes for |0> and |1>.",
  "measure_qubit() squares amplitudes into probabilities.",
  "toss_coin() repeats measurement num_tosses times.",
  "get_statistics() counts heads/tails and percentages.",
  "plot_results() draws bar + pie distribution charts.",
  "plot_cumulative() shows running probability approaching 50/50.",
  "main() runs 100, 1024, 10000 tosses and saves PNG reports.",
] as const;

const SLIDES = [
  {
    id: "classical",
    title: "Normal 4-Layer Transform Network",
    subtitle: "Start from f = w1*x1 + w2*x2 + ... + b and stack layers for MNIST.",
  },
  {
    id: "gates",
    title: "Single-Qubit Gate Vocabulary",
    subtitle: "Use distinct gate types to rotate and phase each qubit state.",
  },
  {
    id: "quantum-layer",
    title: "Build a Simple Qubit Layer",
    subtitle: "Encode inputs and apply RY/RZ plus CZ entanglement across qubits.",
  },
  {
    id: "hybrid",
    title: "Hybrid Quantum + Classical Training Graphs",
    subtitle: "Track how quantum features improve optimization and accuracy.",
  },
  {
    id: "tf-cirq-script",
    title: "qsym/quantom_tensforflow_mnist.py",
    subtitle: "Baby-step pipeline: data load, quantum encoding, hybrid training, save, and draw-and-predict.",
  },
  {
    id: "oled-script",
    title: "oled.py: Pixel-to-Qubit Analyzer",
    subtitle: "Detailed walkthrough of the 10x10 RGB-to-qubit pipeline and interactive visual analyzer.",
  },
  {
    id: "coin-toss-script",
    title: "qsym/quantum_coin_toss.py",
    subtitle: "Function-by-function breakdown of Hadamard, repeated measurement, stats, and plots.",
  },
] as const;

function pointsForHex(x: number, y: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    return `${px},${py}`;
  }).join(" ");
}

function ShapeNode({
  x,
  y,
  shape,
  size,
  label,
  fill,
}: {
  x: number;
  y: number;
  shape: ShapeKind;
  size: number;
  label: string;
  fill: string;
}) {
  const stroke = "rgba(232, 220, 255, 0.95)";

  return (
    <g>
      {shape === "circle" && <circle cx={x} cy={y} r={size} fill={fill} stroke={stroke} strokeWidth={1.2} />}

      {shape === "square" && (
        <rect
          x={x - size}
          y={y - size}
          width={size * 2}
          height={size * 2}
          rx={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
        />
      )}

      {shape === "pill" && (
        <rect
          x={x - size * 1.35}
          y={y - size * 0.72}
          width={size * 2.7}
          height={size * 1.45}
          rx={size * 0.7}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
        />
      )}

      {shape === "diamond" && (
        <polygon
          points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
        />
      )}

      {shape === "hex" && <polygon points={pointsForHex(x, y, size)} fill={fill} stroke={stroke} strokeWidth={1.2} />}

      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fill="rgba(250, 246, 255, 0.95)"
        fontSize={10}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function ClassicalDiagram() {
  const layerX = [90, 220, 350, 480, 620];
  const layers = [
    { name: "Input", nodes: 6, shape: "circle" as const, fill: "rgba(36, 203, 255, 0.38)" },
    { name: "Dense 1", nodes: 5, shape: "square" as const, fill: "rgba(163, 88, 255, 0.38)" },
    { name: "Dense 2", nodes: 4, shape: "diamond" as const, fill: "rgba(246, 32, 176, 0.4)" },
    { name: "Dense 3", nodes: 4, shape: "hex" as const, fill: "rgba(40, 223, 157, 0.35)" },
    { name: "Softmax", nodes: 5, shape: "pill" as const, fill: "rgba(248, 155, 8, 0.42)" },
  ];

  const nodeY = (count: number, idx: number) => {
    if (count === 1) {
      return 190;
    }
    return 70 + (idx * 250) / (count - 1);
  };

  return (
    <svg
      viewBox="0 0 720 380"
      role="img"
      aria-label="Classical four-layer network diagram"
      className="h-auto min-w-175 w-full"
    >
      <text x={28} y={26} fill="rgba(246, 240, 255, 0.95)" fontSize={14} fontWeight={600}>
        f = w1*x1 + w2*x2 + ... + wn*xn + b
      </text>

      {layers.slice(0, -1).map((layer, layerIdx) => {
        const next = layers[layerIdx + 1];

        return Array.from({ length: layer.nodes }).map((_, i) => {
          return Array.from({ length: next.nodes }).map((__, j) => {
            const x1 = layerX[layerIdx];
            const y1 = nodeY(layer.nodes, i);
            const x2 = layerX[layerIdx + 1];
            const y2 = nodeY(next.nodes, j);

            return (
              <line
                key={`edge-${layerIdx}-${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(182, 227, 255, 0.26)"
                strokeWidth={1}
              />
            );
          });
        });
      })}

      {layers.map((layer, layerIdx) => {
        return Array.from({ length: layer.nodes }).map((_, i) => {
          const x = layerX[layerIdx];
          const y = nodeY(layer.nodes, i);

          return (
            <ShapeNode
              key={`node-${layerIdx}-${i}`}
              x={x}
              y={y}
              shape={layer.shape}
              size={10}
              label={layerIdx === 0 ? `x${i + 1}` : layerIdx === layers.length - 1 ? `${i}` : "f"}
              fill={layer.fill}
            />
          );
        });
      })}

      {layers.map((layer, idx) => (
        <text
          key={`label-${layer.name}`}
          x={layerX[idx] - 28}
          y={350}
          fill="rgba(241, 233, 255, 0.88)"
          fontSize={11}
        >
          {layer.name}
        </text>
      ))}
    </svg>
  );
}

function GateDiagram() {
  const wires = [90, 190, 290];
  const columns = [130, 250, 370, 490, 610];
  const entangleColumns = [312, 552];
  const wireNames = ["q0", "q1", "q2"];
  const gatesPerWire = [
    ["H", "RY", "RZ", "S", "M"],
    ["X", "RX", "PhX", "T", "M"],
    ["Y", "RZ", "H", "Z", "M"],
  ];

  const gateShape = (token: string): ShapeKind => {
    if (token === "H" || token === "PhX") {
      return "diamond";
    }
    if (token === "S" || token === "T") {
      return "hex";
    }
    if (token === "RX" || token === "RY" || token === "RZ") {
      return "pill";
    }
    if (token === "M") {
      return "circle";
    }
    return "square";
  };

  const gateFill = (token: string): string => {
    if (token === "M") {
      return "rgba(241, 246, 255, 0.35)";
    }
    if (token === "RX" || token === "RY" || token === "RZ") {
      return "rgba(36, 203, 255, 0.44)";
    }
    if (token === "S" || token === "T") {
      return "rgba(246, 32, 176, 0.42)";
    }
    if (token === "H" || token === "PhX") {
      return "rgba(163, 88, 255, 0.42)";
    }
    return "rgba(248, 155, 8, 0.42)";
  };

  return (
    <svg
      viewBox="0 0 720 380"
      role="img"
      aria-label="Single-qubit gate palette and circuit"
      className="h-auto min-w-180 w-full"
    >
      {wires.map((y, idx) => (
        <g key={`wire-${wireNames[idx]}`}>
          <line x1={60} y1={y} x2={665} y2={y} stroke="rgba(236, 226, 255, 0.32)" strokeWidth={1.6} />
          <text x={28} y={y + 4} fill="rgba(250, 246, 255, 0.88)" fontSize={12}>
            {wireNames[idx]}
          </text>
        </g>
      ))}

      {gatesPerWire.map((row, wireIdx) => {
        return row.map((token, gateIdx) => {
          const x = columns[gateIdx];
          const y = wires[wireIdx];

          const fill = gateFill(token);

          return (
            <ShapeNode
              key={`gate-${wireIdx}-${gateIdx}`}
              x={x}
              y={y}
              shape={gateShape(token)}
              size={14}
              label={token}
              fill={fill}
            />
          );
        });
      })}

      <line
        x1={entangleColumns[0]}
        y1={90}
        x2={entangleColumns[0]}
        y2={190}
        stroke="rgba(40, 223, 157, 0.78)"
        strokeWidth={2}
        strokeDasharray="5 5"
      />
      <line
        x1={entangleColumns[1]}
        y1={190}
        x2={entangleColumns[1]}
        y2={290}
        stroke="rgba(40, 223, 157, 0.78)"
        strokeWidth={2}
        strokeDasharray="5 5"
      />
      <circle cx={entangleColumns[0]} cy={90} r={4} fill="rgba(189, 255, 227, 0.96)" />
      <circle cx={entangleColumns[0]} cy={190} r={4} fill="rgba(189, 255, 227, 0.96)" />
      <circle cx={entangleColumns[1]} cy={190} r={4} fill="rgba(189, 255, 227, 0.96)" />
      <circle cx={entangleColumns[1]} cy={290} r={4} fill="rgba(189, 255, 227, 0.96)" />

      <text x={74} y={342} fill="rgba(235, 241, 255, 0.9)" fontSize={11}>
        Mixed shapes map gate categories: square=Pauli, diamond=superposition/phase-x, hex=phase, pill=rotations.
      </text>
    </svg>
  );
}

function QuantumLayerDiagram({ qubits, depth }: { qubits: number; depth: number }) {
  const wireY = Array.from({ length: qubits }, (_, i) => 70 + i * ((280 - 70) / Math.max(qubits - 1, 1)));
  const statsX = 566;
  const statsWidth = 132;
  const wireEndX = statsX - 24;
  const gateStartX = 150;
  const gateEndX = wireEndX - 36;
  const columns = Array.from({ length: depth }, (_, i) => gateStartX + i * ((gateEndX - gateStartX) / Math.max(depth - 1, 1)));

  return (
    <svg
      viewBox="0 0 720 380"
      role="img"
      aria-label="Parameterized qubit layer diagram"
      className="h-auto min-w-180 w-full"
    >
      {wireY.map((y, idx) => (
        <g key={`q-wire-${idx}`}>
          <line x1={60} y1={y} x2={wireEndX} y2={y} stroke="rgba(236, 226, 255, 0.34)" strokeWidth={1.4} />
          <text x={30} y={y + 4} fill="rgba(248, 244, 255, 0.9)" fontSize={11}>
            q{idx}
          </text>
        </g>
      ))}

      {columns.map((x, colIdx) => (
        <g key={`col-${x}`}>
          {wireY.map((y, wireIdx) => (
            <ShapeNode
              key={`gate-ry-${colIdx}-${wireIdx}`}
              x={x}
              y={y}
              shape="pill"
              size={11}
              label={colIdx % 2 === 0 ? "RY" : "RZ"}
              fill={colIdx % 3 === 0 ? "rgba(36, 203, 255, 0.42)" : colIdx % 3 === 1 ? "rgba(163, 88, 255, 0.42)" : "rgba(246, 32, 176, 0.42)"}
            />
          ))}

          {wireY.slice(0, -1).map((y, idx) => {
            const y2 = wireY[idx + 1];
            return (
              <g key={`cz-${colIdx}-${idx}`}>
                <line x1={x + 22} y1={y} x2={x + 22} y2={y2} stroke="rgba(40, 223, 157, 0.78)" strokeWidth={1.8} />
                <circle cx={x + 22} cy={y} r={3.6} fill="rgba(189, 255, 227, 0.96)" />
                <circle cx={x + 22} cy={y2} r={3.6} fill="rgba(189, 255, 227, 0.96)" />
              </g>
            );
          })}
        </g>
      ))}

      <rect
        x={statsX}
        y={44}
        width={statsWidth}
        height={300}
        rx={14}
        fill="rgba(7, 12, 25, 0.82)"
        stroke="rgba(99, 219, 255, 0.55)"
      />
      <text x={statsX + 16} y={70} fill="rgba(239, 249, 255, 0.95)" fontSize={11}>
        Layer Stats
      </text>
      <text x={statsX + 16} y={96} fill="rgba(255, 210, 238, 0.9)" fontSize={10}>
        Qubits: {qubits}
      </text>
      <text x={statsX + 16} y={116} fill="rgba(206, 245, 255, 0.9)" fontSize={10}>
        Depth: {depth}
      </text>
      <text x={statsX + 16} y={136} fill="rgba(255, 227, 175, 0.9)" fontSize={10}>
        Gates: {qubits * depth * 2}
      </text>
      <text x={statsX + 16} y={156} fill="rgba(189, 255, 227, 0.9)" fontSize={10}>
        CZ links: {(qubits - 1) * depth}
      </text>

      <text x={statsX + 12} y={204} fill="rgba(242, 236, 255, 0.86)" fontSize={10}>
        Encode -&gt; Rotate
      </text>
      <text x={statsX + 12} y={222} fill="rgba(242, 236, 255, 0.86)" fontSize={10}>
        -&gt; Entangle -&gt; Readout
      </text>
    </svg>
  );
}

function toPath(values: number[], width: number, height: number, min: number, max: number): string {
  const left = 46;
  const top = 24;
  const xSpan = width - left - 26;
  const ySpan = height - top - 30;

  return values
    .map((value, idx) => {
      const x = left + (xSpan * idx) / Math.max(values.length - 1, 1);
      const y = top + ((max - value) / Math.max(max - min, 0.0001)) * ySpan;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function HybridGraphDiagram({ epoch }: { epoch: number }) {
  const allLoss = CLASSICAL_LOSS.concat(HYBRID_LOSS);
  const minLoss = Math.min(...allLoss);
  const maxLoss = Math.max(...allLoss);

  const classicalPath = toPath(CLASSICAL_LOSS, 350, 260, minLoss, maxLoss);
  const hybridPath = toPath(HYBRID_LOSS, 350, 260, minLoss, maxLoss);

  const xAt = (idx: number) => 46 + (278 * idx) / Math.max(CLASSICAL_LOSS.length - 1, 1);
  const yAt = (value: number) => 24 + ((maxLoss - value) / Math.max(maxLoss - minLoss, 0.0001)) * 206;

  const idx = Math.min(Math.max(epoch, 0), CLASSICAL_LOSS.length - 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <svg viewBox="0 0 360 280" role="img" aria-label="Hybrid pipeline flow diagram" className="h-auto w-full">
        <defs>
          <marker id="arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgba(189, 255, 227, 0.85)" />
          </marker>
        </defs>

        <rect x={18} y={24} width={118} height={48} rx={12} fill="rgba(248, 155, 8, 0.35)" stroke="rgba(255, 227, 175, 0.88)" />
        <text x={77} y={52} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          MNIST Image
        </text>

        <polygon
          points="190,25 272,25 296,48 272,71 190,71 166,48"
          fill="rgba(36, 203, 255, 0.3)"
          stroke="rgba(206, 245, 255, 0.9)"
        />
        <text x={231} y={52} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          PCA + Scale
        </text>

        <rect x={20} y={112} width={126} height={48} rx={12} fill="rgba(36, 203, 255, 0.24)" stroke="rgba(206, 245, 255, 0.88)" />
        <text x={83} y={140} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Classical Branch
        </text>

        <circle cx={230} cy={136} r={30} fill="rgba(246, 32, 176, 0.28)" stroke="rgba(255, 210, 238, 0.9)" />
        <text x={230} y={140} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Q-Layer
        </text>

        <rect x={96} y={206} width={176} height={52} rx={12} fill="rgba(163, 88, 255, 0.3)" stroke="rgba(233, 204, 255, 0.9)" />
        <text x={184} y={238} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Fusion + Softmax (0-9)
        </text>

        <line x1={136} y1={48} x2={166} y2={48} stroke="rgba(189, 255, 227, 0.85)" strokeWidth={1.8} markerEnd="url(#arrow-tip)" />
        <line x1={77} y1={72} x2={83} y2={112} stroke="rgba(189, 255, 227, 0.85)" strokeWidth={1.8} markerEnd="url(#arrow-tip)" />
        <line x1={230} y1={72} x2={230} y2={106} stroke="rgba(189, 255, 227, 0.85)" strokeWidth={1.8} markerEnd="url(#arrow-tip)" />
        <line x1={83} y1={160} x2={132} y2={206} stroke="rgba(189, 255, 227, 0.85)" strokeWidth={1.8} markerEnd="url(#arrow-tip)" />
        <line x1={230} y1={166} x2={206} y2={206} stroke="rgba(189, 255, 227, 0.85)" strokeWidth={1.8} markerEnd="url(#arrow-tip)" />
      </svg>

      <svg viewBox="0 0 360 280" role="img" aria-label="Training loss comparison graph" className="h-auto w-full">
        <rect x={0} y={0} width={360} height={280} fill="transparent" />
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = 24 + (206 * tick) / 4;
          return <line key={`grid-${tick}`} x1={46} y1={y} x2={324} y2={y} stroke="rgba(228, 236, 255, 0.18)" />;
        })}

        <line x1={46} y1={24} x2={46} y2={230} stroke="rgba(231, 242, 255, 0.56)" />
        <line x1={46} y1={230} x2={324} y2={230} stroke="rgba(231, 242, 255, 0.56)" />

        <path d={classicalPath} fill="none" stroke="rgba(99, 219, 255, 0.95)" strokeWidth={2.6} />
        <path d={hybridPath} fill="none" stroke="rgba(255, 122, 214, 0.96)" strokeWidth={2.8} />

        <line
          x1={xAt(idx)}
          y1={24}
          x2={xAt(idx)}
          y2={230}
          stroke="rgba(189, 255, 227, 0.6)"
          strokeDasharray="5 4"
        />

        <circle cx={xAt(idx)} cy={yAt(CLASSICAL_LOSS[idx])} r={4.5} fill="rgba(140, 228, 255, 0.98)" />
        <circle cx={xAt(idx)} cy={yAt(HYBRID_LOSS[idx])} r={4.5} fill="rgba(255, 163, 225, 0.98)" />

        <text x={52} y={16} fill="rgba(247, 242, 255, 0.86)" fontSize={11}>
          Loss per epoch
        </text>
        <text x={242} y={16} fill="rgba(255, 163, 225, 0.96)" fontSize={10}>
          Hybrid
        </text>
        <text x={283} y={16} fill="rgba(140, 228, 255, 0.96)" fontSize={10}>
          Classical
        </text>
      </svg>

      <div className="rounded-xl border border-aurora-400/40 bg-black/38 p-4 lg:col-span-2">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p className="text-white/90">Epoch: {idx + 1}</p>
          <p className="text-starlight-100/88">Classical loss: {CLASSICAL_LOSS[idx].toFixed(2)}</p>
          <p className="text-nebula-100/88">Hybrid loss: {HYBRID_LOSS[idx].toFixed(2)}</p>
          <p className="text-starlight-100/84">Classical acc: {CLASSICAL_ACC[idx]}%</p>
          <p className="text-nebula-100/84">Hybrid acc: {HYBRID_ACC[idx]}%</p>
          <p className="text-aurora-200/90">Delta acc: +{HYBRID_ACC[idx] - CLASSICAL_ACC[idx]}%</p>
        </div>
      </div>
    </div>
  );
}

function TensorflowCirqPipelineDiagram({ stage }: { stage: number }) {
  const activeStage = Math.min(MNIST_PIPELINE_STEPS.length - 1, Math.max(0, stage));
  const current = MNIST_PIPELINE_STEPS[activeStage];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <svg
        viewBox="0 0 430 330"
        role="img"
        aria-label="TensorFlow and Cirq pipeline from qsym/quantom_tensforflow_mnist.py"
        className="h-auto w-full"
      >
        <defs>
          <marker id="mnist-arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgba(189, 255, 227, 0.88)" />
          </marker>
        </defs>

        {MNIST_PIPELINE_STEPS.map((entry, idx) => {
          const y = 20 + idx * 42;
          const isActive = idx === activeStage;

          return (
            <g key={entry.name}>
              <rect
                x={18}
                y={y}
                width={264}
                height={34}
                rx={10}
                fill={isActive ? "rgba(163, 88, 255, 0.35)" : "rgba(7, 12, 25, 0.72)"}
                stroke={isActive ? "rgba(233, 204, 255, 0.9)" : "rgba(206, 245, 255, 0.45)"}
              />
              <text x={30} y={y + 15} fill="rgba(247, 241, 255, 0.96)" fontSize={10} fontWeight={700}>
                {`Step ${idx + 1}`}
              </text>
              <text x={30} y={y + 27} fill="rgba(247, 241, 255, 0.84)" fontSize={9}>
                {entry.functions}
              </text>
            </g>
          );
        })}

        {MNIST_PIPELINE_STEPS.slice(0, -1).map((_, idx) => {
          const y1 = 20 + idx * 42 + 34;
          const y2 = 20 + (idx + 1) * 42;
          return (
            <line
              key={`flow-${idx}`}
              x1={150}
              y1={y1}
              x2={150}
              y2={y2}
              stroke="rgba(189, 255, 227, 0.86)"
              strokeWidth={1.6}
              markerEnd="url(#mnist-arrow-tip)"
            />
          );
        })}

        <rect
          x={298}
          y={34}
          width={114}
          height={88}
          rx={12}
          fill="rgba(36, 203, 255, 0.24)"
          stroke="rgba(206, 245, 255, 0.86)"
        />
        <text x={355} y={56} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={10}>
          Train Path
        </text>
        <text x={355} y={74} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          model.fit(...)
        </text>
        <text x={355} y={90} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          model.evaluate(...)
        </text>
        <text x={355} y={106} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          save model + artifacts
        </text>

        <rect
          x={298}
          y={164}
          width={114}
          height={110}
          rx={12}
          fill="rgba(40, 223, 157, 0.18)"
          stroke="rgba(189, 255, 227, 0.86)"
        />
        <text x={355} y={186} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={10}>
          Draw Path
        </text>
        <text x={355} y={204} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          load_model(...)
        </text>
        <text x={355} y={220} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          canvas -&gt; preprocess
        </text>
        <text x={355} y={236} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          Cirq features + predict
        </text>
        <text x={355} y={252} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={9}>
          show top probabilities
        </text>

        <line x1={282} y1={230} x2={298} y2={220} stroke="rgba(189, 255, 227, 0.8)" strokeWidth={1.6} markerEnd="url(#mnist-arrow-tip)" />
        <line x1={282} y1={274} x2={298} y2={236} stroke="rgba(189, 255, 227, 0.8)" strokeWidth={1.6} markerEnd="url(#mnist-arrow-tip)" />
      </svg>

      <div className="rounded-xl border border-cosmic-300/40 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-nebula-100/88">Explain like I am 5</p>
        <p className="mt-2 text-sm text-white/90">{current.name}</p>
        <p className="mt-2 text-sm leading-7 text-white/84">{current.baby}</p>

        <div className="mt-3 rounded-lg border border-aurora-300/40 bg-black/36 p-3 text-xs leading-6 text-aurora-100/88">
          <p>Function call(s): {current.functions}</p>
          <p className="mt-1">Input -&gt; output: {current.io}</p>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-white/80">
          <p className="rounded-lg border border-starlight-300/40 bg-starlight-500/14 px-3 py-2">
            Defaults in script: --max-samples {SCRIPT_DEFAULTS.maxSamples}, --epochs {SCRIPT_DEFAULTS.epochs}, --batch-size {SCRIPT_DEFAULTS.batchSize}
          </p>
          <p className="rounded-lg border border-nebula-300/40 bg-nebula-500/14 px-3 py-2">
            Quantum branch defaults: --n-qubits {SCRIPT_DEFAULTS.qubits}, --cirq-layers {SCRIPT_DEFAULTS.cirqLayers}
          </p>
          <p className="rounded-lg border border-solar-300/40 bg-solar-500/14 px-3 py-2 text-solar-100/92">
            Target gate: --target-accuracy {SCRIPT_DEFAULTS.targetAccuracy}%
          </p>
        </div>
      </div>
    </div>
  );
}

function OledScriptDiagram() {
  const sample = { r: 184, g: 108, b: 231 };
  const channels = [
    {
      key: "R",
      value: sample.r,
      tone: "border-cosmic-300/55 bg-cosmic-500/26 text-cosmic-50",
    },
    {
      key: "G",
      value: sample.g,
      tone: "border-aurora-300/55 bg-aurora-500/24 text-aurora-50",
    },
    {
      key: "B",
      value: sample.b,
      tone: "border-nebula-300/55 bg-nebula-500/26 text-nebula-50",
    },
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <svg viewBox="0 0 420 300" role="img" aria-label="oled.py workflow diagram" className="h-auto w-full">
        <defs>
          <marker id="oled-arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgba(189, 255, 227, 0.88)" />
          </marker>
        </defs>

        <rect x={20} y={20} width={160} height={54} rx={12} fill="rgba(248, 155, 8, 0.28)" stroke="rgba(255, 227, 175, 0.86)" />
        <text x={100} y={43} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Image.open(path).convert("RGB")
        </text>
        <text x={100} y={60} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          load full image array
        </text>

        <rect x={20} y={102} width={160} height={66} rx={12} fill="rgba(36, 203, 255, 0.24)" stroke="rgba(206, 245, 255, 0.86)" />
        <text x={100} y={128} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          get_grid_samples(...)
        </text>
        <text x={100} y={146} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          clamp + extract 10x10 window
        </text>

        <rect x={20} y={196} width={160} height={84} rx={12} fill="rgba(163, 88, 255, 0.3)" stroke="rgba(233, 204, 255, 0.86)" />
        <text x={100} y={222} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          create_qubit_circuit(r,g,b)
        </text>
        <text x={100} y={240} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          3 x RY angle encoding
        </text>
        <text x={100} y={258} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          Statevector.from_instruction
        </text>

        <rect x={236} y={20} width={164} height={88} rx={12} fill="rgba(246, 32, 176, 0.24)" stroke="rgba(255, 210, 238, 0.86)" />
        <text x={318} y={46} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          PixelInteractor
        </text>
        <text x={318} y={64} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          drag full image grid
        </text>
        <text x={318} y={81} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          click magnifier pixel
        </text>
        <text x={318} y={98} textAnchor="middle" fill="rgba(247, 241, 255, 0.78)" fontSize={10}>
          update Bloch vectors
        </text>

        <rect x={236} y={132} width={164} height={148} rx={12} fill="rgba(40, 223, 157, 0.18)" stroke="rgba(189, 255, 227, 0.86)" />
        <text x={318} y={156} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Outputs
        </text>
        <text x={318} y={174} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          matrix_states[10][10]
        </text>
        <text x={318} y={191} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          matrix_binary[10][10]
        </text>
        <text x={318} y={208} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          dominant basis probabilities
        </text>
        <text x={318} y={225} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          formatted per-channel formulas
        </text>
        <text x={318} y={242} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          save qubit_matrix.npy
        </text>

        <line x1={100} y1={74} x2={100} y2={102} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#oled-arrow-tip)" />
        <line x1={100} y1={168} x2={100} y2={196} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#oled-arrow-tip)" />
        <line x1={180} y1={228} x2={236} y2={74} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#oled-arrow-tip)" />
        <line x1={180} y1={238} x2={236} y2={176} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#oled-arrow-tip)" />
      </svg>

      <div className="rounded-xl border border-cosmic-300/40 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-starlight-100/88">RGB encoding math (one pixel)</p>
        <p className="mt-2 text-sm leading-7 text-white/84">
          Each channel maps intensity to an angle with theta = (value / 255) * pi, then applies RY(theta) on one qubit.
        </p>

        <div className="mt-3 grid gap-2">
          {channels.map((channel) => {
            const thetaPi = channel.value / 255;
            const thetaRad = thetaPi * Math.PI;

            return (
              <div key={channel.key} className={`rounded-lg border px-3 py-2 text-sm ${channel.tone}`}>
                <div className="flex items-center justify-between">
                  <span>{channel.key} = {channel.value}</span>
                  <span>{thetaPi.toFixed(3)}pi</span>
                </div>
                <p className="mt-1 text-xs text-white/85">theta = {thetaRad.toFixed(3)} rad</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-nebula-300/35 bg-black/38 p-3 text-xs leading-6 text-nebula-100/86">
          <p>Interactive controls: drag the green sampling box, double-click to recenter, scroll zoom in the magnifier.</p>
          <p className="mt-1">Display updates: pixel RGB, normalized values, basis probabilities, and 3 Bloch vectors.</p>
        </div>

        <div className="mt-4 rounded-lg border border-cosmic-300/35 bg-cosmic-900/20 p-3 text-xs leading-6 text-white/84">
          <p className="text-starlight-100/90">Baby-step file walkthrough:</p>
          <div className="mt-2 grid gap-1.5">
            {OLED_BABY_STEPS.map((step, index) => (
              <p key={`oled-step-${index}`}>{index + 1}. {step}</p>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-aurora-300/35 bg-black/34 p-3 text-xs leading-6 text-aurora-100/88">
          <p>Key methods in order: get_grid_samples() -&gt; create_qubit_circuit() -&gt; get_statevector() -&gt; PixelInteractor.resample_grid() -&gt; update_display().</p>
          <p className="mt-1">Why this matters: every time you move or click, the script recomputes the local 10x10 quantum view so math and visuals stay synced.</p>
        </div>
      </div>
    </div>
  );
}

function QuantumCoinTossDiagram({ tosses }: { tosses: number }) {
  const totalTosses = Math.min(COIN_TOSS_MAX, Math.max(COIN_TOSS_MIN, Math.round(tosses)));

  // Deterministic drift model: larger samples stay closer to a fair 50/50 split.
  const driftAmplitude = 0.22 / Math.sqrt(totalTosses);
  const driftSignal = Math.sin(totalTosses * 0.017) + Math.cos(totalTosses * 0.0031);
  const headsProbability = Math.min(0.7, Math.max(0.3, 0.5 + driftAmplitude * driftSignal));

  const heads = Math.round(totalTosses * headsProbability);
  const tails = totalTosses - heads;

  const headsPct = (heads / totalTosses) * 100;
  const tailsPct = (tails / totalTosses) * 100;
  const spread = Math.abs(headsPct - 50);

  const wobble = Math.max(0.04, Math.min(0.2, 0.55 / Math.pow(totalTosses, 0.25)));
  const convergence = Array.from({ length: 11 }, (_, i) => {
    const progress = i / 10;
    return 0.5 + (1 - progress) * wobble * Math.cos((i + 1) * 1.2 + totalTosses * 0.0016);
  });
  const convergencePath = toPath(convergence, 320, 180, 0.3, 0.7);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <svg viewBox="0 0 420 300" role="img" aria-label="quantum coin toss workflow" className="h-auto w-full">
        <defs>
          <marker id="coin-arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgba(189, 255, 227, 0.88)" />
          </marker>
        </defs>

        <rect x={22} y={28} width={122} height={56} rx={12} fill="rgba(248, 155, 8, 0.3)" stroke="rgba(255, 227, 175, 0.88)" />
        <text x={83} y={52} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Start |0&gt;
        </text>
        <text x={83} y={68} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          qubit before toss
        </text>

        <rect x={164} y={28} width={124} height={56} rx={12} fill="rgba(163, 88, 255, 0.3)" stroke="rgba(233, 204, 255, 0.88)" />
        <text x={226} y={52} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Apply Hadamard H
        </text>
        <text x={226} y={68} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          amplitudes 1/sqrt(2)
        </text>

        <rect x={308} y={28} width={92} height={56} rx={12} fill="rgba(36, 203, 255, 0.24)" stroke="rgba(206, 245, 255, 0.88)" />
        <text x={354} y={52} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          Measure
        </text>
        <text x={354} y={68} textAnchor="middle" fill="rgba(247, 241, 255, 0.8)" fontSize={10}>
          0 or 1
        </text>

        <rect x={34} y={118} width={350} height={62} rx={12} fill="rgba(246, 32, 176, 0.18)" stroke="rgba(255, 210, 238, 0.85)" />
        <text x={209} y={143} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          toss_coin(): repeat measure_qubit() for n tosses
        </text>
        <text x={209} y={160} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={10}>
          results list then Counter for heads and tails
        </text>

        <rect x={34} y={204} width={350} height={78} rx={12} fill="rgba(40, 223, 157, 0.16)" stroke="rgba(189, 255, 227, 0.86)" />
        <text x={209} y={228} textAnchor="middle" fill="rgba(247, 241, 255, 0.95)" fontSize={11}>
          plot_results() and plot_cumulative()
        </text>
        <text x={209} y={246} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={10}>
          save coin_toss_results.png and coin_toss_convergence.png
        </text>
        <text x={209} y={263} textAnchor="middle" fill="rgba(247, 241, 255, 0.82)" fontSize={10}>
          run sizes in main(): 100, 1024, 10000
        </text>

        <line x1={144} y1={56} x2={164} y2={56} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#coin-arrow-tip)" />
        <line x1={288} y1={56} x2={308} y2={56} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#coin-arrow-tip)" />
        <line x1={209} y1={84} x2={209} y2={118} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#coin-arrow-tip)" />
        <line x1={209} y1={180} x2={209} y2={204} stroke="rgba(189, 255, 227, 0.84)" strokeWidth={1.8} markerEnd="url(#coin-arrow-tip)" />
      </svg>

      <div className="rounded-xl border border-cosmic-300/40 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-nebula-100/88">Sample run snapshot</p>
        <p className="mt-2 text-sm text-white/86">n = {totalTosses.toLocaleString()} tosses from the script workflow.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-starlight-300/45 bg-starlight-500/18 p-3">
            <p className="text-xs text-starlight-100/88">Heads (0)</p>
            <p className="mt-1 text-lg text-white">{heads.toLocaleString()}</p>
            <p className="text-xs text-white/78">{headsPct.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-nebula-300/45 bg-nebula-500/18 p-3">
            <p className="text-xs text-nebula-100/88">Tails (1)</p>
            <p className="mt-1 text-lg text-white">{tails.toLocaleString()}</p>
            <p className="text-xs text-white/78">{tailsPct.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-aurora-300/45 bg-black/36 p-3">
          <div className="flex items-center justify-between text-xs text-white/78">
            <span>Fair target</span>
            <span>50% / 50%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cosmic-950/70">
            <div className="h-full bg-starlight-300/90" style={{ width: `${headsPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-aurora-100/88">Absolute drift from fair split: {spread.toFixed(1)}%</p>
        </div>

        <svg viewBox="0 0 320 180" role="img" aria-label="heads probability convergence" className="mt-3 h-auto w-full rounded-lg border border-cosmic-300/35 bg-black/35 p-2">
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = 24 + (126 * tick) / 4;
            return <line key={`coin-grid-${tick}`} x1={46} y1={y} x2={294} y2={y} stroke="rgba(228, 236, 255, 0.16)" />;
          })}

          <line x1={46} y1={24} x2={46} y2={150} stroke="rgba(231, 242, 255, 0.52)" />
          <line x1={46} y1={150} x2={294} y2={150} stroke="rgba(231, 242, 255, 0.52)" />

          <line x1={46} y1={87} x2={294} y2={87} stroke="rgba(189, 255, 227, 0.6)" strokeDasharray="4 4" />
          <path d={convergencePath} fill="none" stroke="rgba(99, 219, 255, 0.95)" strokeWidth={2.5} />

          <text x={52} y={16} fill="rgba(247, 242, 255, 0.86)" fontSize={10}>
            Heads probability over tosses
          </text>
          <text x={214} y={83} fill="rgba(189, 255, 227, 0.9)" fontSize={9}>
            expected 0.5
          </text>
        </svg>

        <div className="mt-3 rounded-lg border border-nebula-300/35 bg-nebula-900/18 p-3 text-xs leading-6 text-white/84">
          <p className="text-nebula-100/90">Baby-step file walkthrough:</p>
          <div className="mt-2 grid gap-1.5">
            {COIN_BABY_STEPS.map((step, index) => (
              <p key={`coin-step-${index}`}>{index + 1}. {step}</p>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-aurora-300/35 bg-black/34 p-3 text-xs leading-6 text-aurora-100/88">
          <p>Logic chain in plain words: make superposition -&gt; measure many times -&gt; count outcomes -&gt; visualize fairness and convergence.</p>
          <p className="mt-1">Mapping used in this file: 0 means Heads, 1 means Tails.</p>
        </div>
      </div>
    </div>
  );
}

export default function QbitSlideDeck() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [qubits, setQubits] = useState(4);
  const [depth, setDepth] = useState(3);
  const [epoch, setEpoch] = useState(5);
  const [mnistStage, setMnistStage] = useState(0);
  const [coinTosses, setCoinTosses] = useState(1024);

  const canPrev = activeSlide > 0;
  const canNext = activeSlide < SLIDES.length - 1;

  const active = useMemo(() => SLIDES[activeSlide], [activeSlide]);

  return (
    <section className="mt-12 rounded-3xl border border-cosmic-300/45 bg-black/62 p-5 backdrop-blur-xl md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-starlight-100/92">
            Visual Slides
          </p>
          <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
            Quantum Script Diagram Deck
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
            disabled={!canPrev}
            className="rounded-full border border-starlight-300/70 bg-starlight-500/30 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide((s) => Math.min(SLIDES.length - 1, s + 1))}
            disabled={!canNext}
            className="rounded-full border border-nebula-300/70 bg-nebula-500/30 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveSlide(index)}
            className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition ${
              index === activeSlide
                ? SLIDE_ACCENTS[index % SLIDE_ACCENTS.length].active
                : SLIDE_ACCENTS[index % SLIDE_ACCENTS.length].inactive
            }`}
          >
            {index + 1}. {slide.title}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OBJECT_TILES.map((tile) => (
          <div key={tile.title} className={`rounded-xl border p-3 ${tile.tone}`}>
            <svg viewBox="0 0 66 36" className="h-9 w-full">
              <line x1={5} y1={18} x2={61} y2={18} stroke="rgba(234, 224, 255, 0.3)" />
              <ShapeNode x={33} y={18} shape={tile.shape} size={8} label="" fill="rgba(250, 232, 255, 0.52)" />
            </svg>
            <p className="mt-2 text-sm text-white">{tile.title}</p>
            <p className="text-xs text-white/78">{tile.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-cosmic-300/45 bg-black/48 p-4 md:p-5">
        <p className="text-sm uppercase tracking-[0.14em] text-nebula-100/90">Slide {activeSlide + 1}</p>
        <h3 className="mt-2 font-display text-xl text-white md:text-2xl">{active.title}</h3>
        <p className="mt-2 text-sm leading-7 text-white/86 md:text-base">{active.subtitle}</p>

        <div
          className={`relative mt-5 overflow-x-auto rounded-xl border border-cosmic-300/35 p-3 md:p-4 ${SLIDE_CANVAS_ACCENTS[activeSlide % SLIDE_CANVAS_ACCENTS.length]}`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full bg-cosmic-200/85" />
            <div className="absolute right-8 top-8 h-3 w-3 rounded-sm border border-nebula-200/75 bg-nebula-300/30" />
            <div className="absolute bottom-7 left-8 h-3 w-3 rotate-45 border border-starlight-200/75 bg-starlight-300/30" />
            <div className="absolute bottom-4 right-12 h-2.5 w-8 rounded-full border border-solar-200/70 bg-solar-300/25" />
          </div>
          <div className="relative z-10">
            {activeSlide === 0 && <ClassicalDiagram />}
            {activeSlide === 1 && <GateDiagram />}
            {activeSlide === 2 && <QuantumLayerDiagram qubits={qubits} depth={depth} />}
            {activeSlide === 3 && <HybridGraphDiagram epoch={epoch} />}
            {activeSlide === 4 && <TensorflowCirqPipelineDiagram stage={mnistStage} />}
            {activeSlide === 5 && <OledScriptDiagram />}
            {activeSlide === 6 && <QuantumCoinTossDiagram tosses={coinTosses} />}
          </div>
        </div>

        {activeSlide === 2 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="rounded-xl border border-starlight-400/40 bg-black/25 p-3">
              <span className="text-sm text-white/88">Qubits: {qubits}</span>
              <input
                type="range"
                min={2}
                max={8}
                value={qubits}
                onChange={(event) => setQubits(Number(event.target.value))}
                className="mt-2 w-full accent-starlight-300"
              />
            </label>

            <label className="rounded-xl border border-nebula-400/40 bg-black/25 p-3">
              <span className="text-sm text-white/88">Layer Depth: {depth}</span>
              <input
                type="range"
                min={1}
                max={5}
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
                className="mt-2 w-full accent-nebula-300"
              />
            </label>
          </div>
        )}

        {activeSlide === 3 && (
          <div className="mt-4 rounded-xl border border-aurora-400/40 bg-black/25 p-3">
            <label>
              <span className="text-sm text-white/88">Epoch Focus: {epoch + 1}</span>
              <input
                type="range"
                min={0}
                max={9}
                value={epoch}
                onChange={(event) => setEpoch(Number(event.target.value))}
                className="mt-2 w-full accent-aurora-300"
              />
            </label>
          </div>
        )}

        {activeSlide === 4 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="rounded-xl border border-nebula-400/40 bg-black/25 p-3">
              <span className="text-sm text-white/88">
                Pipeline Step: {mnistStage + 1} / {MNIST_PIPELINE_STEPS.length}
              </span>
              <input
                type="range"
                min={0}
                max={MNIST_PIPELINE_STEPS.length - 1}
                step={1}
                value={mnistStage}
                onChange={(event) => setMnistStage(Number(event.target.value))}
                className="mt-2 w-full accent-nebula-300"
              />
              <p className="mt-2 text-xs text-white/72">{MNIST_PIPELINE_STEPS[mnistStage].name}</p>
            </label>

            <div className="rounded-xl border border-cosmic-400/40 bg-black/25 p-3 text-xs leading-6 text-white/80">
              <p>Mode flow: train -&gt; save model/artifacts -&gt; draw mode inference.</p>
              <p className="mt-1">At predict time, the drawing uses the same PCA/scaler and Cirq extractor from training artifacts.</p>
            </div>
          </div>
        )}

        {activeSlide === 6 && (
          <div className="mt-4 rounded-xl border border-nebula-400/40 bg-black/25 p-3">
            <label>
              <span className="text-sm text-white/88">
                Coin Toss Sample Size: {coinTosses.toLocaleString()}
              </span>
              <input
                type="range"
                min={COIN_TOSS_MIN}
                max={COIN_TOSS_MAX}
                step={1}
                value={coinTosses}
                onChange={(event) => setCoinTosses(Number(event.target.value))}
                className="mt-2 w-full accent-nebula-300"
              />
            </label>
            <div className="mt-2 flex items-center justify-between text-xs text-white/65">
              <span>{COIN_TOSS_MIN.toLocaleString()}</span>
              <span>{Math.round((COIN_TOSS_MIN + COIN_TOSS_MAX) / 2).toLocaleString()}</span>
              <span>{COIN_TOSS_MAX.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-cosmic-300/45 bg-black/35">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 border-collapse text-left text-sm md:text-base">
            <thead className="bg-black/55">
            <tr>
              <th className="px-4 py-3 font-semibold text-cosmic-100">Gate</th>
              <th className="px-4 py-3 font-semibold text-starlight-100">Symbol</th>
              <th className="px-4 py-3 font-semibold text-nebula-100">Category</th>
              <th className="px-4 py-3 font-semibold text-aurora-100">Math / State Effect</th>
              <th className="px-4 py-3 font-semibold text-solar-100">Why It Matters In Layer</th>
            </tr>
            </thead>
            <tbody>
              {GATES.map((gate, index) => (
                <tr
                  key={gate.gate}
                  className={`border-t border-cosmic-500/28 ${index % 2 === 0 ? "bg-cosmic-950/32" : "bg-black/30"}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <svg viewBox="0 0 32 20" className="h-5 w-8 shrink-0">
                        <ShapeNode x={12} y={10} shape={gate.shape} size={5.2} label="" fill="rgba(250, 230, 255, 0.5)" />
                      </svg>
                      <div>
                        <p className="font-mono text-white/95">{gate.gate}</p>
                        <p className="mt-1 text-xs text-white/72">{gate.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-starlight-100/92">{gate.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${gateCategoryClasses(gate.category)}`}>
                      {gate.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-aurora-100/86">{gate.meaning}</td>
                  <td className="px-4 py-3 text-solar-100/86">{gate.layerRole}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
