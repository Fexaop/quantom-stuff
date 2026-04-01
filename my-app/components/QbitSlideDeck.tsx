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

export default function QbitSlideDeck() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [qubits, setQubits] = useState(4);
  const [depth, setDepth] = useState(3);
  const [epoch, setEpoch] = useState(5);

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
            Quantum MNIST Diagram Deck
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
              index === activeSlide ? SLIDE_ACCENTS[index].active : SLIDE_ACCENTS[index].inactive
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
          className={`relative mt-5 overflow-x-auto rounded-xl border border-cosmic-300/35 p-3 md:p-4 ${SLIDE_CANVAS_ACCENTS[activeSlide]}`}
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
