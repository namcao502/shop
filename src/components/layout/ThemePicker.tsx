"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

export function ThemePicker() {
  const { hue, rainbow, setHue, setRainbow } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Palette button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Theme color"
        className="h-7 w-7 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 active:scale-95"
        style={{
          background:
            "conic-gradient(hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))",
          boxShadow: `0 0 0 2px white, 0 0 0 3.5px hsl(${hue}, 70%, 40%)`,
        }}
      />

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-stone-200 bg-white shadow-xl">
          {/* Row 1: Color */}
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Color
            </p>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              disabled={rainbow}
              onChange={(e) => setHue(Number(e.target.value))}
              className="hue-slider w-full"
            />
          </div>

          {/* Row 2: Rainbow */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Rainbow
            </p>
            <button
              onClick={() => setRainbow(!rainbow)}
              className="w-full rounded-lg py-2 text-xs font-bold text-white transition-all"
              style={{
                background:
                  "linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))",
                boxShadow: rainbow
                  ? "0 0 0 2px white, 0 0 0 4px hsl(270,70%,55%), 0 0 12px rgba(180,100,255,.4)"
                  : undefined,
              }}
            >
              {rainbow ? "Animating... (click to stop)" : "Animate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
