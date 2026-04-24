import Link from "next/link";
import type { ReactNode } from "react";
import LightRays from "@/components/LightRays";
import QbitSlideDeck from "@/components/QbitSlideDeck";

function ObjectCard({
  title,
  subtitle,
  children,
  toneClass,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  toneClass: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 shadow-[0_10px_35px_rgba(6,8,18,0.45)] backdrop-blur-md ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-white/85">{title}</p>
      <p className="mt-1 text-sm text-white/95">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </article>
  );
}

const compareRows = [
  {
    topic: "State Space",
    bit: "Each bit is exactly 0 or 1",
    qubit: "Each qubit is a complex superposition of 0 and 1",
  },
  {
    topic: "Correlation",
    bit: "Correlations are explicit and local",
    qubit: "Entanglement creates non-classical correlations",
  },
  {
    topic: "Computation",
    bit: "Logic gates update deterministic binary states",
    qubit: "Unitary gates rotate amplitudes and phases",
  },
  {
    topic: "Information Readout",
    bit: "Directly readable at any time",
    qubit: "Measurement collapses probability amplitudes",
  },
  {
    topic: "Model Role in MNIST",
    bit: "Classical neurons process pixels and logits",
    qubit: "Quantum circuit emits expectation-value features",
  },
];

export default function QbitsPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white antialiased">
      <div className="absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#d9c2ff"
          raysSpeed={1}
          lightSpread={0.5}
          rayLength={3}
          followMouse={false}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          className="custom-rays"
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 pt-20">
        <header className="relative mx-auto max-w-4xl text-center">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-22 w-96 -translate-x-1/2 rounded-full border border-cosmic-300/35 bg-cosmic-400/20 blur-xl" />
          <div className="pointer-events-none absolute -top-5 right-12 h-16 w-16 rounded-full border border-nebula-300/40 bg-nebula-400/22 blur-lg" />
          <div className="pointer-events-none absolute -top-4 left-12 h-14 w-14 rounded-full border border-starlight-300/45 bg-starlight-400/22 blur-lg" />
          <p className="text-xs uppercase tracking-[0.22em] text-starlight-100/95">
            Qbits Visual Guide
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white md:text-6xl">
            <span className="text-starlight-200">Bits</span> vs <span className="text-nebula-200">Qubits</span> With Real Diagrams
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/80 md:text-lg">
            A slide-based visual explanation of classical MNIST networks, gate-level
            qubit layers, and the hybrid quantum training flow.
          </p>


          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-starlight-300/70 bg-starlight-500/30 px-5 py-2.5 text-sm text-white transition hover:bg-starlight-400/40"
            >
              Back to Home
            </Link>
            <a
              href="#compare"
              className="rounded-full border border-nebula-300/70 bg-nebula-500/30 px-5 py-2.5 text-sm text-white transition hover:bg-nebula-400/40"
            >
              Jump to Comparison
            </a>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <ObjectCard
            title="Classical Core"
            subtitle="A neuron combines weighted inputs into one activation."
            toneClass="border-cosmic-300/70 bg-cosmic-900/42"
          >
            <svg viewBox="0 0 240 130" className="h-30 w-full">
              {[24, 54, 84].map((y, idx) => (
                <g key={`input-${idx}`}>
                  <circle cx={30} cy={y} r={8} fill="rgba(36, 203, 255, 0.45)" stroke="rgba(219, 245, 255, 0.9)" />
                  <line x1={38} y1={y} x2={110} y2={64} stroke="rgba(140, 228, 255, 0.6)" strokeWidth={1.4} />
                </g>
              ))}
              <rect x={110} y={44} width={48} height={40} rx={10} fill="rgba(163, 88, 255, 0.5)" stroke="rgba(243, 230, 255, 0.9)" />
              <text x={134} y={68} textAnchor="middle" fontSize={11} fill="rgba(248, 244, 255, 0.9)">
                Sigma
              </text>
              <line x1={158} y1={64} x2={206} y2={64} stroke="rgba(255, 212, 143, 0.72)" strokeWidth={1.5} />
              <circle cx={214} cy={64} r={10} fill="rgba(248, 155, 8, 0.4)" stroke="rgba(255, 240, 201, 0.9)" />
              <text x={12} y={118} fontSize={10} fill="rgba(245, 238, 255, 0.8)">
                f = w1*x1 + w2*x2 + ... + b
              </text>
            </svg>
          </ObjectCard>

          <ObjectCard
            title="Qubit State"
            subtitle="A qubit rotates on a state sphere before measurement."
            toneClass="border-nebula-300/70 bg-nebula-900/40"
          >
            <svg viewBox="0 0 240 130" className="h-30 w-full">
              <circle cx={112} cy={66} r={42} fill="rgba(255, 67, 197, 0.2)" stroke="rgba(255, 220, 242, 0.9)" />
              <ellipse cx={112} cy={66} rx={42} ry={13} fill="none" stroke="rgba(236, 224, 255, 0.35)" />
              <line x1={112} y1={24} x2={112} y2={108} stroke="rgba(236, 224, 255, 0.32)" />
              <line x1={70} y1={66} x2={154} y2={66} stroke="rgba(236, 224, 255, 0.32)" />
              <line x1={112} y1={66} x2={142} y2={40} stroke="rgba(99, 219, 255, 0.95)" strokeWidth={2} />
              <circle cx={142} cy={40} r={5} fill="rgba(99, 219, 255, 0.95)" />
              <text x={164} y={42} fontSize={10} fill="rgba(246, 240, 255, 0.9)">
                psi
              </text>
              <text x={14} y={118} fontSize={10} fill="rgba(245, 238, 255, 0.8)">
                Rotations RX, RY, RZ shape amplitudes and phase.
              </text>
            </svg>
          </ObjectCard>

          <ObjectCard
            title="Gate Pipeline"
            subtitle="Layer objects: encode, rotate, entangle, readout."
            toneClass="border-starlight-300/70 bg-starlight-950/55"
          >
            <svg viewBox="0 0 240 130" className="h-30 w-full">
              {[38, 66, 94].map((y, idx) => (
                <line key={`wire-${idx}`} x1={20} y1={y} x2={220} y2={y} stroke="rgba(231, 220, 255, 0.34)" />
              ))}
              <rect x={42} y={28} width={24} height={20} rx={4} fill="rgba(246, 32, 176, 0.48)" />
              <polygon points="94,38 104,28 114,38 104,48" fill="rgba(163, 88, 255, 0.5)" />
              <rect x={136} y={31} width={30} height={14} rx={7} fill="rgba(36, 203, 255, 0.5)" />
              <line x1={182} y1={38} x2={182} y2={66} stroke="rgba(90, 245, 186, 0.72)" strokeDasharray="4 4" />
              <circle cx={182} cy={38} r={3.7} fill="rgba(247, 240, 255, 0.95)" />
              <circle cx={182} cy={66} r={3.7} fill="rgba(247, 240, 255, 0.95)" />
              <circle cx={206} cy={94} r={8} fill="rgba(248, 155, 8, 0.42)" stroke="rgba(255, 240, 201, 0.85)" />
              <text x={14} y={118} fontSize={10} fill="rgba(245, 238, 255, 0.8)">
                CZ links create shared quantum correlations.
              </text>
            </svg>
          </ObjectCard>
        </section>

        <section
          id="compare"
          className="mt-12 overflow-hidden rounded-3xl border border-cosmic-300/45 bg-black/58 backdrop-blur-lg"
        >
          <table className="w-full border-collapse text-left text-sm md:text-base">
            <thead className="bg-black/55">
              <tr>
                <th className="px-5 py-4 font-semibold text-cosmic-100">Topic</th>
                <th className="px-5 py-4 font-semibold text-starlight-100">Normal Bits</th>
                <th className="px-5 py-4 font-semibold text-nebula-100">Qubits</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, index) => (
                <tr
                  key={row.topic}
                  className={`border-t border-cosmic-500/30 ${index % 2 === 0 ? "bg-cosmic-950/35" : "bg-black/30"}`}
                >
                  <td className="px-5 py-4 text-cosmic-100/96">{row.topic}</td>
                  <td className="px-5 py-4 text-starlight-100/88">{row.bit}</td>
                  <td className="px-5 py-4 text-nebula-100/90">{row.qubit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <QbitSlideDeck />
      </main>
    </div>
  );
}
