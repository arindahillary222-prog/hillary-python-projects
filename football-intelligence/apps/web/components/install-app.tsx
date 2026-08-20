"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const rememberPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const rememberInstall = () => {
      setInstalled(true);
      setOpen(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", rememberPrompt);
    window.addEventListener("appinstalled", rememberInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", rememberPrompt);
      window.removeEventListener("appinstalled", rememberInstall);
    };
  }, []);

  async function installOrExplain() {
    if (!deferredPrompt) {
      setOpen(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome !== "accepted") setOpen(true);
  }

  if (installed) return null;

  return <>
    <button className="install-trigger" type="button" onClick={installOrExplain}>Install app</button>
    {open ? <div className="install-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="install-close" type="button" aria-label="Close installation instructions" onClick={() => setOpen(false)}>×</button>
        <h2 id="install-title">Install the AMS Terminal</h2>
        <p>It installs as a full-screen app, with no app-store account or download file required.</p>
        <p className="install-platform">iPhone or iPad</p>
        <ol className="install-steps">
          <li>Open this link in <strong>Safari</strong>, not the WhatsApp or Facebook in-app browser.</li>
          <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
        </ol>
        <p className="install-platform">Android phone or tablet</p>
        <ol className="install-steps">
          <li>Open this link in <strong>Chrome</strong>.</li>
          <li>Use the browser menu (⋮) and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li>Confirm once. The AMS icon will appear on your home screen.</li>
        </ol>
        <p className="install-note">This public release is a demo/shadow terminal. It does not connect to bookmakers or place wagers.</p>
      </section>
    </div> : null}
  </>;
}
