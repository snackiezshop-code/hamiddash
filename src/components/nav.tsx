"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { logout } from "@/app/actions";
import { IconDoor, IconHome, IconList, IconLogout, IconSettings, IconUser, IconWallet } from "./icons";
import { Logo } from "./logo";
import { Plus } from "@phosphor-icons/react";
import { useQuickAdd } from "./quick-add";
import { MiniCalendar, type ReminderEntry } from "./mini-calendar";
import { Sheet } from "./kit-client";
import { SubmitButton } from "./forms";

const MAIN_ITEMS = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/kamar", label: "Rooms", icon: IconDoor },
  { href: "/kas", label: "Cash Book", icon: IconWallet },
  { href: "/checklist", label: "Checklist", icon: IconList },
];
const SETTINGS_ITEM = { href: "/pengaturan", label: "Settings", icon: IconSettings };

// `href` is the section (for the active state); `to` is where the tab links, e.g. the latest cash book month.
function mainItems(cashHref: string) {
  return MAIN_ITEMS.map((item) => ({ ...item, to: item.href === "/kas" ? cashHref : item.href }));
}

function navLinkClass(active: boolean) {
  return `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
    active ? "bg-cream text-ink" : "text-cream/70 hover:bg-white/10 hover:text-cream"
  }`;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Moves the active highlight to a tapped tab straight away instead of when the new screen arrives.
// The tap only counts while the pathname is still the one it was made on, so it clears itself on arrival.
function useNavHighlight() {
  const pathname = usePathname();
  const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
  const target = tap && tap.from === pathname ? tap.href : null;
  return {
    isOn: (href: string) => (target ? target === href : isActive(pathname, href)),
    onTap: (href: string) => (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      setTap({ href, from: pathname });
    },
  };
}

const ADMIN_NAME = "Max";

export function Sidebar({ reminders, cashHref }: { reminders: ReminderEntry[]; cashHref: string }) {
  const { isOn, onTap } = useNavHighlight();
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-[28px] bg-ink p-5 text-cream md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white p-1.5">
          <Logo className="h-full w-full" />
        </span>
        <span className="font-greeting text-2xl leading-none font-normal">Hamid</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {mainItems(cashHref).map(({ href, to, label, icon: Icon }) => (
          <Link key={href} href={to} onClick={onTap(href)} className={navLinkClass(isOn(href))}>
            <Icon width={22} height={22} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto py-4">
        <MiniCalendar reminders={reminders} />
      </div>

      <Link href={SETTINGS_ITEM.href} onClick={onTap(SETTINGS_ITEM.href)} className={`mb-3 ${navLinkClass(isOn(SETTINGS_ITEM.href))}`}>
        <IconSettings width={22} height={22} />
        {SETTINGS_ITEM.label}
      </Link>

      <div className="flex items-center gap-2.5 border-t border-cream/10 px-2 pt-3">
        <IconUser width={32} height={32} className="shrink-0 text-cream/80" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{ADMIN_NAME}</div>
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

export function BottomBar({ cashHref }: { cashHref: string }) {
  const { isOn, onTap } = useNavHighlight();
  const { open } = useQuickAdd();
  const items = mainItems(cashHref);
  const tab = ({ href, to, label, icon: Icon }: (typeof items)[number]) => {
    const active = isOn(href);
    return (
      <Link key={href} href={to} onClick={onTap(href)} aria-current={active ? "page" : undefined}
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] leading-3 font-semibold ${
          active ? "bg-cream text-ink" : "text-cream/75"
        }`}>
        {/* Active tab: a 56px circle shade holding icon + label ("Checklist" is the widest fit), icon in its own small circle. */}
        <span className={`grid h-5 w-5 place-items-center rounded-full ${active ? "bg-cream-2" : ""}`}>
          <Icon width={16} height={16} />
        </span>
        <span className="max-w-full truncate">{label.split(" ")[0]}</span>
      </Link>
    );
  };
  return (
    // Spans the same width as the page column (its safe-gutter edges), fully rounded ends.
    <nav aria-label="Main" className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-3 left-[max(1rem,env(safe-area-inset-left))] z-40 flex items-center rounded-full bg-ink p-1.5 text-cream md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex flex-1 justify-around">{items.slice(0, 2).map(tab)}</div>
      <div className="relative w-14 shrink-0 self-stretch">
        <button type="button" onClick={() => open("menu")} aria-label="Quick add" aria-haspopup="dialog"
          className="absolute -top-[34px] left-1/2 grid h-14 w-14 -translate-x-1/2 cursor-pointer place-items-center rounded-full border-4 border-cream bg-fab text-ink transition-transform active:scale-95">
          <Plus size={24} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 justify-around">{items.slice(2).map(tab)}</div>
    </nav>
  );
}

// Phones have no sidebar, so the Overview header carries this button for logging out.
export function AccountButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Account" aria-haspopup="dialog"
        className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-cream-2 ${className}`}>
        <IconUser width={22} height={22} />
      </button>
      <AccountSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3">
          <IconUser width={40} height={40} className="shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{ADMIN_NAME}</div>
            <div className="text-xs text-ink-soft">Admin · Kost Mujair 12</div>
          </div>
        </div>
        <form action={logout}>
          <SubmitButton className="btn-secondary w-full" pendingText="Logging out…">
            <IconLogout width={18} height={18} /> Log out
          </SubmitButton>
        </form>
      </div>
    </Sheet>
  );
}
