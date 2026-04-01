import Link from "next/link";
import LightRays from "@/components/LightRays";

const principles = [
  {
    title: "Superposition",
    description:
      "A qubit can represent a blend of 0 and 1 at the same time until it is measured.",
  },
  {
    title: "Entanglement",
    description:
      "Two qubits can share one connected state, so measuring one can affect the other instantly.",
  },
  {
    title: "Interference",
    description:
      "Quantum algorithms amplify good answers and cancel weak paths to improve the final result.",
  },
];

const comparisonRows = [
  {
    topic: "State",
    bit: "Either 0 or 1",
    qubit: "Combination of 0 and 1",
  },
  {
    topic: "Storage",
    bit: "One fixed value per bit",
    qubit: "Probability amplitudes",
  },
  {
    topic: "Correlations",
    bit: "Independent unless manually linked",
    qubit: "Can be entangled natively",
  },
  {
    topic: "Computation style",
    bit: "Direct deterministic logic",
    qubit: "Probability-driven quantum circuits",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white antialiased">
      <div className="absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#d9c2ff"
          raysSpeed={1}
          lightSpread={0.5}
          rayLength={3}
          followMouse
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          className="custom-rays"
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div>

      <section className="relative isolate overflow-hidden">
        <main className="relative z-10 mx-auto flex min-h-160 w-full max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">

          <h1 className="animate-fade-up mt-7 bg-linear-to-b from-white via-cosmic-100 to-cosmic-300 bg-clip-text font-display text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            Meet Qubits
            <br />
            Bits from a Parallel Rulebook
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-2xl text-base leading-8 text-white/80 md:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            Classical computers use bits that are always 0 or 1. Quantum
            computers use qubits, which can be a mixture of both. This landing
            page gives you a quick mental model of how qubits work and why they
            are different.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <span className="rounded-full border border-cosmic-400/40 bg-cosmic-950/25 px-3 py-1.5 text-sm text-cosmic-100">
              Superposition
            </span>
            <span className="rounded-full border border-cosmic-400/40 bg-cosmic-950/25 px-3 py-1.5 text-sm text-cosmic-100">
              Entanglement
            </span>
            <span className="rounded-full border border-cosmic-400/40 bg-cosmic-950/25 px-3 py-1.5 text-sm text-cosmic-100">
              Interference
            </span>
          </div>

          <div
            className="animate-fade-up mt-6"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/qbits"
              className="inline-flex items-center rounded-full border border-cosmic-300/50 bg-black/35 px-5 py-2.5 text-sm text-white/95 transition hover:border-cosmic-200/80 hover:bg-black/50"
            >
              Open Interactive Qbits Playground
            </Link>
          </div>
        </main>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="animate-fade-up rounded-3xl border border-cosmic-700/55 bg-black/25 p-7 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-cosmic-200/90">
              Bit (Classical)
            </p>
            <h2 className="mt-3 font-display text-2xl text-white">
              Predictable and Binary
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              A bit is like a light switch. It is either OFF (0) or ON (1). All
              classical programs are built from this exact yes-or-no behavior.
            </p>
          </article>

          <article
            className="animate-fade-up rounded-3xl border border-cosmic-700/55 bg-black/25 p-7 backdrop-blur-md"
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-cosmic-200/90">
              Qubit (Quantum)
            </p>
            <h2 className="mt-3 font-display text-2xl text-white">
              Probabilistic and Rich
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              A qubit is closer to a spinning coin. Before measurement, it can
              hold weighted possibilities of both 0 and 1, which enables new
              algorithm designs.
            </p>
          </article>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <h3 className="font-display text-3xl text-white md:text-4xl">
          How Qubits Work
        </h3>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {principles.map((item, index) => (
            <article
              key={item.title}
              className="animate-fade-up rounded-2xl border border-cosmic-700/55 bg-black/25 p-6 backdrop-blur-md"
              style={{ animationDelay: `${120 + index * 90}ms` }}
            >
              <h4 className="font-display text-xl text-white">{item.title}</h4>
              <p className="mt-3 leading-7 text-white/80">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-6">
        <h3 className="font-display text-3xl text-white md:text-4xl">
          Qubit vs Bit at a Glance
        </h3>
        <div className="mt-6 overflow-hidden rounded-3xl border border-cosmic-700/55 bg-black/25 backdrop-blur-md">
          <table className="w-full border-collapse text-left text-sm md:text-base">
            <thead>
              <tr className="text-white/90">
                <th className="px-5 py-4 font-semibold">Topic</th>
                <th className="px-5 py-4 font-semibold">Bit</th>
                <th className="px-5 py-4 font-semibold">Qubit</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.topic} className="border-t border-cosmic-700/40">
                  <td className="px-5 py-4 text-white/90">{row.topic}</td>
                  <td className="px-5 py-4 text-white/75">{row.bit}</td>
                  <td className="px-5 py-4 text-white/85">{row.qubit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
