"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { IconDoor, IconHome, IconList, IconLogout, IconSettings, IconUser, IconWallet } from "./icons";
import { Logo } from "./logo";
import { Plus } from "@phosphor-icons/react";
import { useQuickAdd } from "./quick-add";
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
        <span className="font-greeting text-2xl leading-none font-extrabold tracking-tight">Hamid</span>
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
  const { open } = useQuickAdd();
  const tab = ({ href, label, icon: Icon }: (typeof ITEMS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined}
        className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-[11px] font-semibold ${
          active ? "bg-cream text-ink" : "text-cream/75"
        }`}>
        <Icon width={22} height={22} />
        <span className="max-w-full truncate">{label.split(" ")[0]}</span>
      </Link>
    );
  };
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 flex items-center rounded-[28px] bg-ink p-1.5 text-cream md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex flex-1 gap-0.5">{ITEMS.slice(0, 3).map(tab)}</div>
      <div className="relative w-[72px] shrink-0 self-stretch">
        <button type="button" onClick={() => open("menu")} aria-label="Quick add" aria-haspopup="dialog"
          className="absolute -top-8 left-1/2 grid h-16 w-16 -translate-x-1/2 cursor-pointer place-items-center rounded-full border-4 border-cream bg-fab text-ink transition-transform active:scale-95">
          <Plus size={28} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 gap-0.5">{ITEMS.slice(3).map(tab)}</div>
    </nav>
  );
}
