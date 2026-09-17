"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { IconDoor, IconHome, IconList, IconLogout, IconSettings, IconUser, IconWallet } from "./icons";
import { Logo } from "./logo";
import { MiniCalendar, type ReminderEntry } from "./mini-calendar";

const MAIN_ITEMS = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/kamar", label: "Rooms", icon: IconDoor },
  { href: "/kas", label: "Cash Book", icon: IconWallet },
  { href: "/checklist", label: "Checklist", icon: IconList },
];
const SETTINGS_ITEM = { href: "/pengaturan", label: "Settings", icon: IconSettings };
const ITEMS = [...MAIN_ITEMS, SETTINGS_ITEM];

function navLinkClass(active: boolean) {
  return `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
    active ? "bg-cream text-ink" : "text-cream/70 hover:bg-white/10 hover:text-cream"
  }`;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar({ reminders }: { reminders: ReminderEntry[] }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-[28px] bg-ink p-5 text-cream md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white p-1.5">
          <Logo className="h-full w-full" />
        </span>
        <span className="font-greeting text-2xl leading-none">Hamid</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {MAIN_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navLinkClass(isActive(pathname, href))}>
            <Icon width={22} height={22} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto py-4">
        <MiniCalendar reminders={reminders} />
      </div>

      <Link href={SETTINGS_ITEM.href} className={`mb-3 ${navLinkClass(isActive(pathname, SETTINGS_ITEM.href))}`}>
        <IconSettings width={22} height={22} />
        {SETTINGS_ITEM.label}
      </Link>

      <div className="flex items-center gap-2.5 border-t border-cream/10 px-2 pt-3">
        <IconUser width={32} height={32} className="shrink-0 text-cream/80" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Max</div>
          <div className="text-xs text-cream/50">Admin</div>
        </div>
        <form action={logout}>
          <button aria-label="Log out" title="Log out"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-cream/70 hover:bg-white/10 hover:text-cream">
            <IconLogout />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full bg-ink px-2 py-2 text-cream shadow-lg md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} aria-label={label}
            className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              active ? "bg-cream text-ink" : "text-cream/70"
            }`}>
            <Icon width={22} height={22} />
            {label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
