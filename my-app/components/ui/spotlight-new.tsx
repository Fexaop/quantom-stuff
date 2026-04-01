"use client";

import React from "react";

type SpotlightProps = {
  className?: string;
};

export function Spotlight({ className = "" }: SpotlightProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-136 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_72%)] ${className}`}
    />
  );
}

export function SpotlightNewDemo() {
  return (
    <div className="relative flex h-160 w-full items-center justify-center overflow-hidden rounded-md bg-black/96 antialiased">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[34px_34px]" />
      <Spotlight />
      <div className="relative z-10 mx-auto w-full max-w-7xl p-4 pt-20 md:pt-0">
        <h1 className="bg-linear-to-b from-neutral-50 to-neutral-400 bg-clip-text text-center text-4xl font-bold text-transparent md:text-7xl">
          Spotlight
          <br />
          which is not overused.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-base text-neutral-300">
          A subtle yet effective spotlight effect, because the previous version
          is used a bit too much these days.
        </p>
      </div>
    </div>
  );
}
