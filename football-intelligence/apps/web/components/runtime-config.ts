const defaultSportzfyDownloadUrl = "https://apk.sportzfy.app/download";

function publicValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export const publicConfig = {
  apiUrl: publicValue(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, ""),
  sportzfy: {
    enabled: publicValue(process.env.NEXT_PUBLIC_SPORTZFY_ENABLED) !== "false",
    downloadUrl: publicValue(process.env.NEXT_PUBLIC_SPORTZFY_DOWNLOAD_URL) || defaultSportzfyDownloadUrl,
    deepLink: publicValue(process.env.NEXT_PUBLIC_SPORTZFY_APP_DEEP_LINK),
    embedUrl: publicValue(process.env.NEXT_PUBLIC_SPORTZFY_EMBED_URL),
  },
} as const;

export function isAndroidDevice(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /android/i.test(userAgent);
}
