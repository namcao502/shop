"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const LS_HUE = "souvenir-shop-theme-hue";
const LS_RAINBOW = "souvenir-shop-theme-rainbow";
const DEFAULT_HUE = 38;
const RAINBOW_INTERVAL_MS = 40;

interface ThemeContextValue {
  hue: number;
  rainbow: boolean;
  setHue: (h: number) => void;
  setRainbow: (on: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [hue, setHueState] = useState<number>(DEFAULT_HUE);
  const [rainbow, setRainbowState] = useState<boolean>(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hueRef = useRef<number>(DEFAULT_HUE);

  // Read localStorage on mount (client only)
  useEffect(() => {
    const savedHue = parseInt(localStorage.getItem(LS_HUE) ?? String(DEFAULT_HUE), 10);
    // Default to rainbow=true for first-time visitors (no saved preference)
    const savedRainbow = localStorage.getItem(LS_RAINBOW) !== "false";
    const initialHue = isNaN(savedHue) ? DEFAULT_HUE : Math.max(0, Math.min(360, savedHue));
    hueRef.current = initialHue;
    setHueState(initialHue);
    applyHue(initialHue);
    setRainbowState(savedRainbow);
  }, []);

  // Apply CSS var whenever hue changes
  useEffect(() => {
    applyHue(hue);
    hueRef.current = hue;
  }, [hue]);

  // Manage rainbow interval
  useEffect(() => {
    if (rainbow) {
      intervalRef.current = setInterval(() => {
        const next = (hueRef.current + 1) % 360;
        hueRef.current = next;
        applyHue(next);
        setHueState(next);
        localStorage.setItem(LS_HUE, String(next));
      }, RAINBOW_INTERVAL_MS);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rainbow]);

  function setHue(h: number) {
    if (rainbow) return;
    const clamped = Math.max(0, Math.min(360, h));
    setHueState(clamped);
    localStorage.setItem(LS_HUE, String(clamped));
  }

  function setRainbow(on: boolean) {
    setRainbowState(on);
    localStorage.setItem(LS_RAINBOW, String(on));
  }

  return (
    <ThemeContext.Provider value={{ hue, rainbow, setHue, setRainbow }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

function applyHue(hue: number) {
  document.documentElement.style.setProperty("--theme-hue", String(hue));
}
