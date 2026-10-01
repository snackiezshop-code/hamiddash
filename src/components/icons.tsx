import type { JSX, SVGProps } from "react";

// Line icons drawn for the Panel look: 24px grid, 1.8px stroke, square ends and mitred joins, so
// they sit with the outlined cards and Space Grotesk. Each icon is chosen for what it labels
// (zap = electricity bill, waves = water bill), not as decoration.
type P = SVGProps<SVGSVGElement>;
export type AppIcon = (props: P) => JSX.Element;

function icon(name: string, d: string | string[]): AppIcon {
  function Icon({ width, height, strokeWidth, ...rest }: P) {
    const size = width ?? height ?? 24;
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth ?? 1.8} strokeLinecap="square" strokeLinejoin="miter" aria-hidden {...rest}>
        {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
      </svg>
    );
  }
  Icon.displayName = `Icon(${name})`;
  return Icon;
}

export const IconHome = icon("Home", ["M4 10.5 12 4l8 6.5V20H4z", "M10 20v-6h4v6"]);
export const IconDoor = icon("Door", ["M6 20V4h12v16", "M3.5 20h17", "M14.5 12.5v1"]);
export const IconWallet = icon("Wallet", ["M4 7h15v13H4z", "M4 7l11-3v3", "M15 12.5h4v3h-4z"]);
export const IconBell = icon("Bell", ["M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z", "M10 20.5h4"]);
export const IconSettings = icon("Settings", ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"]);
export const IconLogout = icon("Logout", ["M10 4H4v16h6", "M14 8l4 4-4 4", "M18 12H9"]);
export const IconUser = icon("User", ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 20.5c1.3-3.5 4.3-5 8-5s6.7 1.5 8 5"]);
export const IconMenu = icon("Menu", ["M4 8h16", "M4 16h11"]);
export const IconClose = icon("Close", ["M6 6l12 12", "M18 6 6 18"]);
export const IconPlus = icon("Plus", ["M12 5v14", "M5 12h14"]);
export const IconCheck = icon("Check", "M5 12.5l4.5 4.5L19 7.5");
export const IconTrash = icon("Trash", ["M4.5 6.5h15", "M9 6.5V4h6v2.5", "M6.5 6.5 7.5 20h9l1-13.5", "M10 10.5v6M14 10.5v6"]);
export const IconEdit = icon("Edit", ["M4 20h4L19 9l-4-4L4 16z", "M13 7l4 4"]);
export const IconUndo = icon("Undo", ["M8 5 4 9l4 4", "M4 9h10a5 5 0 0 1 0 10h-3"]);
export const IconChevronLeft = icon("ChevronLeft", "M15 5l-7 7 7 7");
export const IconChevronRight = icon("ChevronRight", "M9 5l7 7-7 7");
export const IconChevronDown = icon("ChevronDown", "M5 9l7 7 7-7");
export const IconDownload = icon("Download", ["M12 4v11", "M7 10.5l5 5 5-5", "M4.5 20h15"]);
export const IconCalendar = icon("Calendar", ["M4 6h16v14H4z", "M4 10.5h16", "M8.5 3.5V7M15.5 3.5V7"]);
export const IconSearch = icon("Search", ["M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z", "M15.5 15.5 20 20"]);
export const IconCopy = icon("Copy", ["M9 9h11v11H9z", "M5 15H4V4h11v1"]);
export const IconWhatsApp = icon("WhatsApp", ["M4 20l1.3-3.8A8 8 0 1 1 8 18.8z", "M9 9.5c.3 2.5 2.4 4.9 5.5 5.5l1-1.5-2-1-1 .8c-1-.5-1.8-1.3-2.3-2.3l.8-1-1-2z"]);
export const IconBed = icon("Bed", ["M3.5 19V6", "M3.5 13.5h17V19", "M3.5 16.5h17", "M7 10.5h4.5v3H7z"]);
export const IconReceipt = icon("Receipt", ["M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z", "M9 8.5h6M9 12h6M9 15.5h3"]);
export const IconBanknote = icon("Banknote", ["M3 6.5h18v11H3z", "M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", "M6 9.5v5M18 9.5v5"]);
export const IconUserPlus = icon("UserPlus", ["M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M3 20.5c1.2-3.4 3.8-5 7-5 1.5 0 2.8.3 3.9 1", "M18.5 13.5v6M15.5 16.5h6"]);
export const IconAlarmClock = icon("AlarmClock", ["M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z", "M12 10v3.5l2.5 1.5", "M4 5.5 6.5 3M20 5.5 17.5 3"]);
export const IconZap = icon("Zap", "M13 3 5 13.5h6L10 21l8-10.5h-6z");
export const IconWaves = icon("Waves", ["M3 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0", "M3 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0", "M3 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"]);
export const IconSpray = icon("Spray", ["M8 10h6v10.5H8z", "M9.5 10V6.5h3V10", "M12.5 7.5H16", "M18.5 5.5v.01M18.5 9v.01M20.5 7.2v.01"]);
export const IconSprayCan = icon("SprayCan", ["M7 9.5h8v11H7z", "M9 9.5v-3h4v3", "M17.5 4.5v.01M19.5 6.5v.01M17.5 8.5v.01"]);
export const IconTools = icon("Tools", ["M14.5 5.5a4 4 0 0 0 4.9 4.9L20 11l-9 9-3.5-3.5 9-9z", "M4 4l5 5", "M3.5 7.5l4-4"]);
export const IconWifi = icon("Wifi", ["M3 9a13 13 0 0 1 18 0", "M6 12.5a8.5 8.5 0 0 1 12 0", "M9 16a4 4 0 0 1 6 0", "M12 19.5v.01"]);
export const IconToolCase = icon("ToolCase", ["M3.5 8h17v11.5h-17z", "M9 8V5h6v3", "M3.5 13h17", "M10.5 11.5v3h3v-3"]);
export const IconInvoice = icon("Invoice", ["M6 3.5h9l3 3v14H6z", "M9 9.5h6M9 13h6M9 16.5h4"]);
export const IconHuman = icon("Human", ["M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", "M6 11h12", "M12 11v4.5", "M8.5 21l3.5-5.5 3.5 5.5"]);
export const IconCoins = icon("Coins", ["M9 10.5c3.3 0 6-1.1 6-2.5s-2.7-2.5-6-2.5S3 6.6 3 8s2.7 2.5 6 2.5Z", "M3 8v4c0 1.4 2.7 2.5 6 2.5", "M9 14.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5-2.7-2.5-6-2.5-6 1.1-6 2.5Z", "M9 14.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"]);
export const IconMore = icon("More", ["M5 11.5h1v1H5z", "M11.5 11.5h1v1h-1z", "M18 11.5h1v1h-1z"]);
export const IconClipboard = icon("Clipboard", ["M6 5h12v15.5H6z", "M9 3.5h6V6.5H9z", "M9 11h6M9 14.5h4"]);
export const IconStickyNote = icon("StickyNote", ["M4.5 4.5h15v10l-5 5h-10z", "M14.5 19.5v-5h5"]);
