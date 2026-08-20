import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arawee/Mayeku-Sportz",
    short_name: "AMS Terminal",
    description: "Evidence-led football intelligence and decision support.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
