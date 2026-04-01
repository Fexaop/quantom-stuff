"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scene = {
  id: string;
  step: string;
  title: string;
  description: string;
  bullets: string[];
};

type Point = {
  x: number;
  y: number;
};

const SCENES: Scene[] = [
  {
    id: "classical",
    step: "01",
    title: "Classical 4-Layer Baseline",
    description:
      "Start with a standard MNIST learner: input pixels flow through 4 neural blocks, then softmax predicts one digit.",
    bullets: [
      "Layer stack: input -> hidden 1 -> hidden 2 -> output logits.",
      "Backprop updates each neuron weight from cross-entropy loss.",
      "This is the familiar baseline before quantum features are added.",
    ],
  },
  {
    id: "replace-neuron",
    step: "02",
    title: "Replace Neuron Logic With Qubit States",
    description:
      "Instead of every hidden unit being a plain weighted sum, we map features into qubit angles and binary gate signals.",
    bullets: [
      "MNIST image is flattened and reduced to n_qubits dimensions with PCA.",
      "Angles are scaled to [-pi, pi] for RY rotations.",
      "Sign of each angle creates a binary bit signal for X-gate flips.",
    ],
  },
  {
    id: "quantum-layer",
    step: "03",
    title: "Build Quantum Layers",
    description:
      "Each circuit layer rotates qubits then entangles them with CZ links. Measured expectations become learned quantum features.",
    bullets: [
      "Repeat RY rotations for every qubit across circuit depth.",
      "Use ring-style CZ entanglement to couple neighboring qubits.",
      "Read Z and ZZ expectation values as a feature vector.",
    ],
  },
  {
    id: "hybrid-train",
    step: "04",
    title: "Hybrid Quantum + TensorFlow Training",
    description:
      "In your quantom_tensorflow_mnist workflow, classical image features and quantum features are fused, then trained end-to-end by gradient descent.",
    bullets: [
      "TensorFlow branch extracts visual patterns from the image.",
      "Quantum branch contributes entanglement-aware features.",
      "Concatenate both branches and classify digits with softmax.",
    ],
  },
];

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const buildLayer = (count: number, x: number, top: number, bottom: number): Point[] => {
  if (count <= 1) {
    return [{ x, y: (top + bottom) / 2 }];
  }

  const gap = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, index) => ({
    x,
    y: top + index * gap,
  }));
};

const getSceneProgress = (
  progress: number,
  sceneIndex: number,
  sceneCount: number,
): number => {
  const start = sceneIndex / sceneCount;
  const end = (sceneIndex + 1) / sceneCount;
  return clamp((progress - start) / (end - start), 0, 1);
};

