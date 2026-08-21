"use client";

import { useEffect, useState } from "react";
import { publicConfig, isAndroidDevice } from "./runtime-config";

export function SportzfyIntegration({ compact = false }: { compact?: boolean }) {
  const [android, setAndroid] = useState(false);

  useEffect(() => setAndroid(isAndroidDevice()), []);

  if (!publicConfig.sportzfy.enabled) return null;
  if (android) {
    return <section className={`sportzfy-integration ${compact ? "compact" : ""}`} aria-label="Sportzfy Android integration">
      <div><p className="eyebrow">ANDROID VIEWING OPTION</p><strong>SPORTZFY</strong><p>Need the Android viewing app? Arawee/Mayeku-Sportz remains a separate installable PWA.</p></div>
      <a href={publicConfig.sportzfy.downloadUrl} target="_blank" rel="noreferrer">GET SPORTZFY FOR ANDROID</a>
    </section>;
  }
  return <section className={`sportzfy-integration ${compact ? "compact" : ""}`} aria-label="Sportzfy Android integration">
    <div><p className="eyebrow">ANDROID VIEWING OPTION</p><strong>Sportzfy</strong><p>Available through an Android device. This app does not offer an APK install on this device.</p></div>
  </section>;
}
