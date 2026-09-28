"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { logout } from "@/app/actions";
import { IconBell, IconClose, IconDoor, IconHome, IconLogout, IconMenu, IconPlus, IconSettings, IconUser, IconWallet } from "./icons";
import { Logo } from "./logo";
import { useQuickAdd } from "./quick-add";
import { MiniCalendar, type ReminderEntry } from "./mini-calendar";
import { Sheet } from "./kit-client";
import { SubmitButton } from "./forms";

const MAIN_ITEMS = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/kamar", label: "Rooms", icon: IconDoor },
  { href: "/kas", label: "Cash Book", icon: IconWallet },
  { href: "/pengingat", label: "Reminders", icon: IconBell },
];
const SETTINGS_ITEM = { href: "/pengaturan", label: "Settings", icon: IconSettings };
const ADMIN_NAME = "Max";

type NavProps = { cashHref: string; dueCount: number };

// `href` is the section (for the active state); `to` is where the link goes, e.g. the latest cash book month.
function mainItems(cashHref: string) {
  return MAIN_ITEMS.map((item) => ({ ...item, to: item.href === "/kas" ? cashHref : item.href }));
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Moves the active highlight to a tapped link straight away instead of when the new screen arrives.
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

// Active: warm fill, ink text, icon in the accent. Inactive rows stay quiet.
function navLinkClass(active: boolean) {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-200 ${
    active ? "bg-cream text-ink [&_svg]:text-terra-strong" : "text-ink-soft hover:bg-cream hover:text-ink"
  }`;
}

function NavLinks({ cashHref, dueCount, onNavigate }: NavProps & { onNavigate?: () => void }) {
  const { isOn, onTap } = useNavHighlight();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {mainItems(cashHref).map(({ href, to, label, icon: Icon }) => (
        <Link key={href} href={to} aria-current={isOn(href) ? "page" : undefined}
          onClick={(e) => { onTap(href)(e); onNavigate?.(); }} className={navLinkClass(isOn(href))}>
          <Icon width={20} height={20} />
          <span className="flex-1">{label}</span>
          {href === "/pengingat" && dueCount > 0 && (
            <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-blush px-1.5 text-xs font-semibold text-blush-deep"
              aria-label={`${dueCount} due`}>{dueCount}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const { isOn, onTap } = useNavHighlight();
  return (
    <Link href={SETTINGS_ITEM.href} aria-current={isOn(SETTINGS_ITEM.href) ? "page" : undefined}
      onClick={(e) => { onTap(SETTINGS_ITEM.href)(e); onNavigate?.(); }} className={navLinkClass(isOn(SETTINGS_ITEM.href))}>
      <IconSettings width={20} height={20} />
      {SETTINGS_ITEM.label}
    </Link>
  );
}

function AccountRow() {
  return (
    <div className="flex items-center gap-2.5 border-t border-line px-1 pt-3">
      <IconUser width={32} height={32} className="shrink-0 text-ink-soft" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{ADMIN_NAME}</div>
        <div className="text-xs text-ink-soft">Admin</div>
      </div>
      <form action={logout}>
        <button aria-label="Log out" title="Log out"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink">
          <IconLogout />
        </button>
      </form>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2.5 px-1">
      <Logo className="h-8 w-8 shrink-0" />
      <span className="font-greeting text-2xl leading-none">Hamid</span>
    </Link>
  );
}

export function Sidebar({ reminders, ...nav }: NavProps & { reminders: ReminderEntry[] }) {
  const { open } = useQuickAdd();
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col gap-5 overflow-y-auto rounded-[20px] border border-line bg-white p-4 md:flex">
      <Brand />
      <button type="button" onClick={() => open("menu")} aria-haspopup="dialog" className="btn-primary w-full">
        <IconPlus width={18} height={18} /> Add
      </button>
      <NavLinks {...nav} />
      <div className="mt-auto flex flex-col gap-3">
        <MiniCalendar reminders={reminders} />
        <SettingsLink />
        <AccountRow />
      </div>
    </aside>
  );
}

// Phones: a slim top bar with the menu button, because Safari's address bar sits at the bottom.
// Everything else, quick add included, lives in the side menu it opens.
export function MobileTopBar(nav: NavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-sm md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-14 items-center gap-2 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open}
            className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full transition-colors hover:bg-cream">
            <IconMenu />
            {nav.dueCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-terra-strong" aria-hidden />}
          </button>
          <Brand />
        </div>
      </header>
      <SideMenu open={open} onClose={() => setOpen(false)} {...nav} />
    </>
  );
}

function SideMenu({ open, onClose, ...nav }: NavProps & { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { open: openQuickAdd, actions } = useQuickAdd();
  const pathname = usePathname();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Leaving the page (a nav link, back/forward) closes the menu.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname && open) onClose();
    lastPath.current = pathname;
  }, [pathname, open, onClose]);

  return (
    <dialog ref={ref} aria-label="Menu" onClose={() => { if (open) onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="side-menu fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-none w-[min(20rem,86vw)] overflow-y-auto bg-white p-0 text-ink backdrop:bg-ink/35 md:hidden">
      <div className="flex min-h-full flex-col gap-5 p-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <Brand />
          <button type="button" onClick={onClose} aria-label="Close menu"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full transition-colors hover:bg-cream">
            <IconClose />
          </button>
        </div>

        <NavLinks {...nav} onNavigate={onClose} />

        <section aria-labelledby="menu-add">
          <h2 id="menu-add" className="mb-1.5 px-3 text-xs font-semibold text-ink-soft">Add</h2>
          <ul className="flex flex-col gap-0.5">
            {actions.map((a) => (
              <li key={a.kind}>
                <button type="button" onClick={() => { onClose(); openQuickAdd(a.kind); }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition-colors duration-200 hover:bg-cream">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink ${a.tone}`} aria-hidden>
                    <a.icon width={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{a.label}</span>
                    <span className="block truncate text-xs font-normal text-ink-soft">{a.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto flex flex-col gap-3">
          <SettingsLink onNavigate={onClose} />
          <AccountRow />
        </div>
      </div>
    </dialog>
  );
}

// Overview header button on phones for account details and logging out (also in the side menu).
export function AccountButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Account" aria-haspopup="dialog"
        className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-cream ${className}`}>
        <IconUser width={22} height={22} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
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
    </>
  );
}
