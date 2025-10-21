"use client";

import { useEffect, useMemo, useState } from "react";

interface CelebrationOverlayProps {
  visible: boolean;
  message: string;
  durationMs?: number;
  onComplete?: () => void;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

export default function CelebrationOverlay({
  visible,
  message,
  durationMs = 2800,
  onComplete,
}: CelebrationOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    const palette = [
      "#f97316",
      "#3b82f6",
      "#22c55e",
      "#ec4899",
      "#facc15",
      "#a855f7",
    ];
    return Array.from({ length: 80 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.75,
      duration: 1.6 + Math.random(),
      color: palette[index % palette.length],
      width: 0.25 + Math.random() * 0.25,
      height: 0.9 + Math.random() * 0.7,
      rotation: Math.random() * 360,
    }));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timeout = window.setTimeout(() => {
      onComplete?.();
    }, durationMs);

    return () => window.clearTimeout(timeout);
  }, [visible, durationMs, onComplete]);

  if (!visible) {
    return null;
  }

  const shouldAnimate = !prefersReducedMotion;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col items-center justify-center">
      {shouldAnimate && (
        <div className="absolute inset-0 overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: piece.color,
                width: `${piece.width}rem`,
                height: `${piece.height}rem`,
                transform: `rotate(${piece.rotation}deg)`,
                animationTimingFunction:
                  piece.id % 2 === 0 ? "ease-in-out" : "linear",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative px-6 py-3 rounded-full bg-white/90 dark:bg-gray-900/80 text-lg font-semibold text-purple-700 dark:text-purple-200 shadow-lg border border-purple-100 dark:border-purple-700">
        {message}
      </div>
    </div>
  );
}
