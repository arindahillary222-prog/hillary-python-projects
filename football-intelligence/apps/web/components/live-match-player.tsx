"use client";

import { useEffect, useRef, useState } from "react";
import { type LiveVideoSource } from "./live-video-provider";
import { SportzfyIntegration } from "./sportzfy-integration";

type PlayerState = "READY" | "LOADING" | "PLAYING" | "PAUSED" | "BUFFERING" | "ERROR";

export function LiveMatchPlayer({ source }: { source: LiveVideoSource }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PlayerState>(source.video_url || source.embed_url ? "READY" : "ERROR");
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [mini, setMini] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const hasInlineVideo = Boolean(source.video_url);
  const hasEmbed = Boolean(source.embed_url);

  useEffect(() => {
    setState(hasInlineVideo || hasEmbed ? "READY" : "ERROR");
    setMini(false);
  }, [hasEmbed, hasInlineVideo, source.fixture_id]);

  useEffect(() => setPipSupported(Boolean(document.pictureInPictureEnabled)), []);

  useEffect(() => {
    if (!hasInlineVideo || !anchorRef.current || !window.matchMedia("(max-width: 640px)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setMini(!entry.isIntersecting && window.scrollY > 0), { threshold: 0.2 });
    observer.observe(anchorRef.current);
    return () => observer.disconnect();
  }, [hasInlineVideo]);

  function playOrPause() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setState("LOADING");
      void video.play().catch(() => setState("ERROR"));
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  }

  async function fullscreen() {
    const element = videoRef.current;
    if (element?.requestFullscreen) await element.requestFullscreen().catch(() => undefined);
  }

  async function pictureInPicture() {
    const video = videoRef.current;
    if (video && document.pictureInPictureEnabled && video.requestPictureInPicture) await video.requestPictureInPicture().catch(() => undefined);
  }

  return <section className="live-match-player" aria-label="Live match player">
    <div className="player-status-row"><span className={`live-status ${source.status === "LIVE" ? "live" : "unavailable"}`}>{source.status === "LIVE" ? "VIDEO LIVE" : "VIDEO OFFLINE"}</span><span>{source.provider_name} · {state}</span></div>
    <div className={`live-player-anchor ${mini ? "mini" : ""}`} ref={anchorRef}>
      <div className="live-player-stage">
        {hasInlineVideo ? <video ref={videoRef} src={source.video_url} muted={muted} playsInline onLoadStart={() => setState("LOADING")} onPlaying={() => setState("PLAYING")} onPause={() => setState("PAUSED")} onWaiting={() => setState("BUFFERING")} onError={() => setState("ERROR")} /> : null}
        {hasEmbed ? <iframe src={source.embed_url} title={`${source.provider_name} viewing source`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : null}
        {!hasInlineVideo && !hasEmbed ? <div className="player-empty"><strong>IN-APP VIDEO SOURCE NOT CONFIGURED</strong><span>Live football intelligence remains available below.</span></div> : null}
      </div>
      {hasInlineVideo ? <div className="player-controls"><button type="button" onClick={playOrPause}>{state === "PLAYING" ? "Pause" : "Play"}</button><button type="button" onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button><label>Volume<input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} /></label><button type="button" onClick={() => void fullscreen()}>Full screen</button>{pipSupported ? <button type="button" onClick={() => void pictureInPicture()}>PiP</button> : null}</div> : null}
    </div>
    {state === "ERROR" && (hasInlineVideo || hasEmbed) ? <p className="player-error">VIDEO UNAVAILABLE. Score, statistics, odds, bet tracking and AI continue independently.</p> : null}
    <p className="player-notice">{source.notice}</p>
    <SportzfyIntegration compact />
  </section>;
}