export default function QubitScrollPlayground() {
  const containerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [qubits, setQubits] = useState(6);
  const [depth, setDepth] = useState(4);
  const [quantumMix, setQuantumMix] = useState(60);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;

      if (totalScrollable <= 0) {
        setProgress(0);
        return;
      }

      const traveled = clamp(-rect.top, 0, totalScrollable);
      setProgress(traveled / totalScrollable);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const activeScene = Math.min(
    SCENES.length - 1,
    Math.floor(progress * SCENES.length),
  );

  const classicalLayers = useMemo(
    () => [10, 8, 6, 4].map((count, idx) => buildLayer(count, 78 + idx * 112, 52, 386)),
    [],
  );

  const pcaCompression = clamp((progress - 0.2) / 0.17, 0, 1);
  const quantumReveal = clamp((progress - 0.4) / 0.2, 0, 1);
  const hybridReveal = clamp((progress - 0.7) / 0.2, 0, 1);

  const ringRotation = progress * Math.PI * 1.4;
  const classicalOpacity = 1 - quantumReveal * 0.82;

  const qubitNodes = useMemo(() => {
    const count = Math.max(2, qubits);
    const radius = 88;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + ringRotation;
      return {
        x: 548 + Math.cos(angle) * radius,
        y: 218 + Math.sin(angle) * radius,
      };
    });
  }, [qubits, ringRotation]);

  const outputProbs = useMemo(() => {
    const raw = Array.from({ length: 10 }, (_, digit) => {
      const wave = 0.1 * Math.sin(progress * 8 + digit * 0.8);
      const baseline = 0.14 + ((digit * 3 + 5) % 7) * 0.03;
      const focus = digit === 7 ? 0.24 + (quantumMix / 300) * hybridReveal : 0;
      return clamp(baseline + wave + focus, 0.03, 0.85);
    });

    const total = raw.reduce((sum, value) => sum + value, 0);
    return raw.map((value) => value / total);
  }, [progress, hybridReveal, quantumMix]);

  const panelDrift = (progress - 0.5) * 18;

  return (
    <section ref={containerRef} className="relative z-10 mx-auto mt-16 w-full max-w-6xl px-6 pb-28">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cosmic-100/80">
          Interactive Scroll Story
        </p>
        <h2 className="mt-3 font-display text-3xl text-white md:text-5xl">
          Qubit Playground for MNIST
        </h2>
        <p className="mt-5 text-base leading-8 text-white/80 md:text-lg">
          Scroll down and watch the model morph from a classical 4-layer MNIST
          network into a hybrid quantum pipeline where qubit circuits add new
          features before final classification.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.95fr]">
        <div
          className="lg:sticky lg:top-20"
          style={{ transform: `translate3d(0, ${panelDrift}px, 0)` }}
        >
          <div className="rounded-3xl border border-cosmic-500/40 bg-black/40 p-4 backdrop-blur-xl">
            <div className="rounded-2xl border border-cosmic-500/35 bg-black/35 p-3">
              <svg
                viewBox="0 0 720 440"
                role="img"
                aria-label="Scroll-reactive classical-to-quantum network diagram"
                className="h-75 w-full md:h-90"
              >
                <rect x="0" y="0" width="720" height="440" fill="transparent" />

                {classicalLayers.slice(0, -1).map((layer, layerIndex) => {
                  const nextLayer = classicalLayers[layerIndex + 1];

                  return layer.map((node, nodeIndex) => {
                    const nextNode = nextLayer[nodeIndex % nextLayer.length];
                    const x1 = node.x + (530 - node.x) * pcaCompression * 0.58;
                    const y1 = node.y + (218 - node.y) * pcaCompression * 0.48;
                    const x2 = nextNode.x + (530 - nextNode.x) * pcaCompression * 0.58;
                    const y2 = nextNode.y + (218 - nextNode.y) * pcaCompression * 0.48;

                    return (
                      <line
                        key={`edge-${layerIndex}-${nodeIndex}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(215, 195, 255, 0.45)"
                        strokeWidth={0.9}
                        opacity={classicalOpacity}
                      />
                    );
                  });
                })}

                {classicalLayers.map((layer, layerIndex) => {
                  return layer.map((node, nodeIndex) => {
                    const x = node.x + (530 - node.x) * pcaCompression * 0.58;
                    const y = node.y + (218 - node.y) * pcaCompression * 0.48;

                    return (
                      <circle
                        key={`node-${layerIndex}-${nodeIndex}`}
                        cx={x}
                        cy={y}
                        r={4.2}
                        fill="rgba(245, 241, 255, 0.95)"
                        opacity={classicalOpacity}
                      />
                    );
                  });
                })}

                {qubitNodes.map((node, nodeIndex) => {
                  const next = qubitNodes[(nodeIndex + 1) % qubitNodes.length];

                  return (
                    <line
                      key={`q-edge-${nodeIndex}`}
                      x1={node.x}
                      y1={node.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="rgba(205, 172, 255, 0.72)"
                      strokeWidth={1.8}
                      opacity={quantumReveal}
                    />
                  );
                })}

                {qubitNodes.map((node, nodeIndex) => (
                  <g key={`q-node-${nodeIndex}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={9.6}
                      fill="rgba(213, 187, 255, 0.25)"
                      opacity={quantumReveal}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={5.8}
                      fill="rgba(248, 244, 255, 0.96)"
                      opacity={quantumReveal}
                    />
                  </g>
                ))}

                {outputProbs.map((value, digit) => {
                  const barX = 620;
                  const barY = 54 + digit * 35;
                  const barWidth = 72 * value + hybridReveal * 28;

                  return (
                    <g key={`prob-${digit}`}>
                      <text
                        x={580}
                        y={barY + 9}
                        fill="rgba(246, 241, 255, 0.88)"
                        fontSize="10"
                        opacity={hybridReveal}
                      >
                        {digit}
                      </text>
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={10}
                        rx={5}
                        fill={digit === 7 ? "rgba(216, 194, 255, 0.95)" : "rgba(244, 236, 255, 0.45)"}
                        opacity={hybridReveal}
                      />
                    </g>
                  );
                })}

                <text
                  x="62"
                  y="30"
                  fill="rgba(247, 242, 255, 0.82)"
                  fontSize="13"
                  opacity={classicalOpacity}
                >
                  Classical 4-layer network
                </text>

                <text
                  x="488"
                  y="28"
                  fill="rgba(228, 210, 255, 0.92)"
                  fontSize="13"
                  opacity={quantumReveal}
                >
                  Quantum ring layer (RY + CZ)
                </text>

                <text
                  x="592"
                  y="30"
                  fill="rgba(244, 236, 255, 0.95)"
                  fontSize="13"
                  opacity={hybridReveal}
                >
                  Digit logits
                </text>
              </svg>
            </div>

            <div className="mt-4 rounded-2xl border border-cosmic-500/35 bg-black/40 p-4 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.2em] text-cosmic-100/80">
                Mini Quantum Playground
              </p>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm text-white/90">Qubits: {qubits}</span>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={qubits}
                    onChange={(event) => setQubits(Number(event.target.value))}
                    className="mt-2 w-full accent-cosmic-300"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/90">Circuit depth: {depth}</span>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={depth}
                    onChange={(event) => setDepth(Number(event.target.value))}
                    className="mt-2 w-full accent-cosmic-300"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/90">Quantum mix: {quantumMix}%</span>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    value={quantumMix}
                    onChange={(event) => setQuantumMix(Number(event.target.value))}
                    className="mt-2 w-full accent-cosmic-300"
                  />
                </label>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/70">
                Scroll drives the architecture transition, while sliders let you
                test how qubit count and circuit depth would reshape a quantum
                feature layer.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {SCENES.map((scene, index) => {
            const localProgress = getSceneProgress(progress, index, SCENES.length);
            const fade = 0.42 + localProgress * 0.58;
            const yShift = (1 - localProgress) * 24;
            const xShift = index % 2 === 0 ? (1 - localProgress) * 14 : (localProgress - 1) * 14;
            const isActive = index === activeScene;

            return (
              <article key={scene.id} className="min-h-[72vh] flex items-center">
                <div
                  className={`w-full rounded-3xl border p-7 backdrop-blur-lg transition-colors md:p-9 ${
                    isActive
                      ? "border-cosmic-300/60 bg-black/45"
                      : "border-cosmic-700/45 bg-black/25"
                  }`}
                  style={{
                    opacity: fade,
                    transform: `translate3d(${xShift}px, ${yShift}px, 0)`,
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-cosmic-100/85">
                    Step {scene.step}
                  </p>
                  <h3 className="mt-3 font-display text-2xl text-white md:text-3xl">
                    {scene.title}
                  </h3>
                  <p className="mt-4 leading-8 text-white/82">{scene.description}</p>

                  <ul className="mt-5 space-y-3">
                    {scene.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-xl border border-cosmic-500/30 bg-black/25 px-4 py-3 text-sm leading-7 text-white/75"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
