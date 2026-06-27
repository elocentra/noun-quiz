// lib/device-fingerprint.ts
// Creates a simple device fingerprint to enforce one attempt per device

export function generateDeviceFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;

  const components = [
    nav.userAgent,
    nav.language,
    nav.platform,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || "",
    // Canvas fingerprint
    getCanvasFingerprint()
  ];

  return hashString(components.join("|"));
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("NOUN Quiz System 🎓", 2, 2);
    return canvas.toDataURL().slice(-50);
  } catch {
    return "";
  }
}

// Simple DJB2 hash
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
