import asyncio
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
from typing import Any
from urllib.parse import quote, urlencode

import edge_tts
import numpy as np
import requests
import streamlit as st
from dotenv import load_dotenv
from imageio_ffmpeg import get_ffmpeg_exe
from moviepy.editor import (
    AudioFileClip,
    AudioClip,
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
    VideoFileClip,
    concatenate_videoclips,
)
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field, ValidationError


if not hasattr(Image, "ANTIALIAS"):
    Image.ANTIALIAS = Image.Resampling.LANCZOS


BASE_DIR = Path(__file__).resolve().parent
ASSET_DIR = BASE_DIR / "temp_assets"
FINAL_OUTPUT = ASSET_DIR / "final_output.mp4"
CLEAN_OUTPUT = ASSET_DIR / "final_output_clean.mp4"
CAPTIONED_OUTPUT = ASSET_DIR / "final_output_captioned.mp4"
CAPTION_SRT = ASSET_DIR / "hillgram_captions.srt"
CAPTION_PROJECT = ASSET_DIR / "caption_project.json"
DATA_DIR = BASE_DIR / "data"
VAULT_PATH = DATA_DIR / "hillgram_vault.json"
BACKUP_DIR = DATA_DIR / "backups"
APP_NAME = "HILLGRAM"
APP_TAGLINE = "Cinematic social video studio"
APP_AUTHOR = "Hillary"
TARGET_SIZE = (720, 1280)
PLACEHOLDER_MARKERS = ("PASTE_YOUR", "YOUR_", "_HERE", "...")
MAX_SCENE_WORDS = 38
MAX_RENDER_MINUTES = 15
PASSWORD_MIN_LENGTH = 10
PASSWORD_HASH_ITERATIONS = 320_000
LEGACY_PASSWORD_HASH_ITERATIONS = 220_000
MAX_FAILED_LOGIN_ATTEMPTS = 5
ACCOUNT_LOCK_MINUTES = 15
SESSION_IDLE_MINUTES = 60
SESSION_MAX_HOURS = 12
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
VAULT_LOCK = RLock()
VOICE_OPTIONS = {
    "British male - Ryan (warm natural)": "en-GB-RyanNeural",
    "British male - Thomas (clear natural)": "en-GB-ThomasNeural",
    "US male - Christopher": "en-US-ChristopherNeural",
    "US male - Guy": "en-US-GuyNeural",
}
RENDER_PROFILES = {
    "Fast HD 720x1280": (720, 1280),
    "Full HD 1080x1920": (1080, 1920),
}
SCIENCE_TOPICS = [
    "space science documentary",
    "quantum physics animation",
    "robotics artificial intelligence",
    "microscope biology cells",
    "ocean science documentary",
    "climate science earth",
    "neuroscience brain research",
    "chemistry laboratory experiment",
    "engineering technology innovation",
    "astronomy telescope galaxy",
    "medical science research",
    "volcano geology earth science",
]

load_dotenv(BASE_DIR / ".env", override=False)

# Streamlit Community Cloud exposes protected root-level secrets through
# st.secrets. Mirror only the keys HILLGRAM uses into the existing environment
# interface so local .env files and hosted secrets follow the same code path.
for _secret_name in ("OPENAI_API_KEY", "PEXELS_API_KEY", "FAL_KEY"):
    if os.getenv(_secret_name, "").strip():
        continue
    try:
        _secret_value = str(st.secrets.get(_secret_name, "")).strip()
    except Exception:
        _secret_value = ""
    if _secret_value:
        os.environ[_secret_name] = _secret_value


class Scene(BaseModel):
    narration: str = Field(min_length=1)
    prompt: str = Field(min_length=1)


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value or is_placeholder_value(value):
        raise RuntimeError(f"Missing {name}. Add it to your .env file.")
    return value


def is_placeholder_value(value: str) -> bool:
    return not value or any(marker in value for marker in PLACEHOLDER_MARKERS)


