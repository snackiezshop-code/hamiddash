import type { MetadataRoute } from "next";

// Lets the dashboard be added to the iPhone home screen, which iOS requires before it allows web push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HamidKost · Kost Mujair 12",
    short_name: "HamidKost",
    start_url: "/",
    display: "standalone",
    background_color: "#ECE7DD",
    theme_color: "#ECE7DD",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
