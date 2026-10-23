"use client";
import { OrbState } from "@/lib/types";

const LABELS: Record<OrbState, string> = {
  idle: "Ready",
  listening: "Listening…",
  planning: "Planning…",
  executing: "Working…",
  success: "Done",
  error: "Needs attention",
};

export default function Orb({ state = "idle", size = 120, showLabel = true }: { state?: OrbState; size?: number; showLabel?: boolean }) {
  const ring = Math.round(size * 1.55);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="orb-wrap" data-state={state} style={{ width: ring, height: ring }} role="img" aria-label={`StudyFlow assistant status: ${LABELS[state]}`}>
        <div className="orb-ring" style={{ width: ring, height: ring }} aria-hidden />
        <div className="orb-ring r2" style={{ width: ring * 0.82, height: ring * 0.82 }} aria-hidden />
        <div className="orb" data-state={state} style={{ width: size, height: size }} aria-hidden />
      </div>
      {showLabel && <span className="text-xs font-semibold tracking-wide" style={{ color: state === "error" ? "#ffb4c0" : "#7df0cd" }} aria-live="polite">{LABELS[state]}</span>}
    </div>
  );
}