def has_real_env(name: str) -> bool:
    return not is_placeholder_value(os.getenv(name, "").strip())


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_vault() -> dict[str, Any]:
    with VAULT_LOCK:
        DATA_DIR.mkdir(exist_ok=True)
        if not VAULT_PATH.exists():
            return {"version": "1.0.0", "users": {}, "reports": []}
        try:
            data = json.loads(VAULT_PATH.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return {"version": "1.0.0", "users": {}, "reports": []}
            data.setdefault("version", "1.0.0")
            data.setdefault("users", {})
            data.setdefault("reports", [])
            return data
        except (json.JSONDecodeError, OSError):
            return {"version": "1.0.0", "users": {}, "reports": []}


def create_vault_backup(force: bool = False) -> Path | None:
    if not VAULT_PATH.exists():
        return None
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        existing = sorted(BACKUP_DIR.glob("hillgram_vault_*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not force and existing and datetime.now(timezone.utc).timestamp() - existing[0].stat().st_mtime < 3600:
            return None
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup_path = BACKUP_DIR / f"hillgram_vault_{stamp}.json"
        shutil.copy2(VAULT_PATH, backup_path)
        for stale_backup in existing[23:]:
            stale_backup.unlink(missing_ok=True)
        return backup_path
    except OSError:
        return None


def purge_user_from_backups(username: str) -> None:
    username = normalize_username(username)
    if not username or not BACKUP_DIR.exists():
        return
    for backup_path in BACKUP_DIR.glob("hillgram_vault_*.json"):
        try:
            data = json.loads(backup_path.read_text(encoding="utf-8"))
            users = data.get("users", {}) if isinstance(data, dict) else {}
            users.pop(username, None)
            for record in users.values():
                if not isinstance(record, dict):
                    continue
                for relationship in ("followers", "following", "follow_requests"):
                    record[relationship] = [
                        name for name in record.get(relationship, []) if name != username
                    ]
            reports = data.get("reports", []) if isinstance(data, dict) else []
            data["reports"] = [report for report in reports if report.get("reporter") != username]
            backup_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except (OSError, json.JSONDecodeError, AttributeError):
            continue


def save_vault(data: dict[str, Any]) -> None:
    with VAULT_LOCK:
        DATA_DIR.mkdir(exist_ok=True)
        create_vault_backup()
        temporary_path = VAULT_PATH.with_name(f".{VAULT_PATH.name}.{secrets.token_hex(4)}.tmp")
        try:
            with temporary_path.open("w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, VAULT_PATH)
        finally:
            if temporary_path.exists():
                temporary_path.unlink()


def normalize_username(username: str) -> str:
    return re.sub(r"[^a-z0-9_.-]", "", username.strip().lower())


def normalize_email(email: str) -> str:
    return email.strip().lower()


def parse_utc_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def hash_password(password: str, salt: str, iterations: int = PASSWORD_HASH_ITERATIONS) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    )
    return digest.hex()


def password_hash_matches(password: str, record: dict[str, Any]) -> tuple[bool, int | None]:
    salt = record.get("salt", "")
    expected = record.get("password_hash", "")
    if not salt or not expected:
        return False, None

    try:
        stored_iterations = int(record.get("password_iterations") or LEGACY_PASSWORD_HASH_ITERATIONS)
    except (TypeError, ValueError):
        stored_iterations = LEGACY_PASSWORD_HASH_ITERATIONS

    candidates = [stored_iterations]
    if LEGACY_PASSWORD_HASH_ITERATIONS not in candidates:
        candidates.append(LEGACY_PASSWORD_HASH_ITERATIONS)

    for iterations in candidates:
        actual = hash_password(password, salt, iterations)
        if hmac.compare_digest(expected, actual):
            return True, iterations
    return False, None


def validate_password_strength(username: str, email: str, password: str, confirm_password: str) -> str | None:
    lower = password.lower()
    issues: list[str] = []
    if password != confirm_password:
        issues.append("both password boxes must match")
    if len(password) < PASSWORD_MIN_LENGTH:
        issues.append(f"at least {PASSWORD_MIN_LENGTH} characters")
    if not re.search(r"[a-z]", password):
        issues.append("one lowercase letter")
    if not re.search(r"[A-Z]", password):
        issues.append("one uppercase letter")
    if not re.search(r"\d", password):
        issues.append("one number")
    if not re.search(r"[^A-Za-z0-9]", password):
        issues.append("one symbol")
    if username and len(username) >= 3 and username in lower:
        issues.append("do not include your username")
    email_name = email.split("@", 1)[0]
    if email_name and len(email_name) >= 3 and email_name in lower:
        issues.append("do not include your email name")
    if lower in {"password", "password123", "hillgram123", "1234567890", "qwerty12345"}:
        issues.append("avoid common passwords")
    if not issues:
        return None
    return "Password needs " + ", ".join(issues) + "."


def create_hillgram_user(
    username: str,
    email: str,
    password: str,
    confirm_password: str,
    interests: list[str],
) -> tuple[bool, str]:
    raw_username = username.strip()
    username = normalize_username(username)
    if len(username) < 3:
        return False, "Use at least 3 letters for the username."
    if raw_username.lower() != username:
        return False, "Use only letters, numbers, dots, hyphens, or underscores in the username."

    email = normalize_email(email)
    if not EMAIL_RE.match(email):
        return False, "Enter a valid email address."

    password_message = validate_password_strength(username, email, password, confirm_password)
    if password_message:
        return False, password_message

    vault = load_vault()
    if username in vault["users"]:
        return False, "That username already exists."
    if any(normalize_email(user.get("email", "")) == email for user in vault["users"].values()):
        return False, "That email is already connected to a HILLGRAM account."

    salt = secrets.token_hex(16)
    vault["users"][username] = {
        "salt": salt,
        "password_hash": hash_password(password, salt),
        "password_iterations": PASSWORD_HASH_ITERATIONS,
        "email": email,
        "email_verified": False,
        "created_at": utc_now(),
        "interests": interests or SCIENCE_TOPICS[:4],
        "topic_scores": {},
        "saved_videos": [],
        "favourite_videos": [],
        "liked_videos": [],
        "followers": [],
        "following": [],
        "follow_requests": [],
        "camera_shots": [],
        "watch_history": [],
        "render_history": [],
        "settings": {
            "profile_name": username,
            "bio": "HILLGRAM creator",
            "default_share_caption": "Made with HILLGRAM",
            "camera_mode": "Heel cover",
            "private_profile": False,
            "personalized_feed": True,
            "save_watch_history": True,
        },
        "security": {
            "account_status": "active",
            "session_version": 1,
            "failed_login_count": 0,
            "locked_until": "",
            "last_login_at": "",
            "last_failed_login_at": "",
            "password_updated_at": utc_now(),
        },
    }
    save_vault(vault)
    return True, username


def verify_hillgram_user(username: str, password: str) -> bool:
    username = normalize_username(username)
    vault = load_vault()
    user = vault["users"].get(username)
    if not user:
        return False
    user = ensure_user_defaults(username, user)
    return password_hash_matches(password, user)[0]


def authenticate_hillgram_user(username: str, password: str) -> tuple[bool, str]:
    username = normalize_username(username)
    vault = load_vault()
    user = vault["users"].get(username)
    if not user:
        return False, "Wrong username or password."

    user = ensure_user_defaults(username, user)
    security = user.setdefault("security", {})
    if security.get("account_status") != "active":
        return False, "This account is not active."

    now = datetime.now(timezone.utc)
    locked_until = parse_utc_datetime(security.get("locked_until"))
    if locked_until and locked_until > now:
        minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        vault["users"][username] = user
        save_vault(vault)
        return False, f"Account is temporarily locked. Try again in about {minutes} minute(s)."
    if locked_until and locked_until <= now:
        security["failed_login_count"] = 0
        security["locked_until"] = ""

    matched, used_iterations = password_hash_matches(password, user)
    if matched:
        security["failed_login_count"] = 0
        security["locked_until"] = ""
        security["last_login_at"] = utc_now()
        if used_iterations != PASSWORD_HASH_ITERATIONS:
            salt = secrets.token_hex(16)
            user["salt"] = salt
            user["password_hash"] = hash_password(password, salt)
            user["password_iterations"] = PASSWORD_HASH_ITERATIONS
            security["password_updated_at"] = utc_now()
        vault["users"][username] = user
        save_vault(vault)
        return True, username

    failed_count = int(security.get("failed_login_count", 0)) + 1
    security["failed_login_count"] = failed_count
    security["last_failed_login_at"] = utc_now()
    if failed_count >= MAX_FAILED_LOGIN_ATTEMPTS:
        locked_until = now + timedelta(minutes=ACCOUNT_LOCK_MINUTES)
        security["locked_until"] = locked_until.isoformat()
        message = f"Too many failed attempts. Account locked for {ACCOUNT_LOCK_MINUTES} minutes."
    else:
        remaining = MAX_FAILED_LOGIN_ATTEMPTS - failed_count
        message = f"Wrong username or password. {remaining} attempt(s) left before a temporary lock."
    vault["users"][username] = user
    save_vault(vault)
    return False, message


def change_hillgram_password(
    username: str,
    current_password: str,
    new_password: str,
    confirm_password: str,
) -> tuple[bool, str]:
    username = normalize_username(username)
    vault = load_vault()
    user = vault["users"].get(username)
    if not user:
        return False, "Account not found."

    user = ensure_user_defaults(username, user)
    if not password_hash_matches(current_password, user)[0]:
        return False, "Current password is incorrect."

    message = validate_password_strength(username, normalize_email(user.get("email", "")), new_password, confirm_password)
    if message:
        return False, message

    salt = secrets.token_hex(16)
    user["salt"] = salt
    user["password_hash"] = hash_password(new_password, salt)
    user["password_iterations"] = PASSWORD_HASH_ITERATIONS
    security = user.setdefault("security", {})
    security["session_version"] = int(security.get("session_version", 1)) + 1
    security["password_updated_at"] = utc_now()
    security["failed_login_count"] = 0
    security["locked_until"] = ""
    vault["users"][username] = user
    save_vault(vault)
    return True, "Password changed securely."


def delete_hillgram_account(username: str, password: str, confirmation: str) -> tuple[bool, str]:
    username = normalize_username(username)
    if confirmation.strip() != username:
        return False, f"Type {username} exactly to confirm account deletion."

    vault = load_vault()
    user = vault["users"].get(username)
    if not user or not password_hash_matches(password, ensure_user_defaults(username, user))[0]:
        return False, "Password is incorrect. The account was not deleted."

    del vault["users"][username]
    for record in vault["users"].values():
        if not isinstance(record, dict):
            continue
        for relationship in ("followers", "following", "follow_requests"):
            record[relationship] = [name for name in record.get(relationship, []) if name != username]
    vault["reports"] = [
        report for report in vault.get("reports", []) if report.get("reporter") != username
    ]
    save_vault(vault)
    purge_user_from_backups(username)

    camera_root = (DATA_DIR / "camera_shots").resolve()
    account_camera_dir = (camera_root / username).resolve()
    if account_camera_dir.parent == camera_root and account_camera_dir.exists():
        shutil.rmtree(account_camera_dir)
    return True, "Your local HILLGRAM account and camera captures were deleted."


def clear_user_session(notice: str = "") -> None:
    for key in (
        "hillgram_user",
        "hillgram_login_at",
        "hillgram_last_activity_at",
        "hillgram_session_version",
    ):
        st.session_state.pop(key, None)
    if notice:
        st.session_state["hillgram_auth_notice"] = notice


def start_user_session(username: str) -> None:
    username = normalize_username(username)
    record = get_user_record(username) or {}
    security = record.get("security", {})
    now = utc_now()
    st.session_state["hillgram_user"] = username
    st.session_state["hillgram_login_at"] = now
    st.session_state["hillgram_last_activity_at"] = now
    st.session_state["hillgram_session_version"] = int(security.get("session_version", 1))


def get_current_username() -> str | None:
    username = st.session_state.get("hillgram_user")
    username = normalize_username(username) if username else ""
    if not username:
        return None

    now = datetime.now(timezone.utc)
    login_at = parse_utc_datetime(st.session_state.get("hillgram_login_at"))
    last_activity = parse_utc_datetime(st.session_state.get("hillgram_last_activity_at"))
    if not login_at or now - login_at > timedelta(hours=SESSION_MAX_HOURS):
        clear_user_session("Your secure session expired. Please log in again.")
        return None
    if last_activity and now - last_activity > timedelta(minutes=SESSION_IDLE_MINUTES):
        clear_user_session("You were logged out after 60 minutes of inactivity.")
        return None

    record = load_vault()["users"].get(username)
    if not record:
        clear_user_session("This account is no longer available.")
        return None
    record = ensure_user_defaults(username, record)
    security = record.get("security", {})
    current_version = int(security.get("session_version", 1))
    session_version = int(st.session_state.get("hillgram_session_version", current_version))
    if security.get("account_status") != "active" or session_version != current_version:
        clear_user_session("Your account security changed. Please log in again.")
        return None

    st.session_state["hillgram_session_version"] = current_version
    st.session_state["hillgram_last_activity_at"] = utc_now()
    return username


def get_user_record(username: str | None = None) -> dict[str, Any] | None:
    username = normalize_username(username or get_current_username() or "")
    if not username:
        return None
    record = load_vault()["users"].get(username)
    if record is not None:
        record = ensure_user_defaults(username, record)
    return record


def save_user_record(username: str, record: dict[str, Any]) -> None:
    username = normalize_username(username)
    vault = load_vault()
    vault["users"][username] = ensure_user_defaults(username, record)
    save_vault(vault)


def ensure_user_defaults(username: str, record: dict[str, Any]) -> dict[str, Any]:
    record.setdefault("email", "")
    record.setdefault("email_verified", False)
    if record.get("password_hash") and "password_iterations" not in record:
        record["password_iterations"] = LEGACY_PASSWORD_HASH_ITERATIONS
    record.setdefault("interests", SCIENCE_TOPICS[:4])
    record.setdefault("topic_scores", {})
    record.setdefault("saved_videos", [])
    record.setdefault("favourite_videos", [])
    record.setdefault("liked_videos", [])
    record.setdefault("followers", [])
    record.setdefault("following", [])
    record.setdefault("follow_requests", [])
    record.setdefault("camera_shots", [])
    record.setdefault("watch_history", [])
    record.setdefault("render_history", [])
    settings = record.setdefault("settings", {})
    settings.setdefault("profile_name", username)
    settings.setdefault("bio", "HILLGRAM creator")
    settings.setdefault("default_share_caption", "Made with HILLGRAM")
    settings.setdefault("camera_mode", "Heel cover")
    settings.setdefault("private_profile", False)
    settings.setdefault("personalized_feed", True)
    settings.setdefault("save_watch_history", True)
    security = record.setdefault("security", {})
    security.setdefault("account_status", "active")
    security.setdefault("session_version", 1)
    security.setdefault("failed_login_count", 0)
    security.setdefault("locked_until", "")
    security.setdefault("last_login_at", "")
    security.setdefault("last_failed_login_at", "")
    security.setdefault("password_updated_at", record.get("created_at", utc_now()))
    return record


def record_topic_signal(username: str, topic: str, amount: int) -> None:
    record = get_user_record(username)
    if not record:
        return
    scores = record.setdefault("topic_scores", {})
    scores[topic] = max(-5, min(25, int(scores.get(topic, 0)) + amount))
    save_user_record(username, record)


def consume_session_rate_limit(action: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    now = datetime.now(timezone.utc).timestamp()
    rate_limits = st.session_state.setdefault("hillgram_rate_limits", {})
    recent = [
        float(timestamp)
        for timestamp in rate_limits.get(action, [])
        if now - float(timestamp) < window_seconds
    ]
    if len(recent) >= limit:
        wait_seconds = max(1, int(window_seconds - (now - min(recent))))
        rate_limits[action] = recent
        return False, wait_seconds
    recent.append(now)
    rate_limits[action] = recent
    return True, 0


def record_content_report(username: str, item: dict[str, Any], reason: str, details: str = "") -> tuple[bool, str]:
    username = normalize_username(username)
    item_id = str(item.get("id", "")).strip()
    allowed_reasons = {"Misinformation", "Unsafe content", "Spam", "Copyright", "Other"}
    if not username or not item_id or reason not in allowed_reasons:
        return False, "Choose a valid report reason."
    vault = load_vault()
    reports = vault.setdefault("reports", [])
    if any(report.get("reporter") == username and report.get("item_id") == item_id for report in reports):
        return False, "You already reported this Heel."
    reports.append(
        {
            "id": secrets.token_hex(12),
            "reporter": username,
            "item_id": item_id,
            "source_url": str(item.get("source_url", ""))[:800],
            "topic": str(item.get("topic", ""))[:160],
            "reason": reason,
            "details": details.strip()[:500],
            "status": "open",
            "created_at": utc_now(),
        }
    )
    vault["reports"] = reports[-2000:]
    save_vault(vault)
    return True, "Report saved for review."


def make_share_links(title: str, url: str, caption: str = "") -> dict[str, str]:
    text = f"{title} {url}".strip()
    if caption:
        text = f"{caption}\n{text}"
    encoded_text = quote(text)
    encoded_subject = quote(title)
    encoded_body = quote(text)
    return {
        "whatsapp": f"https://wa.me/?text={encoded_text}",
        "email": f"mailto:?subject={encoded_subject}&body={encoded_body}",
    }


def follow_user(follower: str, target: str) -> tuple[bool, str]:
    follower = normalize_username(follower)
    target = normalize_username(target)
    if not follower or not target or follower == target:
        return False, "Choose another creator to follow."
    vault = load_vault()
    users = vault.get("users", {})
    if follower not in users or target not in users:
        return False, "That HILLGRAM account was not found."
    follower_record = ensure_user_defaults(follower, users[follower])
    target_record = ensure_user_defaults(target, users[target])
    if target in follower_record["following"]:
        return True, f"You already follow @{target}."
    if target_record.get("settings", {}).get("private_profile", False):
        requests = target_record.setdefault("follow_requests", [])
        if follower not in requests:
            requests.append(follower)
        users[target] = target_record
        save_vault(vault)
        return True, f"Follow request sent to @{target}."
    if target not in follower_record["following"]:
        follower_record["following"].append(target)
    if follower not in target_record["followers"]:
        target_record["followers"].append(follower)
    users[follower] = follower_record
    users[target] = target_record
    save_vault(vault)
    return True, f"You now follow @{target}."


def unfollow_user(follower: str, target: str) -> tuple[bool, str]:
    follower = normalize_username(follower)
    target = normalize_username(target)
    vault = load_vault()
    users = vault.get("users", {})
    if follower not in users or target not in users:
        return False, "That HILLGRAM account was not found."
    follower_record = ensure_user_defaults(follower, users[follower])
    target_record = ensure_user_defaults(target, users[target])
    follower_record["following"] = [name for name in follower_record["following"] if name != target]
    target_record["followers"] = [name for name in target_record["followers"] if name != follower]
    users[follower] = follower_record
    users[target] = target_record
    save_vault(vault)
    return True, f"You unfollowed @{target}."


def respond_to_follow_request(username: str, requester: str, accept: bool) -> tuple[bool, str]:
    username = normalize_username(username)
    requester = normalize_username(requester)
    vault = load_vault()
    users = vault.get("users", {})
    if username not in users or requester not in users:
        return False, "That HILLGRAM account was not found."
    target_record = ensure_user_defaults(username, users[username])
    requester_record = ensure_user_defaults(requester, users[requester])
    if requester not in target_record.get("follow_requests", []):
        return False, "That follow request is no longer available."

    target_record["follow_requests"] = [name for name in target_record["follow_requests"] if name != requester]
    if accept:
        if requester not in target_record["followers"]:
            target_record["followers"].append(requester)
        if username not in requester_record["following"]:
            requester_record["following"].append(username)
    users[username] = target_record
    users[requester] = requester_record
    save_vault(vault)
    action = "accepted" if accept else "declined"
    return True, f"Follow request from @{requester} {action}."


def save_camera_capture(username: str, uploaded_file: Any, mode: str) -> dict[str, Any]:
    username = normalize_username(username)
    camera_dir = DATA_DIR / "camera_shots" / username
    camera_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    file_path = camera_dir / f"{stamp}_{secrets.token_hex(4)}.jpg"
    file_path.write_bytes(uploaded_file.getvalue())
    shot = {
        "mode": mode,
        "created_at": utc_now(),
        "file": str(file_path),
        "caption": f"{mode} captured in HILLGRAM",
    }
    record = get_user_record(username) or {}
    record.setdefault("camera_shots", []).append(shot)
    save_user_record(username, record)
    return shot


def weighted_science_topic(user: dict[str, Any] | None) -> str:
    if not (user or {}).get("settings", {}).get("personalized_feed", True):
        return random.choice(SCIENCE_TOPICS)
    interests = set((user or {}).get("interests", []))
    scores = (user or {}).get("topic_scores", {})
    weighted: list[str] = []
    for topic in SCIENCE_TOPICS:
        weight = 1
        if topic in interests:
            weight += 5
        weight += max(0, int(scores.get(topic, 0)))
        weighted.extend([topic] * max(1, weight))
    return random.choice(weighted)


def parse_scene_payload(payload: Any) -> list[Scene]:
    if isinstance(payload, list):
        raw_scenes = payload
    elif isinstance(payload, dict):
        raw_scenes = payload.get("scenes") or payload.get("array") or payload.get("items") or []
    else:
        raw_scenes = []

    if not raw_scenes:
        raise ValueError("The AI did not return any scenes.")

    return [Scene.model_validate(scene) for scene in raw_scenes]


def parse_script_with_llm(script_text: str) -> list[Scene]:
    client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
    prompt = f"""
Deconstruct the provided video script into concise chronological narrative scene blocks.
Return only JSON in this shape:
{{
  "scenes": [
    {{
      "narration": "spoken text for this scene, roughly 4-6 seconds",
      "prompt": "descriptive visual search or generation prompt"
    }}
  ]
}}

Script:
{script_text}
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}],
    )
    content = response.choices[0].message.content or "{}"
    return parse_scene_payload(json.loads(content))


def parse_script_locally(script_text: str, max_minutes: int = MAX_RENDER_MINUTES) -> list[Scene]:
    sentences = [
        sentence.strip().strip('"')
        for sentence in re.split(r"(?<=[.!?])\s+", script_text.strip())
        if sentence.strip()
    ]
    if not sentences:
        raise ValueError("Add at least one sentence before rendering.")

    scenes = []
    chunk: list[str] = []
    chunk_words = 0
    total_estimated_seconds = 0.0
    max_seconds = max_minutes * 60

    def add_scene(scene_text: str) -> None:
        nonlocal total_estimated_seconds
        estimated_seconds = estimate_scene_duration(scene_text)
        if scenes and total_estimated_seconds + estimated_seconds > max_seconds:
            return
        visual_prompt = " ".join(re.findall(r"[A-Za-z0-9'-]+", scene_text)[:12])
        scenes.append(
            Scene(
                narration=scene_text,
                prompt=visual_prompt or f"cinematic scene {len(scenes) + 1}",
            )
        )
        total_estimated_seconds += estimated_seconds

    for sentence in sentences:
        words = sentence.split()
        if chunk and chunk_words + len(words) > MAX_SCENE_WORDS:
            add_scene(" ".join(chunk))
            chunk = []
            chunk_words = 0
            if total_estimated_seconds >= max_seconds:
                break
        chunk.append(sentence)
        chunk_words += len(words)

    if chunk and total_estimated_seconds < max_seconds:
        add_scene(" ".join(chunk))

    return scenes


async def compile_voice_clip(text: str, voice: str, file_path: Path) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(file_path))


def estimate_scene_duration(text: str) -> float:
    words = max(1, len(text.split()))
    return max(3.0, words / 2.35)


def estimate_total_duration(scenes: list[Scene]) -> float:
    return sum(estimate_scene_duration(scene.narration) for scene in scenes)


def compile_silent_audio_clip(text: str, file_path: Path) -> None:
    duration = estimate_scene_duration(text)

    def make_frame(t):
        if isinstance(t, np.ndarray):
            return np.zeros((len(t), 1), dtype=float)
        return np.array([0.0])

    audio = AudioClip(make_frame, duration=duration, fps=44100)
    try:
        audio.write_audiofile(
            str(file_path),
            fps=44100,
            nbytes=2,
            codec="libmp3lame",
            logger=None,
        )
    finally:
        audio.close()


def select_pexels_video_file(files: list[dict[str, Any]]) -> dict[str, Any] | None:
    mp4_files = [item for item in files if "mp4" in str(item.get("file_type", "")).lower()]
    portrait_files = [
        item
        for item in mp4_files or files
        if item.get("height", 0) >= item.get("width", 0)
    ]
    candidates = portrait_files or mp4_files or files
    if not candidates:
        return None

    target_w, target_h = TARGET_SIZE
    fitting = [
        item
        for item in candidates
        if item.get("width", 0) >= target_w and item.get("height", 0) >= target_h
    ]
    if fitting:
        return min(fitting, key=lambda item: item.get("width", 0) * item.get("height", 0))

    return max(candidates, key=lambda item: item.get("width", 0) * item.get("height", 0))


def fetch_pexels_broll(query: str, file_path: Path) -> bool:
    headers = {"Authorization": require_env("PEXELS_API_KEY")}
    search_queries = [
        query,
        "cinematic technology",
        "cinematic city lights",
        "abstract motion background",
    ]

    last_error = ""
    for search_query in search_queries:
        params = urlencode({"query": search_query, "per_page": 3, "orientation": "portrait"})
        url = f"https://api.pexels.com/videos/search?{params}"

        try:
            response = requests.get(url, headers=headers, timeout=20)
            response.raise_for_status()
            payload = response.json()
            videos = payload.get("videos", [])
            if not videos:
                last_error = f"No Pexels results for '{search_query}'."
                continue

            for video in videos:
                selected = select_pexels_video_file(video.get("video_files", []))
                if not selected:
                    continue
                video_url = selected["link"]

                with requests.get(video_url, timeout=60, stream=True) as video_response:
                    video_response.raise_for_status()
                    with file_path.open("wb") as handle:
                        for chunk in video_response.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                handle.write(chunk)
                return True
        except Exception as exc:
            last_error = str(exc)

    raise RuntimeError(f"Pexels download failed for '{query}'. {last_error}")


def fetch_science_videos_for_topic(topic: str, page: int = 1, per_page: int = 4) -> list[dict[str, Any]]:
    headers = {"Authorization": require_env("PEXELS_API_KEY")}
    params = urlencode(
        {
            "query": topic,
            "per_page": per_page,
            "page": page,
            "orientation": "portrait",
        }
    )
    response = requests.get(f"https://api.pexels.com/videos/search?{params}", headers=headers, timeout=20)
    response.raise_for_status()
    items = []
    for video in response.json().get("videos", []):
        selected = select_pexels_video_file(video.get("video_files", []))
        if not selected:
            continue
        video_id = str(video.get("id", secrets.token_hex(4)))
        items.append(
            {
                "id": video_id,
                "topic": topic,
                "title": topic.replace(" documentary", "").replace(" animation", "").title(),
                "video_url": selected.get("link"),
                "source_url": video.get("url", ""),
                "creator": (video.get("user") or {}).get("name", "Pexels creator"),
                "width": selected.get("width", 0),
                "height": selected.get("height", 0),
            }
        )
    return items


def load_personalized_science_items(username: str, count: int = 6) -> list[dict[str, Any]]:
    user = get_user_record(username)
    if not has_real_env("PEXELS_API_KEY"):
        raise RuntimeError("Add your Pexels API key to unlock the science scroll feed.")

    items: list[dict[str, Any]] = []
    attempts = 0
    save_history = (user or {}).get("settings", {}).get("save_watch_history", True)
    seen_ids = (
        {
            item.get("id")
            for item in (user or {}).get("watch_history", [])[-80:]
            if isinstance(item, dict)
        }
        if save_history
        else set()
    )
    while len(items) < count and attempts < count * 4:
        topic = weighted_science_topic(user)
        page = random.randint(1, 12)
        for item in fetch_science_videos_for_topic(topic, page=page, per_page=3):
            if item["id"] in seen_ids:
                continue
            items.append(item)
            seen_ids.add(item["id"])
            if len(items) >= count:
                break
        attempts += 1

    return items


def generate_ai_cinematic_clip(prompt: str, file_path: Path) -> bool:
    fal_key = require_env("FAL_KEY")
    api_url = "https://fal.run/fal-ai/kling-video/v1/standard/text-to-video"
    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json",
    }
    payload = {"prompt": prompt, "aspect_ratio": "9:16"}

    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        result = response.json()
        video_url = result.get("video", {}).get("url") or result.get("video_url")
        if not video_url:
            raise RuntimeError("Fal.ai did not return a downloadable video URL.")

        video_response = requests.get(video_url, timeout=120)
        video_response.raise_for_status()
        file_path.write_bytes(video_response.content)
        return True
    except Exception as exc:
        raise RuntimeError(f"AI video generation failed for '{prompt}': {exc}") from exc


def generate_offline_demo_clip(scene: Scene, index: int, file_path: Path) -> bool:
    duration = estimate_scene_duration(scene.narration)
    palette = [
        (28, 43, 86),
        (34, 85, 96),
        (86, 54, 28),
        (67, 48, 104),
        (36, 78, 48),
        (96, 42, 62),
    ]
    base = ColorClip(size=TARGET_SIZE, color=palette[index % len(palette)]).set_duration(duration)
    title = build_text_layer(
        f"OFFLINE DEMO\n{scene.prompt}",
        font_size=66,
        width=int(TARGET_SIZE[0] * 0.82),
    ).set_duration(duration).set_position(("center", "center"))
    clip = CompositeVideoClip([base, title], size=TARGET_SIZE)
    try:
        clip.write_videofile(
            str(file_path),
            codec="libx264",
            fps=24,
            audio=False,
            preset="ultrafast",
            logger=None,
        )
        return True
    finally:
        clip.close()
        base.close()
        title.close()


def clear_previous_assets() -> None:
    ASSET_DIR.mkdir(exist_ok=True)
    for pattern in (
        "audio_*.mp3",
        "video_*.mp4",
        "clip_*.mp4",
        "subtitle_*.png",
        "concat_list.txt",
        "final_output.mp4",
        "final_output_clean.mp4",
        "final_output_captioned.mp4",
        "hillgram_captions.srt",
        "caption_project.json",
    ):
        for asset in ASSET_DIR.glob(pattern):
            asset.unlink(missing_ok=True)


def trim_scenes_to_minutes(scenes: list[Scene], max_minutes: int) -> list[Scene]:
    trimmed = []
    total_seconds = 0.0
    max_seconds = max_minutes * 60
    for scene in scenes:
        duration = estimate_scene_duration(scene.narration)
        if trimmed and total_seconds + duration > max_seconds:
            break
        trimmed.append(scene)
        total_seconds += duration
    return trimmed


def build_scene_assets(
    index: int,
    scene: Scene,
    offline_demo_mode: bool,
    visual_source: str,
    voice_actor: str,
) -> int:
    audio_path = ASSET_DIR / f"audio_{index}.mp3"
    video_path = ASSET_DIR / f"video_{index}.mp4"

    if offline_demo_mode:
        compile_silent_audio_clip(scene.narration, audio_path)
        success = generate_offline_demo_clip(scene, index, video_path)
    else:
        asyncio.run(compile_voice_clip(scene.narration, voice_actor, audio_path))
        if visual_source == "Real-Life Stock Videos (Pexels)":
            success = fetch_pexels_broll(scene.prompt, video_path)
        else:
            success = generate_ai_cinematic_clip(scene.prompt, video_path)

    if not success:
        raise RuntimeError(f"Could not create/download video for scene {index + 1}.")
    return index


def describe_rendered_video(path: Path) -> tuple[float, bool]:
    clip = VideoFileClip(str(path))
    try:
        return clip.duration, clip.audio is not None
    finally:
        clip.close()


def resize_to_vertical(clip: VideoFileClip):
    target_w, target_h = TARGET_SIZE
    resized = clip.resize(height=target_h)
    if resized.w < target_w:
        resized = clip.resize(width=target_w)

    x_center = resized.w / 2
    y_center = resized.h / 2
    return resized.crop(
        x_center=x_center,
        y_center=y_center,
        width=target_w,
        height=target_h,
    )


def fit_video_to_duration(clip: VideoFileClip, duration: float):
    visual_clip = resize_to_vertical(clip.without_audio())
    if visual_clip.duration < duration:
        freeze_at = max(0.0, visual_clip.duration - (1 / 24))
        final_frame = ImageClip(visual_clip.get_frame(freeze_at)).set_duration(
            duration - visual_clip.duration
        )
        return concatenate_videoclips([visual_clip, final_frame], method="compose").set_duration(duration)
    return visual_clip.subclip(0, duration).set_duration(duration)


def load_font(font_size: int):
    for font_name in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(font_name, font_size)
        except OSError:
            pass
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        width = draw.textbbox((0, 0), candidate, font=font, stroke_width=3)[2]
        if width <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def make_pillow_text_clip(text: str, font_size: int, width: int):
    font = load_font(font_size)
    scratch = Image.new("RGBA", (width, 10), (0, 0, 0, 0))
    draw = ImageDraw.Draw(scratch)
    lines = wrap_text(draw, text, font, width)
    line_boxes = [draw.textbbox((0, 0), line, font=font, stroke_width=3) for line in lines]
    line_height = max((box[3] - box[1] for box in line_boxes), default=font_size) + 14
    image_height = max(1, line_height * len(lines))
    image = Image.new("RGBA", (width, image_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    y = 0
    for line, box in zip(lines, line_boxes):
        text_width = box[2] - box[0]
        x = max(0, (width - text_width) // 2)
        draw.text(
            (x, y),
            line,
            font=font,
            fill=(255, 255, 255, 255),
            stroke_width=3,
            stroke_fill=(0, 0, 0, 255),
        )
        y += line_height

    return ImageClip(np.array(image))


def build_text_layer(text: str, font_size: int, width: int):
    try:
        return TextClip(
            text,
            fontsize=font_size,
            color="white",
            font="Arial-Bold",
            method="caption",
            align="center",
            size=(width, None),
            stroke_color="black",
            stroke_width=3,
        )
    except Exception:
        return make_pillow_text_clip(text, font_size, width)


def make_subtitle(text: str, duration: float):
    subtitle_width = int(TARGET_SIZE[0] * 0.88)
    subtitle_font_size = max(38, int(TARGET_SIZE[0] * 0.057))
    subtitle = build_text_layer(text, font_size=subtitle_font_size, width=subtitle_width)

    subtitle = subtitle.set_duration(duration).set_position(("center", "bottom"))
    background = (
        ColorClip(size=(subtitle_width + 80, subtitle.h + 60), color=(0, 0, 0))
        .set_opacity(0.45)
        .set_duration(duration)
        .set_position(("center", TARGET_SIZE[1] - subtitle.h - 120))
    )
    return background, subtitle


def save_subtitle_png(text: str, file_path: Path) -> None:
    font_size = max(34, int(TARGET_SIZE[0] * 0.054))
    font = load_font(font_size)
    subtitle_width = int(TARGET_SIZE[0] * 0.88)
    scratch = Image.new("RGBA", (subtitle_width, 10), (0, 0, 0, 0))
    scratch_draw = ImageDraw.Draw(scratch)
    lines = wrap_text(scratch_draw, text, font, subtitle_width)
    line_boxes = [
        scratch_draw.textbbox((0, 0), line, font=font, stroke_width=3)
        for line in lines
    ]
    line_height = max((box[3] - box[1] for box in line_boxes), default=font_size) + 12
    box_height = (line_height * len(lines)) + 52
    box_width = subtitle_width + 54
    box_x = (TARGET_SIZE[0] - box_width) // 2
    box_y = TARGET_SIZE[1] - box_height - 74

    image = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (box_x, box_y, box_x + box_width, box_y + box_height),
        radius=22,
        fill=(0, 0, 0, 132),
    )

    y = box_y + 26
    for line, box in zip(lines, line_boxes):
        text_width = box[2] - box[0]
        x = max(0, (TARGET_SIZE[0] - text_width) // 2)
        draw.text(
            (x, y),
            line,
            font=font,
            fill=(255, 255, 255, 255),
            stroke_width=3,
            stroke_fill=(0, 0, 0, 255),
        )
        y += line_height

    image.save(file_path)


def run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run(
        [get_ffmpeg_exe(), *args],
        cwd=ASSET_DIR,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "Unknown FFmpeg error").strip()
        raise RuntimeError(detail[-1800:])


def ffmpeg_path(path: Path) -> str:
    return path.resolve().as_posix()


def assemble_masterpiece_ffmpeg(
    scenes: list[Scene],
    voice_volume: float,
    include_captions: bool = True,
    output_path: Path = FINAL_OUTPUT,
) -> Path:
    clip_paths = []
    for index, scene in enumerate(scenes):
        video_path = ASSET_DIR / f"video_{index}.mp4"
        audio_path = ASSET_DIR / f"audio_{index}.mp3"
        subtitle_path = ASSET_DIR / f"subtitle_{index}.png"
        clip_path = ASSET_DIR / f"clip_{index}.mp4"

        if not video_path.exists() or not audio_path.exists():
            raise FileNotFoundError(f"Missing video or audio for scene {index + 1}.")

        audio_clip = AudioFileClip(str(audio_path))
        try:
            duration = max(0.2, audio_clip.duration)
        finally:
            audio_clip.close()

        inputs = [
            "-y",
            "-i",
            ffmpeg_path(video_path),
            "-i",
            ffmpeg_path(audio_path),
        ]
        if include_captions:
            save_subtitle_png(scene.narration, subtitle_path)
            inputs.extend(["-loop", "1", "-i", ffmpeg_path(subtitle_path)])
            video_filter = (
                f"[0:v]scale={TARGET_SIZE[0]}:{TARGET_SIZE[1]}:"
                "force_original_aspect_ratio=increase,"
                f"crop={TARGET_SIZE[0]}:{TARGET_SIZE[1]},"
                f"tpad=stop_mode=clone:stop_duration={duration:.3f},"
                f"trim=duration={duration:.3f},setsar=1,format=rgba[base];"
                "[base][2:v]overlay=0:0:format=auto[vout];"
                f"[1:a]volume={voice_volume:.2f}[aout]"
            )
        else:
            video_filter = (
                f"[0:v]scale={TARGET_SIZE[0]}:{TARGET_SIZE[1]}:"
                "force_original_aspect_ratio=increase,"
                f"crop={TARGET_SIZE[0]}:{TARGET_SIZE[1]},"
                f"tpad=stop_mode=clone:stop_duration={duration:.3f},"
                f"trim=duration={duration:.3f},setsar=1,format=yuv420p[vout];"
                f"[1:a]volume={voice_volume:.2f}[aout]"
            )
        run_ffmpeg(
            [
                *inputs,
                "-filter_complex",
                video_filter,
                "-map",
                "[vout]",
                "-map",
                "[aout]",
                "-t",
                f"{duration:.3f}",
                "-r",
                "24",
                "-shortest",
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "28",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                ffmpeg_path(clip_path),
            ]
        )
        clip_paths.append(clip_path)

    concat_list = ASSET_DIR / "concat_list.txt"
    concat_list.write_text(
        "\n".join(f"file '{ffmpeg_path(path)}'" for path in clip_paths),
        encoding="utf-8",
    )
    run_ffmpeg(
        [
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            ffmpeg_path(concat_list),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            ffmpeg_path(output_path),
        ]
    )
    return output_path


def assemble_masterpiece_moviepy(
    scenes: list[Scene],
    voice_volume: float,
    include_captions: bool = True,
    output_path: Path = FINAL_OUTPUT,
) -> Path:
    clips = []
    opened_clips = []

    try:
        for index, scene in enumerate(scenes):
            video_path = ASSET_DIR / f"video_{index}.mp4"
            audio_path = ASSET_DIR / f"audio_{index}.mp3"

            if not video_path.exists() or not audio_path.exists():
                raise FileNotFoundError(f"Missing video or audio for scene {index + 1}.")

            video_clip = VideoFileClip(str(video_path))
            audio_clip = AudioFileClip(str(audio_path)).volumex(voice_volume)
            opened_clips.extend([video_clip, audio_clip])

            duration = audio_clip.duration
            base_clip = fit_video_to_duration(video_clip, duration).set_audio(
                audio_clip.set_duration(duration)
            )
            opened_clips.append(base_clip)
            subtitle_layers = make_subtitle(scene.narration, duration) if include_captions else ()
            scene_clip = (
                CompositeVideoClip([base_clip, *subtitle_layers], size=TARGET_SIZE)
                if subtitle_layers
                else base_clip
            )
            clips.append(scene_clip)
            opened_clips.extend([*subtitle_layers, scene_clip])

        final_clip = concatenate_videoclips(clips, method="compose")
        opened_clips.append(final_clip)
        final_clip.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            fps=24,
            preset="ultrafast",
            audio_bitrate="192k",
            threads=max(2, os.cpu_count() or 4),
            ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
        )
        return output_path
    finally:
        for clip in opened_clips:
            try:
                clip.close()
            except Exception:
                pass


def assemble_masterpiece(
    scenes: list[Scene],
    voice_volume: float,
    include_captions: bool = True,
    output_path: Path = FINAL_OUTPUT,
) -> Path:
    try:
        return assemble_masterpiece_ffmpeg(scenes, voice_volume, include_captions, output_path)
    except Exception as exc:
        st.warning(f"Fast FFmpeg render failed; falling back to MoviePy. {exc}")
        return assemble_masterpiece_moviepy(scenes, voice_volume, include_captions, output_path)


def srt_timestamp(seconds: float) -> str:
    milliseconds = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d},{milliseconds:03d}"


def write_srt_captions(scenes: list[Scene], output_path: Path = CAPTION_SRT) -> Path:
    output_path.parent.mkdir(exist_ok=True)
    cursor = 0.0
    entries = []
    for index, scene in enumerate(scenes):
        audio_path = ASSET_DIR / f"audio_{index}.mp3"
        if not audio_path.exists():
            raise FileNotFoundError(f"Missing audio timing for scene {index + 1}.")
        audio_clip = AudioFileClip(str(audio_path))
        try:
            duration = max(0.2, float(audio_clip.duration))
        finally:
            audio_clip.close()
        end = cursor + duration
        entries.append(
            f"{index + 1}\n{srt_timestamp(cursor)} --> {srt_timestamp(end)}\n{scene.narration.strip()}"
        )
        cursor = end
    output_path.write_text("\n\n".join(entries) + "\n", encoding="utf-8")
    return output_path


def save_caption_project(scenes: list[Scene], voice_volume: float) -> None:
    ASSET_DIR.mkdir(exist_ok=True)
    CAPTION_PROJECT.write_text(
        json.dumps(
            {
                "version": "1.0.0",
                "created_at": utc_now(),
                "voice_volume": voice_volume,
                "target_size": list(TARGET_SIZE),
                "scenes": [scene.model_dump() for scene in scenes],
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def load_caption_project() -> dict[str, Any] | None:
    if not CAPTION_PROJECT.exists():
        return None
    try:
        data = json.loads(CAPTION_PROJECT.read_text(encoding="utf-8"))
        scenes = [Scene.model_validate(scene) for scene in data.get("scenes", [])]
        if not scenes:
            return None
        data["scenes"] = scenes
        return data
    except (OSError, json.JSONDecodeError, ValidationError, TypeError):
        return None


def caption_scenes_from_text(text: str, original_scenes: list[Scene]) -> list[Scene]:
    blocks = [re.sub(r"\s+", " ", block).strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    if len(blocks) != len(original_scenes):
        raise ValueError(
            f"Keep one caption block per scene. This project has {len(original_scenes)} scenes, "
            f"but the editor currently has {len(blocks)} caption blocks."
        )
    return [
        Scene(narration=caption, prompt=scene.prompt)
        for caption, scene in zip(blocks, original_scenes)
    ]


def inject_hillgram_install_hooks() -> None:
    st.html(
        """
        <script>
        (() => {
          const parentWindow = window.parent;
          const doc = parentWindow.document;
          if (!doc.querySelector('link[rel="manifest"][data-hillgram]')) {
            const manifest = doc.createElement('link');
            manifest.rel = 'manifest';
            manifest.href = '/app/static/manifest.json';
            manifest.setAttribute('data-hillgram', 'true');
            doc.head.appendChild(manifest);
          }
          if (!doc.querySelector('meta[name="theme-color"][data-hillgram]')) {
            const theme = doc.createElement('meta');
            theme.name = 'theme-color';
            theme.content = '#08080c';
            theme.setAttribute('data-hillgram', 'true');
            doc.head.appendChild(theme);
          }
          parentWindow.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            parentWindow.hillgramInstallPrompt = event;
          });
          if ('serviceWorker' in parentWindow.navigator) {
            parentWindow.navigator.serviceWorker.register('/app/static/hillgram-sw.js').catch(() => {});
          }
        })();
        </script>
        """,
        unsafe_allow_javascript=True,
    )


def apply_hillgram_theme() -> None:
    st.markdown(
        """
        <style>
        :root {
          --hill-bg: #08080c;
          --hill-panel: rgba(20, 21, 30, 0.86);
          --hill-panel-strong: rgba(31, 32, 45, 0.96);
          --hill-line: rgba(255, 255, 255, 0.12);
          --hill-text: #f8f7ff;
          --hill-muted: #a9a7b7;
          --hill-pink: #ff2d75;
          --hill-orange: #ff8a2a;
          --hill-cyan: #38d5ff;
          --hill-green: #5bf7b2;
        }
        .stApp {
          background:
            radial-gradient(circle at top left, rgba(255, 45, 117, 0.22), transparent 32rem),
            radial-gradient(circle at 80% 8%, rgba(56, 213, 255, 0.18), transparent 28rem),
            linear-gradient(135deg, #08080c 0%, #11131c 52%, #07070b 100%);
          color: var(--hill-text);
        }
        header[data-testid="stHeader"] {
          background: transparent;
        }
        section[data-testid="stSidebar"] {
          background: rgba(8, 8, 12, 0.86);
          border-right: 1px solid var(--hill-line);
          backdrop-filter: blur(22px);
        }
        section[data-testid="stSidebar"] div[data-testid="stMarkdownContainer"] p,
        section[data-testid="stSidebar"] label,
        section[data-testid="stSidebar"] span {
          color: var(--hill-text);
        }
        .block-container {
          max-width: 1280px;
          padding-top: 1.5rem;
          padding-bottom: 4rem;
        }
        div[data-testid="stTextArea"] textarea,
        div[data-baseweb="select"] > div,
        div[data-testid="stSelectbox"] div,
        div[data-testid="stSlider"] {
          border-radius: 18px;
        }
        .stButton button,
        .stDownloadButton button {
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--hill-pink), var(--hill-orange));
          color: white;
          font-weight: 800;
          box-shadow: 0 16px 38px rgba(255, 45, 117, 0.24);
          min-height: 3.1rem;
        }
        .stButton button:hover,
        .stDownloadButton button:hover {
          transform: translateY(-1px);
          border: 0;
          color: white;
          box-shadow: 0 20px 46px rgba(255, 138, 42, 0.28);
        }
        .hillgram-topbar,
        .hillgram-card,
        .hillgram-post,
        .hillgram-install {
          border: 1px solid var(--hill-line);
          background: var(--hill-panel);
          border-radius: 28px;
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(20px);
        }
        .hillgram-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.1rem;
          margin-bottom: 1rem;
        }
        .hillgram-logo {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }
        .hillgram-mark {
          width: 3.3rem;
          height: 3.3rem;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 45, 117, 1), rgba(255, 138, 42, 1) 50%, rgba(56, 213, 255, 1));
          color: white;
          font-weight: 950;
          letter-spacing: 0;
          font-size: 1.35rem;
        }
        .hillgram-logo h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 4.8rem);
          line-height: 0.9;
          letter-spacing: 0;
          font-weight: 950;
        }
        .hillgram-logo p,
        .hillgram-pill,
        .hillgram-muted {
          color: var(--hill-muted);
        }
        .hillgram-logo p {
          margin: 0.2rem 0 0;
          font-weight: 700;
        }
        .hillgram-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .hillgram-pill {
          padding: 0.65rem 0.9rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.09);
          font-weight: 800;
          white-space: nowrap;
        }
        .hillgram-stories {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 0.8rem 0 1rem;
        }
        .hillgram-story {
          min-height: 6.8rem;
          padding: 0.85rem;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.11);
          background:
            linear-gradient(155deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04)),
            linear-gradient(135deg, rgba(255,45,117,0.16), rgba(56,213,255,0.12));
        }
        .hillgram-story b {
          display: block;
          margin-top: 1.6rem;
          color: var(--hill-text);
          font-size: 0.98rem;
        }
        .hillgram-story span {
          color: var(--hill-muted);
          font-size: 0.82rem;
        }
        .hillgram-card,
        .hillgram-post,
        .hillgram-install {
          padding: 1.2rem;
          margin-bottom: 1rem;
        }
        .hillgram-post-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .hillgram-avatar {
          width: 3rem;
          height: 3rem;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--hill-pink), var(--hill-cyan));
          border: 3px solid rgba(255,255,255,0.18);
        }
        .hillgram-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .hillgram-user b {
          color: var(--hill-text);
          display: block;
        }
        .hillgram-user span {
          color: var(--hill-muted);
          font-size: 0.9rem;
        }
        .hillgram-frame {
          aspect-ratio: 9 / 16;
          width: min(100%, 25rem);
          margin: 0 auto;
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            radial-gradient(circle at 25% 18%, rgba(255,45,117,0.46), transparent 24%),
            radial-gradient(circle at 76% 26%, rgba(56,213,255,0.36), transparent 28%),
            linear-gradient(145deg, #151827, #07070b);
          display: grid;
          place-items: center;
          position: relative;
        }
        .hillgram-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0 62%, rgba(0,0,0,0.66));
        }
        .hillgram-frame-inner {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 82%;
        }
        .hillgram-frame-inner h2 {
          margin: 0;
          color: white;
          font-size: clamp(2rem, 8vw, 4.4rem);
          letter-spacing: 0;
          line-height: 0.9;
        }
        .hillgram-frame-inner p {
          color: rgba(255,255,255,0.74);
          font-weight: 800;
        }
        .hillgram-meta {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          color: var(--hill-muted);
          font-weight: 800;
          margin-top: 0.9rem;
        }
        .hillgram-install-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .hillgram-install-step {
          padding: 0.9rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          background: rgba(255,255,255,0.05);
        }
        .hillgram-install-step b {
          display: block;
          color: var(--hill-text);
          margin-bottom: 0.35rem;
        }
        .hillgram-install-step span {
          color: var(--hill-muted);
          font-size: 0.9rem;
        }
        @media (max-width: 760px) {
          .hillgram-topbar {
            align-items: flex-start;
            flex-direction: column;
          }
          .hillgram-stories,
          .hillgram-install-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_hillgram_header() -> None:
    st.markdown(
        f"""
        <div class="hillgram-topbar">
          <div class="hillgram-logo">
            <div class="hillgram-mark">Hg</div>
            <div>
              <h1>{APP_NAME}</h1>
              <p>{APP_TAGLINE}</p>
            </div>
          </div>
          <div class="hillgram-actions">
            <div class="hillgram-pill">Heels engine</div>
            <div class="hillgram-pill">PWA ready</div>
            <div class="hillgram-pill">15 min exports</div>
          </div>
        </div>
        <div class="hillgram-stories">
          <div class="hillgram-story"><span>Mode</span><b>Pexels Live</b></div>
          <div class="hillgram-story"><span>Voice</span><b>British Male</b></div>
          <div class="hillgram-story"><span>Format</span><b>9:16 Heel</b></div>
          <div class="hillgram-story"><span>Render</span><b>Fast FFmpeg</b></div>
          <div class="hillgram-story"><span>Export</span><b>MP4 + App</b></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_install_panel() -> None:
    st.markdown(
        """
        <div class="hillgram-install">
          <h3 style="margin:0 0 .35rem;color:#fff;">Install HILLGRAM on your device</h3>
          <p class="hillgram-muted" style="margin:0 0 .9rem;">No app-store download is needed for this preview. Install it directly from the public Hillary link.</p>
          <div class="hillgram-install-grid">
            <div class="hillgram-install-step"><b>iPhone &amp; iPad</b><span>Open the link in Safari. Tap Share, choose Add to Home Screen, then tap Add.</span></div>
            <div class="hillgram-install-step"><b>Android</b><span>Open the link in Chrome. Tap the three-dot menu, choose Install app or Add to Home screen, then confirm.</span></div>
            <div class="hillgram-install-step"><b>Windows &amp; Mac</b><span>Open the link in Chrome or Edge and choose the Install icon in the address bar. Safari users can choose Add to Dock.</span></div>
            <div class="hillgram-install-step"><b>Share with friends</b><span>Send the public link on WhatsApp. Friends can open it immediately and follow the matching instructions above.</span></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_auth_gate(key_prefix: str) -> str | None:
    current = get_current_username()
    if current:
        left, right = st.columns([1, 0.25])
        left.success(f"Signed in as @{current}")
        if right.button("Log out", key=f"logout_{key_prefix}", use_container_width=True):
            clear_user_session()
            st.rerun()
        return current

    auth_notice = st.session_state.pop("hillgram_auth_notice", "")
    if auth_notice:
        st.warning(auth_notice)

    login_tab, create_tab = st.tabs(["Log in", "Create account"])
    with login_tab:
        with st.form(f"hillgram_login_{key_prefix}"):
            username = st.text_input("Username", key=f"login_username_{key_prefix}")
            password = st.text_input("Password", type="password", key=f"login_password_{key_prefix}")
            submitted = st.form_submit_button("Log in", use_container_width=True)
            if submitted:
                clean_username = normalize_username(username)
                ok, message = authenticate_hillgram_user(clean_username, password)
                if ok:
                    start_user_session(message)
                    st.rerun()
                else:
                    st.error(message)

    with create_tab:
        with st.form(f"hillgram_create_account_{key_prefix}"):
            username = st.text_input("Choose username", key=f"create_username_{key_prefix}")
            email = st.text_input("Email address", key=f"create_email_{key_prefix}")
            password = st.text_input("Choose password", type="password", key=f"create_password_{key_prefix}")
            confirm_password = st.text_input(
                "Confirm password",
                type="password",
                key=f"create_confirm_password_{key_prefix}",
            )
            interests = st.multiselect(
                "Science interests",
                options=SCIENCE_TOPICS,
                default=SCIENCE_TOPICS[:4],
                key=f"create_interests_{key_prefix}",
            )
            st.caption(
                "Use 10+ characters with uppercase, lowercase, number, and symbol. "
                "Passwords are salted and hashed in the local HILLGRAM vault."
            )
            submitted = st.form_submit_button("Create HILLGRAM account", use_container_width=True)
            if submitted:
                ok, message = create_hillgram_user(username, email, password, confirm_password, interests)
                if ok:
                    start_user_session(message)
                    st.rerun()
                else:
                    st.error(message)
    return None


def render_science_scroll() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Science Scroll</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Endless-style scientific Heels shaped by your interests.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("science")
    if not username:
        return

    record = get_user_record(username) or {}
    interests = st.multiselect(
        "Tune your algorithm",
        options=SCIENCE_TOPICS,
        default=record.get("interests", SCIENCE_TOPICS[:4]),
    )
    if interests != record.get("interests"):
        record["interests"] = interests
        save_user_record(username, record)

    if "science_feed" not in st.session_state:
        st.session_state["science_feed"] = []

    feed = st.session_state["science_feed"]
    if st.button("Load science Heels", use_container_width=True) or not feed:
        allowed, wait_seconds = consume_session_rate_limit("science_feed", 12, 60)
        if not allowed:
            st.warning(f"Feed refresh limit reached. Try again in {wait_seconds} second(s).")
        else:
            try:
                with st.spinner("Pulling science Heels for your algorithm..."):
                    feed.extend(load_personalized_science_items(username, count=6))
                st.session_state["science_feed"] = feed
            except Exception as exc:
                st.error(str(exc))

    for item_index, item in enumerate(feed):
        st.markdown(
            f"""
            <div class="hillgram-post">
              <div class="hillgram-post-head">
                <div class="hillgram-user">
                  <div class="hillgram-avatar"></div>
                  <div><b>@hillgram.science</b><span>{item.get('topic', 'science')}</span></div>
                </div>
                <div class="hillgram-pill">{item.get('title', 'Science')}</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.video(item["video_url"])
        settings = (get_user_record(username) or {}).get("settings", {})
        links = make_share_links(
            item.get("title", "HILLGRAM science Heel"),
            item.get("source_url") or item.get("video_url", ""),
            settings.get("default_share_caption", "Made with HILLGRAM"),
        )
        st.markdown(
            f"[Share on WhatsApp]({links['whatsapp']}) | [Share by Email]({links['email']})",
            unsafe_allow_html=True,
        )
        c1, c2, c3, c4, c5 = st.columns(5)
        if c1.button("Like", key=f"like_{item_index}_{item['id']}", use_container_width=True):
            record = get_user_record(username) or {}
            liked = record.setdefault("liked_videos", [])
            if item["id"] not in {entry.get("id") for entry in liked if isinstance(entry, dict)}:
                liked.append({**item, "liked_at": utc_now()})
            if record.get("settings", {}).get("save_watch_history", True):
                record.setdefault("watch_history", []).append({**item, "watched_at": utc_now()})
            save_user_record(username, record)
            record_topic_signal(username, item["topic"], 2)
            st.toast("Algorithm updated.")
        if c2.button("Favourite", key=f"fav_{item_index}_{item['id']}", use_container_width=True):
            record = get_user_record(username) or {}
            favourites = record.setdefault("favourite_videos", [])
            if item["id"] not in {entry.get("id") for entry in favourites if isinstance(entry, dict)}:
                favourites.append({**item, "favourited_at": utc_now()})
            save_user_record(username, record)
            record_topic_signal(username, item["topic"], 4)
            st.toast("Added to Favourites.")
        if c3.button("Save", key=f"save_{item_index}_{item['id']}", use_container_width=True):
            record = get_user_record(username) or {}
            saved = record.setdefault("saved_videos", [])
            if item["id"] not in {entry.get("id") for entry in saved if isinstance(entry, dict)}:
                saved.append({**item, "saved_at": utc_now()})
            save_user_record(username, record)
            record_topic_signal(username, item["topic"], 3)
            st.toast("Saved to HILLGRAM Vault.")
        if c4.button("Less like this", key=f"less_{item_index}_{item['id']}", use_container_width=True):
            record_topic_signal(username, item["topic"], -2)
            st.toast("Algorithm adjusted.")
        with c5.popover("Report", use_container_width=True):
            report_reason = st.selectbox(
                "Reason",
                options=["Misinformation", "Unsafe content", "Spam", "Copyright", "Other"],
                key=f"report_reason_{item_index}_{item['id']}",
            )
            report_details = st.text_input(
                "Details",
                key=f"report_details_{item_index}_{item['id']}",
                max_chars=500,
            )
            if st.button("Submit report", key=f"report_submit_{item_index}_{item['id']}", use_container_width=True):
                allowed, wait_seconds = consume_session_rate_limit("content_report", 8, 3600)
                if not allowed:
                    st.error(f"Report limit reached. Try again in {wait_seconds // 60 + 1} minute(s).")
                else:
                    ok, message = record_content_report(username, item, report_reason, report_details)
                    st.success(message) if ok else st.error(message)

    if st.button("Load more", use_container_width=True):
        allowed, wait_seconds = consume_session_rate_limit("science_feed", 12, 60)
        if not allowed:
            st.warning(f"Feed refresh limit reached. Try again in {wait_seconds} second(s).")
        else:
            try:
                with st.spinner("Loading more science Heels..."):
                    feed.extend(load_personalized_science_items(username, count=6))
                st.session_state["science_feed"] = feed
                st.rerun()
            except Exception as exc:
                st.error(str(exc))


def render_vault() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">HILLGRAM Vault</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Your account preferences, favourite Heels, saved Heels, and render history.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("vault")
    if not username:
        return

    record = get_user_record(username) or {}
    saved_videos = record.get("saved_videos", [])
    favourite_videos = record.get("favourite_videos", [])
    liked_videos = record.get("liked_videos", [])
    my_reports = [report for report in load_vault().get("reports", []) if report.get("reporter") == username]
    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Favourites", len(favourite_videos))
    m2.metric("Saved Heels", len(saved_videos))
    m3.metric("Liked Heels", len(liked_videos))
    m4.metric("Rendered Heels", len(record.get("render_history", [])))
    m5.metric("Reports", len(my_reports))

    st.download_button(
        "Download my HILLGRAM Vault",
        data=json.dumps(record, indent=2).encode("utf-8"),
        file_name=f"hillgram_vault_{username}.json",
        mime="application/json",
        use_container_width=True,
    )

    st.subheader("Favourites")
    for item in favourite_videos[-10:][::-1]:
        st.markdown(f"**{item.get('title', 'Science Heel')}**  \n{item.get('topic', '')}")
        if item.get("video_url"):
            st.video(item["video_url"])

    st.subheader("Saved Heels")
    for item in saved_videos[-10:][::-1]:
        st.markdown(f"**{item.get('title', 'Science Heel')}**  \n{item.get('topic', '')}")
        if item.get("video_url"):
            st.video(item["video_url"])

    if my_reports:
        st.subheader("My reports")
        for report in my_reports[-10:][::-1]:
            st.write(f"{report.get('reason', 'Report')} - {report.get('status', 'open')} - {report.get('created_at', '')}")


def render_camera_studio() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Camera Studio</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Capture profile shots, Heel covers, reactions, or behind-the-scenes images.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("camera")
    if not username:
        return

    record = get_user_record(username) or {}
    settings = record.setdefault("settings", {})
    mode = st.selectbox(
        "Camera option",
        options=["Heel cover", "Profile avatar", "Science reaction", "Behind the scenes", "Idea proof"],
        index=["Heel cover", "Profile avatar", "Science reaction", "Behind the scenes", "Idea proof"].index(
            settings.get("camera_mode", "Heel cover")
            if settings.get("camera_mode", "Heel cover") in ["Heel cover", "Profile avatar", "Science reaction", "Behind the scenes", "Idea proof"]
            else "Heel cover"
        ),
    )
    settings["camera_mode"] = mode
    save_user_record(username, record)

    capture = st.camera_input(f"Take a {mode.lower()} shot")
    if capture and st.button("Save camera shot", use_container_width=True):
        shot = save_camera_capture(username, capture, mode)
        st.success(f"Saved {shot['mode']} shot.")

    shots = (get_user_record(username) or {}).get("camera_shots", [])
    if shots:
        st.subheader("Recent camera shots")
        for shot in shots[-6:][::-1]:
            file_path = Path(shot.get("file", ""))
            if file_path.exists():
                st.image(str(file_path), caption=f"{shot.get('mode', 'Camera')} - {shot.get('created_at', '')}")


def render_social_circle() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Followers + Following</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Follow other local HILLGRAM creators and build your circle.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("social")
    if not username:
        return

    vault = load_vault()
    record = get_user_record(username) or {}
    c1, c2 = st.columns(2)
    c1.metric("Followers", len(record.get("followers", [])))
    c2.metric("Following", len(record.get("following", [])))

    follow_requests = list(record.get("follow_requests", []))
    if follow_requests:
        st.subheader("Follow requests")
        for requester in follow_requests:
            request_label, accept_column, decline_column = st.columns([1, 0.35, 0.35])
            request_label.markdown(f"**@{requester}**")
            if accept_column.button("Accept", key=f"accept_follow_{requester}", use_container_width=True):
                ok, message = respond_to_follow_request(username, requester, True)
                st.success(message) if ok else st.error(message)
                st.rerun()
            if decline_column.button("Decline", key=f"decline_follow_{requester}", use_container_width=True):
                ok, message = respond_to_follow_request(username, requester, False)
                st.success(message) if ok else st.error(message)
                st.rerun()

    other_users = sorted(name for name in vault.get("users", {}) if name != username)
    if other_users:
        target = st.selectbox("Find creators", other_users)
        is_following = target in record.get("following", [])
        if is_following:
            if st.button(f"Unfollow @{target}", use_container_width=True):
                ok, message = unfollow_user(username, target)
                st.success(message) if ok else st.error(message)
                st.rerun()
        else:
            if st.button(f"Follow @{target}", use_container_width=True):
                ok, message = follow_user(username, target)
                st.success(message) if ok else st.error(message)
                st.rerun()
    else:
        st.info("Create another HILLGRAM account on this device to test following.")

    st.subheader("Your followers")
    st.write(", ".join(record.get("followers", [])) or "No followers yet.")
    st.subheader("You follow")
    st.write(", ".join(record.get("following", [])) or "You are not following anyone yet.")


def render_favourites() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Favourites</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Your favourite HILLGRAM Heels, ready to replay or share.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("favourites")
    if not username:
        return

    record = get_user_record(username) or {}
    favourites = record.get("favourite_videos", [])
    if not favourites:
        st.info("Tap Favourite on Science Heels to build this list.")
        return

    caption = record.get("settings", {}).get("default_share_caption", "Made with HILLGRAM")
    for index, item in enumerate(favourites[-20:][::-1]):
        st.markdown(f"**{item.get('title', 'Favourite Heel')}**  \n{item.get('topic', '')}")
        if item.get("video_url"):
            st.video(item["video_url"])
        links = make_share_links(
            item.get("title", "HILLGRAM favourite Heel"),
            item.get("source_url") or item.get("video_url", ""),
            caption,
        )
        st.markdown(
            f"[Share on WhatsApp]({links['whatsapp']}) | [Share by Email]({links['email']})",
            unsafe_allow_html=True,
        )


def render_caption_studio() -> None:
    global TARGET_SIZE

    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Caption Studio</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Switch to a clean master or add and replace captions without downloading new visuals.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    project = load_caption_project()
    if not project:
        st.info("Render a Heel first. Its clean master and caption timing will appear here.")
        return

    original_scenes: list[Scene] = project["scenes"]
    saved_target_size = project.get("target_size", list(TARGET_SIZE))
    if isinstance(saved_target_size, list) and len(saved_target_size) == 2:
        TARGET_SIZE = (int(saved_target_size[0]), int(saved_target_size[1]))
    voice_volume = float(project.get("voice_volume", 1.0))
    project_id = re.sub(r"[^0-9A-Za-z]", "", project.get("created_at", "project"))[-16:]
    default_caption_text = "\n\n".join(scene.narration for scene in original_scenes)
    caption_text = st.text_area(
        "Caption text",
        value=default_caption_text,
        height=300,
        key=f"caption_editor_{project_id}",
        help="Keep one caption block per scene, separated by one empty line.",
    )
    st.caption(f"{len(original_scenes)} caption blocks expected. Edit any block, then add or replace captions.")

    add_col, remove_col = st.columns(2)
    if add_col.button("Add or replace captions", use_container_width=True):
        allowed, wait_seconds = consume_session_rate_limit("caption_render", 6, 900)
        if not allowed:
            st.error(f"Caption render limit reached. Try again in {wait_seconds // 60 + 1} minute(s).")
        else:
            try:
                caption_scenes = caption_scenes_from_text(caption_text, original_scenes)
                with st.spinner("Rendering the captioned version from the saved clean project..."):
                    write_srt_captions(caption_scenes)
                    assemble_masterpiece(
                        caption_scenes,
                        voice_volume,
                        include_captions=True,
                        output_path=CAPTIONED_OUTPUT,
                    )
                st.session_state["caption_preview_choice"] = "Captioned"
                st.success("Captions added. The clean master remains available.")
            except (RuntimeError, ValueError, FileNotFoundError) as exc:
                st.error(str(exc))

    if remove_col.button("Use clean version (remove captions)", use_container_width=True):
        if CLEAN_OUTPUT.exists():
            st.session_state["caption_preview_choice"] = "Clean"
            st.success("Clean version selected. No captions are visible or burned into it.")
        else:
            st.error("The clean master is missing. Render the Heel again to rebuild it.")

    versions = []
    if CLEAN_OUTPUT.exists():
        versions.append("Clean")
    if CAPTIONED_OUTPUT.exists():
        versions.append("Captioned")
    if not versions:
        st.warning("No finished video version is available for this project.")
        return

    preferred = st.session_state.get("caption_preview_choice", versions[0])
    if preferred not in versions:
        preferred = versions[0]
    selected_version = st.radio(
        "Preview version",
        options=versions,
        index=versions.index(preferred),
        horizontal=True,
        key=f"caption_preview_radio_{project_id}",
    )
    selected_path = CLEAN_OUTPUT if selected_version == "Clean" else CAPTIONED_OUTPUT
    st.video(str(selected_path))

    download_columns = st.columns(3)
    if CLEAN_OUTPUT.exists():
        download_columns[0].download_button(
            "Download clean MP4",
            data=CLEAN_OUTPUT.read_bytes(),
            file_name="hillgram_heel_clean.mp4",
            mime="video/mp4",
            use_container_width=True,
        )
    if CAPTIONED_OUTPUT.exists():
        download_columns[1].download_button(
            "Download captioned MP4",
            data=CAPTIONED_OUTPUT.read_bytes(),
            file_name="hillgram_heel_captioned.mp4",
            mime="video/mp4",
            use_container_width=True,
        )
    if CAPTION_SRT.exists():
        download_columns[2].download_button(
            "Download captions SRT",
            data=CAPTION_SRT.read_bytes(),
            file_name="hillgram_captions.srt",
            mime="application/x-subrip",
            use_container_width=True,
        )


def render_settings() -> None:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">HILLGRAM Settings</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">Control your profile, sharing, camera defaults, and algorithm.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    username = render_auth_gate("settings")
    if not username:
        return

    record = get_user_record(username) or {}
    settings = record.setdefault("settings", {})
    with st.form("hillgram_settings_form"):
        profile_name = st.text_input("Profile name", value=settings.get("profile_name", username))
        bio = st.text_area("Bio", value=settings.get("bio", "HILLGRAM creator"), height=90)
        caption = st.text_input("Default share caption", value=settings.get("default_share_caption", "Made with HILLGRAM"))
        camera_modes = ["Heel cover", "Profile avatar", "Science reaction", "Behind the scenes", "Idea proof"]
        current_camera_mode = settings.get("camera_mode", "Heel cover")
        camera_mode = st.selectbox(
            "Default camera option",
            options=camera_modes,
            index=camera_modes.index(current_camera_mode) if current_camera_mode in camera_modes else 0,
        )
        private_profile = st.checkbox("Private profile", value=bool(settings.get("private_profile", False)))
        personalized_feed = st.checkbox(
            "Personalise Science Heels",
            value=bool(settings.get("personalized_feed", True)),
        )
        save_watch_history = st.checkbox(
            "Save watch history",
            value=bool(settings.get("save_watch_history", True)),
        )
        submitted = st.form_submit_button("Save settings", use_container_width=True)
        if submitted:
            settings.update(
                {
                    "profile_name": profile_name.strip() or username,
                    "bio": bio.strip(),
                    "default_share_caption": caption.strip() or "Made with HILLGRAM",
                    "camera_mode": camera_mode,
                    "private_profile": private_profile,
                    "personalized_feed": personalized_feed,
                    "save_watch_history": save_watch_history,
                }
            )
            record["settings"] = settings
            save_user_record(username, record)
            st.success("HILLGRAM settings saved.")

    with st.expander("Account security", expanded=False):
        secure_record = get_user_record(username) or {}
        security = secure_record.get("security", {})
        account_email = secure_record.get("email") or "No email saved"
        st.caption(f"Account email: {account_email}")
        if security.get("last_login_at"):
            st.caption(f"Last successful login: {security['last_login_at']}")
        if security.get("password_updated_at"):
            st.caption(f"Password last updated: {security['password_updated_at']}")

        with st.form("hillgram_change_password_form"):
            current_password = st.text_input("Current password", type="password")
            new_password = st.text_input("New secure password", type="password")
            confirm_password = st.text_input("Confirm new password", type="password")
            changed = st.form_submit_button("Change password", use_container_width=True)
            if changed:
                ok, message = change_hillgram_password(
                    username,
                    current_password,
                    new_password,
                    confirm_password,
                )
                if ok:
                    refreshed = get_user_record(username) or {}
                    st.session_state["hillgram_session_version"] = int(
                        refreshed.get("security", {}).get("session_version", 1)
                    )
                    st.success(message)
                else:
                    st.error(message)

        st.caption(
            f"Sessions close after {SESSION_IDLE_MINUTES} minutes without activity and always expire after "
            f"{SESSION_MAX_HOURS} hours. Changing your password signs out other open sessions."
        )

    with st.expander("Privacy and backups", expanded=False):
        privacy_record = get_user_record(username) or {}
        st.caption(
            f"Watch-history entries: {len(privacy_record.get('watch_history', []))}. "
            f"Automatic local backups: {len(list(BACKUP_DIR.glob('hillgram_vault_*.json'))) if BACKUP_DIR.exists() else 0}."
        )
        privacy_left, privacy_right = st.columns(2)
        if privacy_left.button("Clear watch and algorithm history", use_container_width=True):
            privacy_record["watch_history"] = []
            privacy_record["topic_scores"] = {}
            save_user_record(username, privacy_record)
            st.session_state["science_feed"] = []
            st.success("Watch and algorithm history cleared.")
        if privacy_right.button("Create local backup now", use_container_width=True):
            backup_path = create_vault_backup(force=True)
            if backup_path:
                st.success("Local vault backup created. Passwords remain stored only as salted hashes.")
            else:
                st.error("The local backup could not be created.")

    with st.expander("Delete account", expanded=False):
        st.warning("This permanently removes this local account, its saved activity, and its camera captures.")
        with st.form("hillgram_delete_account_form"):
            deletion_password = st.text_input("Password", type="password", key="delete_account_password")
            deletion_confirmation = st.text_input(
                f"Type {username} to confirm",
                key="delete_account_confirmation",
            )
            delete_submitted = st.form_submit_button("Delete my account", use_container_width=True)
            if delete_submitted:
                ok, message = delete_hillgram_account(
                    username,
                    deletion_password,
                    deletion_confirmation,
                )
                if ok:
                    clear_user_session(message)
                    st.rerun()
                else:
                    st.error(message)

    if st.button("Reset Science Scroll in this browser", use_container_width=True):
        st.session_state["science_feed"] = []
        st.success("Science Scroll refreshed.")


st.set_page_config(page_title=APP_NAME, page_icon="Hg", layout="wide")
inject_hillgram_install_hooks()
apply_hillgram_theme()
render_hillgram_header()

with st.sidebar:
    st.markdown(
        """
        <div style="padding:1rem 0 .4rem;">
          <div style="font-size:2rem;font-weight:950;line-height:.95;">HILLGRAM</div>
          <div style="color:#a9a7b7;font-weight:800;margin-top:.25rem;">Creator control deck</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    has_live_visual_key = has_real_env("PEXELS_API_KEY") or has_real_env("FAL_KEY")
    live_key_signature = f"pexels={has_real_env('PEXELS_API_KEY')};fal={has_real_env('FAL_KEY')}"
    if st.session_state.get("_live_key_signature") != live_key_signature:
        st.session_state["_live_key_signature"] = live_key_signature
        if has_live_visual_key:
            st.session_state["offline_demo_mode"] = False

    offline_demo_mode = st.checkbox(
        "Offline demo mode (no API keys)",
        value=not has_live_visual_key,
        key="offline_demo_mode",
    )
    if offline_demo_mode or not has_real_env("OPENAI_API_KEY"):
        st.session_state["use_openai_planner"] = False

    use_openai_planner = st.checkbox(
        "Use OpenAI for smarter scene planning",
        value=False,
        key="use_openai_planner",
        disabled=offline_demo_mode or not has_real_env("OPENAI_API_KEY"),
        help="Optional. Leave this off for the cheapest Pexels + voice workflow.",
    )
    visual_source = st.radio(
        "Select Visual Asset Source:",
        options=["Real-Life Stock Videos (Pexels)", "Cinematic AI Generation (Fal.ai)"],
        disabled=offline_demo_mode,
    )
    render_profile = st.selectbox(
        "Render speed / quality:",
        options=list(RENDER_PROFILES.keys()),
        index=0,
    )
    TARGET_SIZE = RENDER_PROFILES[render_profile]
    maximum_video_minutes = st.slider(
        "Maximum video length in minutes:",
        min_value=1,
        max_value=MAX_RENDER_MINUTES,
        value=MAX_RENDER_MINUTES,
        help="This is a maximum, not a target. Shorter content ends naturally and is never repeated to fill time.",
    )
    parallel_scene_builds = st.slider(
        "Parallel scene builds:",
        min_value=1,
        max_value=6,
        value=4,
        help="Higher is faster for Pexels, but it uses more internet and CPU at once.",
    )
    voice_label = st.selectbox(
        "Narrator Voice Model:",
        options=list(VOICE_OPTIONS.keys()),
        index=0,
        disabled=offline_demo_mode,
    )
    voice_actor = VOICE_OPTIONS[voice_label]
    voice_volume = st.slider(
        "Voice volume boost:",
        min_value=1.0,
        max_value=2.5,
        value=1.45,
        step=0.05,
        disabled=offline_demo_mode,
    )
    caption_output = st.selectbox(
        "Caption output:",
        options=[
            "Editable captions (clean MP4 + SRT)",
            "Burn captions into MP4 now",
            "No visible captions",
        ],
        index=0,
        help="The clean master is preserved so captions can be added, replaced, or removed later in Caption Studio.",
    )
    if offline_demo_mode:
        st.success("Offline demo mode uses local placeholder clips and silent audio.")
    else:
        if visual_source == "Real-Life Stock Videos (Pexels)":
            if has_real_env("PEXELS_API_KEY"):
                st.success("Pexels live mode is ready. OpenAI is optional.")
            else:
                st.warning("Add your free Pexels API key to .env before rendering live stock video.")
        else:
            if has_real_env("FAL_KEY"):
                st.success("Fal.ai live mode is ready. OpenAI is optional.")
            else:
                st.warning("Add your Fal.ai API key to .env before rendering AI video.")

main_col, preview_col = st.columns([1.1, 0.9], gap="large")

with preview_col:
    st.markdown(
        """
        <div class="hillgram-post">
          <div class="hillgram-post-head">
            <div class="hillgram-user">
              <div class="hillgram-avatar"></div>
              <div><b>@hillgram.studio</b><span>AI Heel preview</span></div>
            </div>
            <div class="hillgram-pill">Live</div>
          </div>
          <div class="hillgram-frame">
            <div class="hillgram-frame-inner">
              <h2>HILLGRAM</h2>
              <p>Write script. Pull visuals. Render Heel.</p>
            </div>
          </div>
          <div class="hillgram-meta">
            <span>Favourite-ready MP4</span><span>Optional captions</span><span>9:16 export</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    render_install_panel()
    st.html(
        """
        <button id="install-hillgram" style="
          width:100%;border:0;border-radius:999px;padding:14px 18px;
          color:white;font-weight:900;font-size:16px;cursor:pointer;
          background:linear-gradient(135deg,#ff2d75,#ff8a2a);
          box-shadow:0 18px 42px rgba(255,45,117,.28);">
          Install HILLGRAM
        </button>
        <script>
          const btn = document.getElementById('install-hillgram');
          btn.addEventListener('click', async () => {
            const topWindow = window.parent;
            if (topWindow.hillgramInstallPrompt) {
              topWindow.hillgramInstallPrompt.prompt();
              await topWindow.hillgramInstallPrompt.userChoice;
              topWindow.hillgramInstallPrompt = null;
            } else {
              alert('Use your browser menu and choose Install app or Add to Home Screen.');
            }
          });
        </script>
        """,
        unsafe_allow_javascript=True,
    )
    launcher_path = BASE_DIR / "START_HILLGRAM.bat"
    if launcher_path.exists():
        st.download_button(
            "Download Windows launcher",
            data=launcher_path.read_bytes(),
            file_name="START_HILLGRAM.bat",
            mime="application/x-msdownload",
            use_container_width=True,
        )

with main_col:
    st.markdown(
        """
        <div class="hillgram-card">
          <h3 style="margin:0;color:#fff;">Create a HILLGRAM Heel</h3>
          <p class="hillgram-muted" style="margin:.35rem 0 0;">
            Paste your narration. HILLGRAM turns it into a vertical Heel with voice, moving visuals, and editable captions.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    user_script = st.text_area(
        "Heel narration script",
        height=260,
        placeholder="Artificial intelligence is changing how we create videos. Every second, new tools turn scripts into voices, visuals, and cinematic stories...",
    )
    render_button = st.button("Render HILLGRAM Heel", use_container_width=True)

if render_button:
    render_allowed, render_wait_seconds = consume_session_rate_limit("video_render", 4, 900)
    if not render_allowed:
        st.error(f"Render limit reached. Try again in {render_wait_seconds // 60 + 1} minute(s).")
        render_button = False

if render_button:
    if not user_script.strip():
        st.error("Please insert a valid textual script string to execute.")
    else:
        try:
            if not offline_demo_mode and use_openai_planner:
                with st.spinner("Processing script layout structure through AI..."):
                    scenes = parse_script_with_llm(user_script)
                    scenes = trim_scenes_to_minutes(scenes, maximum_video_minutes)
                    st.success(f"Parsed narrative structure into {len(scenes)} scenes.")
            else:
                with st.spinner("Creating scene plan locally..."):
                    scenes = parse_script_locally(user_script, maximum_video_minutes)
                    st.success(f"Created {len(scenes)} scene(s).")

            estimated_minutes = estimate_total_duration(scenes) / 60
            st.caption(
                f"Natural estimated runtime: {estimated_minutes:.2f} minutes. "
                "HILLGRAM will stop when this content ends; no scenes or narration will be repeated."
            )

            clear_previous_assets()

            st.info("Building voice and video scene assets in parallel...")
            progress = st.progress(0)
            completed_count = 0
            scene_jobs = list(enumerate(scenes))
            total_asset_steps = max(1, len(scene_jobs))
            worker_count = min(parallel_scene_builds, total_asset_steps)
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = {
                    executor.submit(
                        build_scene_assets,
                        index,
                        scene,
                        offline_demo_mode,
                        visual_source,
                        voice_actor,
                    ): index
                    for index, scene in scene_jobs
                }
                for future in as_completed(futures):
                    scene_index = future.result()
                    completed_count += 1
                    progress.progress(completed_count / total_asset_steps)
                    st.write(f"Scene {scene_index + 1} assets ready.")

            st.info("Assembling the clean vertical master...")
            clean_output_path = assemble_masterpiece(
                scenes,
                voice_volume,
                include_captions=False,
                output_path=CLEAN_OUTPUT,
            )
            save_caption_project(scenes, voice_volume)
            write_srt_captions(scenes)

            output_path = clean_output_path
            if caption_output == "Burn captions into MP4 now":
                st.info("Adding captions while preserving the clean master...")
                output_path = assemble_masterpiece(
                    scenes,
                    voice_volume,
                    include_captions=True,
                    output_path=CAPTIONED_OUTPUT,
                )
            duration, has_audio = describe_rendered_video(output_path)
            st.success("Final video rendered successfully.")
            st.caption(
                f"Rendered {duration / 60:.2f} minutes at {TARGET_SIZE[0]}x{TARGET_SIZE[1]}. "
                f"Audio track: {'yes' if has_audio else 'no'}."
            )
            current_user = get_current_username()
            if current_user:
                record = get_user_record(current_user) or {}
                record.setdefault("render_history", []).append(
                    {
                        "created_at": utc_now(),
                        "duration_minutes": round(duration / 60, 3),
                        "scene_count": len(scenes),
                        "maximum_minutes": maximum_video_minutes,
                        "file_name": (
                            "hillgram_heel_captioned.mp4"
                            if output_path == CAPTIONED_OUTPUT
                            else "hillgram_heel_clean.mp4"
                        ),
                        "captions": output_path == CAPTIONED_OUTPUT,
                    }
                )
                save_user_record(current_user, record)
            st.video(str(output_path))
            st.download_button(
                (
                    "Download captioned HILLGRAM Heel"
                    if output_path == CAPTIONED_OUTPUT
                    else "Download clean HILLGRAM Heel"
                ),
                data=output_path.read_bytes(),
                file_name=(
                    "hillgram_heel_captioned.mp4"
                    if output_path == CAPTIONED_OUTPUT
                    else "hillgram_heel_clean.mp4"
                ),
                mime="video/mp4",
                use_container_width=True,
            )
            if caption_output != "No visible captions" and CAPTION_SRT.exists():
                st.download_button(
                    "Download editable captions SRT",
                    data=CAPTION_SRT.read_bytes(),
                    file_name="hillgram_captions.srt",
                    mime="application/x-subrip",
                    use_container_width=True,
                )
            share_caption = "Made with HILLGRAM"
            if current_user:
                share_caption = (get_user_record(current_user) or {}).get("settings", {}).get(
                    "default_share_caption",
                    share_caption,
                )
            share_links = make_share_links(
                "My HILLGRAM Heel",
                "http://localhost:8501/",
                share_caption,
            )
            st.markdown(
                f"[Share on WhatsApp]({share_links['whatsapp']}) | [Share by Email]({share_links['email']})",
                unsafe_allow_html=True,
            )
        except (RuntimeError, ValidationError, ValueError, KeyError, FileNotFoundError) as exc:
            st.error(str(exc))
        except Exception as exc:
            st.exception(exc)

st.markdown("---")
science_tab, camera_tab, social_tab, favourites_tab, captions_tab, settings_tab, vault_tab = st.tabs(
    [
        "Endless Science Heels",
        "Camera",
        "Social",
        "Favourites",
        "Caption Studio",
        "Settings",
        "HILLGRAM Vault",
    ]
)
with science_tab:
    render_science_scroll()
with camera_tab:
    render_camera_studio()
with social_tab:
    render_social_circle()
with favourites_tab:
    render_favourites()
with captions_tab:
    render_caption_studio()
with settings_tab:
    render_settings()
with vault_tab:
    render_vault()
