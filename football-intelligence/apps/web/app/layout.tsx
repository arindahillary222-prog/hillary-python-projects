import type { Metadata, Viewport } from "next";
import { PwaRegister } from "../components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Intelligence",
  description: "Evidence-led football probability and value analysis.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#09111f", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen"><PwaRegister />{children}</body></html>;
}
