import type { Metadata, Viewport } from "next";
import { PwaRegister } from "../components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arawee/Mayeku-Sportz",
  description: "A live financial terminal for evidence-led football intelligence.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AMS Terminal",
  },
};

export const viewport: Viewport = { themeColor: "#070b14", colorScheme: "dark light", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen"><PwaRegister />{children}</body></html>;
}
