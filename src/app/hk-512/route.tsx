import { hkIcon } from "@/lib/hk-mark";

// 512px PNG of the app icon for the web app manifest (Android, Chrome install).
export function GET() {
  return hkIcon(512);
}
