// The pixel robot mascot, drawn on a 24×24 grid. Animation classes live in globals.css.
export type RobotEyes = "open" | "sleepy" | "hearts";

const HEART = "M0 1.4 L-1.5 0 A0.85 0.85 0 0 1 0 -1.2 A0.85 0.85 0 0 1 1.5 0 Z";

// pose="sit": the body ends at y=16 (the seat line) and the legs hang below it, so whatever the robot
// sits on lines up with 2/3 of its height. Arms hang at its sides instead of sticking out.
export function RobotSvg({ className = "", eyes = "open", cup = false, pose = "stand" }: {
  className?: string;
  eyes?: RobotEyes;
  cup?: boolean;
  pose?: "stand" | "sit";
}) {
  if (pose === "sit") {
    return (
      <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect className="leg left" x="7.5" y="15.5" width="3" height="6.5" rx="0.6" fill="var(--robot-dark)" />
        <rect className="leg right" x="13.5" y="15.5" width="3" height="6.5" rx="0.6" fill="var(--robot-dark)" />
        <rect x="3" y="9.5" width="3" height="5" rx="0.6" fill="var(--robot-dark)" />
        <rect x="18" y="9.5" width="3" height="5" rx="0.6" fill="var(--robot-dark)" />
        <rect x="6" y="4" width="12" height="12" rx="1" fill="var(--robot)" />
        <Eyes eyes={eyes} y={-2} />
        {/* Morning coffee, held in the right hand */}
        {cup && (
          <g>
            <rect x="18.6" y="12.6" width="3.4" height="3.8" rx="0.4" fill="#FFFFFF" stroke="var(--ink)" strokeWidth="0.6" />
            <rect x="18.6" y="12.6" width="3.4" height="1" fill="var(--robot-dark)" />
          </g>
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="7" y="18" width="3" height="4" fill="var(--robot-dark)" />
      <rect x="14" y="18" width="3" height="4" fill="var(--robot-dark)" />
      <rect className="arm left" x="2" y="11" width="4" height="3" fill="var(--robot)" />
      <rect className="arm right" x="18" y="11" width="4" height="3" fill="var(--robot)" />
      <rect x="6" y="6" width="12" height="12" rx="1" fill="var(--robot)" />
      <Eyes eyes={eyes} />
      {/* Morning coffee, resting on the right hand */}
      {cup && (
        <g>
          <rect x="19.2" y="7.2" width="3.4" height="3.8" rx="0.4" fill="#F6F1E5" stroke="var(--ink)" strokeWidth="0.6" />
          <rect x="19.2" y="7.2" width="3.4" height="1" fill="var(--robot-dark)" />
        </g>
      )}
    </svg>
  );
}

// y shifts the eyes with the body (the sitting pose's body sits 2 units higher).
function Eyes({ eyes, y = 0 }: { eyes: RobotEyes; y?: number }) {
  if (eyes === "hearts") {
    return (
      <>
        <path d={HEART} transform={`translate(10 ${11.6 + y}) scale(1.3)`} fill="var(--color-flag)" />
        <path d={HEART} transform={`translate(14 ${11.6 + y}) scale(1.3)`} fill="var(--color-flag)" />
      </>
    );
  }
  if (eyes === "sleepy") {
    return (
      <>
        <rect x="9" y={12 + y} width="2" height="1" fill="var(--ink)" />
        <rect x="13" y={12 + y} width="2" height="1" fill="var(--ink)" />
      </>
    );
  }
  return (
    <>
      <rect className="eye" x="9" y={10 + y} width="2" height="3" fill="var(--ink)" />
      <rect className="eye right" x="13" y={10 + y} width="2" height="3" fill="var(--ink)" />
    </>
  );
}

// Tiny four-point sparkle for celebratory states.
export function Sparkle({ x, y, size = 1, className = "" }: { x: number; y: number; size?: number; className?: string }) {
  return (
    // Position on the group: the pulse animation's CSS transform would replace a transform on the path itself.
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path className={`sparkle ${className}`} fill="currentColor"
        d="M0 -3 C0.4 -0.8 0.8 -0.4 3 0 C0.8 0.4 0.4 0.8 0 3 C-0.4 0.8 -0.8 0.4 -3 0 C-0.8 -0.4 -0.4 -0.8 0 -3 Z" />
    </g>
  );
}
