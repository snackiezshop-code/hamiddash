import { ImageResponse } from "next/og";

// The HamidKost app icon (option B) as a PNG: the HK card with an orange block, on the cream page
// colour. iPhone home screens ignore SVG icons, so these PNGs back icon.svg. The art fills the
// square; iOS rounds the corners itself.
export function hkIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", background: "#ECE7DD" }}>
        <svg width={size} height={size} viewBox="0 0 132 132">
          <rect x="22" y="22" width="98" height="98" rx="9" fill="#14171C" />
          <rect x="14" y="14" width="98" height="98" rx="9" fill="#FAF8F3" stroke="#14171C" strokeWidth="4" />
          <rect x="84" y="24" width="17" height="17" fill="#D9390F" stroke="#14171C" strokeWidth="3" />
          <path d="M33 48h10v18h17V48h10v45H60V75H43v18H33zM76 48h10v19l16-19h12L96 69l19 24h-12L89 75l-3 3v15H76z" fill="#14171C" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
