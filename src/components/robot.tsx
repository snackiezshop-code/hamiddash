// The pixel robot mascot, drawn on a 24×24 grid. Animation classes live in globals.css.
export type RobotEyes = "open" | "sleepy" | "hearts";

const HEART = "M0 1.4 L-1.5 0 A0.85 0.85 0 0 1 0 -1.2 A0.85 0.85 0 0 1 1.5 0 Z";

export function RobotSvg({ className = "", eyes = "open", cup = false }: { className?: string; eyes?: RobotEyes; cup?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="7" y="18" width="3" height="4" fill="var(--robot-dark)" />
      <rect x="14" y="18" width="3" height="4" fill="var(--robot-dark)" />
      <rect className="arm left" x="2" y="11" width="4" height="3" fill="var(--robot)" />
      <rect className="arm right" x="18" y="11" width="4" height="3" fill="var(--robot)" />
      <rect x="6" y="6" width="12" height="12" rx="1" fill="var(--robot)" />
      {eyes === "hearts" ? (
        <>
          <path d={HEART} transform="translate(10 11.6) scale(1.3)" fill="var(--color-flag)" />
          <path d={HEART} transform="translate(14 11.6) scale(1.3)" fill="var(--color-flag)" />
        </>
      ) : eyes === "sleepy" ? (
        <>
          <rect x="9" y="12" width="2" height="1" fill="var(--ink)" />
          <rect x="13" y="12" width="2" height="1" fill="var(--ink)" />
        </>
      ) : (
        <>
          <rect className="eye" x="9" y="10" width="2" height="3" fill="var(--ink)" />
          <rect className="eye right" x="13" y="10" width="2" height="3" fill="var(--ink)" />
        </>
      )}
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
