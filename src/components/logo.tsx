// Pixel "H" for Hamid, the family house. Each block is a brick of the rumah induk; the gold block
// set apart at the top left stands for the late grandparents, whose house keeps working for the
// heirs. Drawn on a pixel grid to match the robot mascot.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="12 12 76 76" className={className} aria-hidden>
      <rect x="15" y="15" width="14" height="14" rx="2.5" fill="#E2A24E" />
      <g fill="#A0533D">
        <rect x="15" y="43" width="14" height="42" rx="2.5" />
        <rect x="22" y="43" width="56" height="14" />
        <rect x="71" y="15" width="14" height="70" rx="2.5" />
      </g>
    </svg>
  );
}
