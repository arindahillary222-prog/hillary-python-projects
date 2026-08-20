import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Football Intelligence",
    short_name: "Football IQ",
    description: "Evidence-led football decision support.",
    start_url: "/",
    display: "standalone",
    background_color: "#09111f",
    theme_color: "#09111f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

