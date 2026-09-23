import type { MetadataRoute } from "next";

// Lets the dashboard be added to the iPhone home screen, which iOS requires before it allows web push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hamid · Kost Mujair 12",
    short_name: "Hamid",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E5",
    theme_color: "#17140f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
