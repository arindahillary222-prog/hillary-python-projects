# HILLGRAM

HILLGRAM is a cinematic social video studio for turning narration scripts into vertical MP4 Heels with voice, live Pexels visuals, subtitles, and fast FFmpeg rendering.

It also includes HILLGRAM Science Scroll, a login-gated scientific Heel feed that learns from each user's interests, likes, favourites, follows, saves, and "less like this" choices.

## Included Features

- Script-to-video creator with fast FFmpeg rendering and MoviePy fallback.
- Warm British Ryan and clear British Thomas narration voices through Edge TTS.
- Live Pexels stock-video search, optional OpenAI scene planning, and optional Fal.ai generation.
- Clean MP4 and captioned MP4 masters, editable caption blocks, and downloadable SRT captions.
- Natural-length video assembly up to 15 minutes, with audio, subtitles, and downloads.
- Science Scroll, Heels, camera capture, shares, favourites, followers, following, and private-profile follow approval.
- Local accounts with salted PBKDF2 password hashes, lockout protection, session expiry, and password-change session revocation.
- Personalisation and watch-history controls, content reporting, action rate limits, and rotating local vault backups.
- PWA manifest, service worker, install controls, responsive layout, light/dark theme, and multilingual interface controls.

## Run Locally

```powershell
cd C:\Users\arind\Documents\book\ai_automation_video_engine
.\.venv\Scripts\python.exe -m streamlit run app.py --server.port 8501 --server.headless true --browser.gatherUsageStats false
```

Or double-click:

```text
START_HILLGRAM.bat
```

For a temporary public HTTPS link that works in Safari and outside the local Wi-Fi, double-click:

```text
START_HILLGRAM_PUBLIC.bat
```

The launcher copies the generated `https://...trycloudflare.com` link, saves it in `PUBLIC_HILLGRAM_LINK.txt`, and opens it on the computer. Keep the launcher and computer running while the public link is in use. The free Quick Tunnel address changes after a restart and is intended for previews, not permanent production hosting.

## Install

- Windows: run `INSTALL_HILLGRAM_DESKTOP.bat` to create a desktop shortcut.
- iPhone or iPad: open the hosted HILLGRAM URL in Safari, tap **Share**, tap **Add to Home Screen**, then tap **Add**.
- Android: open the hosted HILLGRAM URL in Chrome, tap the three-dot menu, choose **Install app** or **Add to Home screen**, then confirm.
- Windows or Mac: open the hosted HILLGRAM URL in Chrome or Edge and use the install icon in the address bar. In Safari on macOS, choose **File > Add to Dock**.
- Local browser: open `http://localhost:8501/`.
- Phone on the same Wi-Fi: open `http://YOUR-COMPUTER-IP:8501/`. The launcher prints the current phone link when HILLGRAM starts.

`localhost` and `127.0.0.1` always refer to the device currently opening the link, so those addresses cannot be used from a phone. The computer must remain awake with HILLGRAM running, and both devices must be connected to the same Wi-Fi network.

## Required Keys

Add keys in `.env`:

```env
PEXELS_API_KEY=
OPENAI_API_KEY=
FAL_KEY=
```

Pexels is enough for the free live-stock-video workflow. OpenAI and Fal.ai are optional.

For Streamlit Community Cloud, add these same names in the app's protected **Secrets** settings instead of committing a `.env` file. HILLGRAM reads both local `.env` values and hosted Streamlit secrets.

## Local Vault

HILLGRAM stores account data, science-feed preferences, saved Heels, favourites, camera shots, followers/following, and render history in:

```text
data/hillgram_vault.json
```

Passwords are stored as salted PBKDF2 hashes, not plain text. The `data/` folder is git-ignored.

Rotating local backups are stored in `data/backups/`. Account deletion also removes the user's records from those backups. Backups are local JSON snapshots and are not encrypted cloud backups.

## Captions

The Caption Studio keeps a clean master and lets the user add, replace, or remove burned-in captions at any time. It can export:

- `final_output_clean.mp4`
- `final_output_captioned.mp4`
- `hillgram_captions.srt`

## Long Videos

Use **Maximum video length in minutes** to cap long content at up to 15 minutes. This is not a target: shorter scripts end naturally. HILLGRAM never repeats scenes, narration, or a short stock clip to fill unused time; if a visual ends before its narration, its final frame is held briefly instead of replaying.

## Verification

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m py_compile app.py tests\test_account_security.py tests\test_caption_workflow.py
.\.venv\Scripts\python.exe -m pip check
```

The Streamlit health endpoint is `http://localhost:8501/_stcore/health` while the local server is running.

## Production Boundary

The current build is a working local beta. Its JSON vault, local authentication, local backups, and local media files are appropriate for one computer, not a multi-user public service. A globally competitive public release still requires a hosted database and object storage, production email verification and password recovery, server-side rendering workers, privacy/legal operations, public HTTPS hosting, monitoring, abuse moderation operations, and real device/app-store testing. OpenAI and Fal.ai features also require valid provider keys and billing where applicable.
