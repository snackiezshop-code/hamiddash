"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { logout } from "@/app/actions";
import { IconChevronRight, IconLogout } from "./icons";
import { useQuickAdd } from "./quick-add";
import { Sheet } from "./kit-client";
import { SubmitButton } from "./forms";
import { NotificationBell, type Notification } from "./notification-bell";

const PAGES = [
  { href: "/", label: "Ringkasan" },
  { href: "/kamar", label: "Kamar" },
  { href: "/kas", label: "Buku kas" },
  { href: "/pengingat", label: "Pengingat" },
];
const SETTINGS = { href: "/pengaturan", label: "Pengaturan" };

type NavProps = { cashHref: string; dueCount: number };

// `href` is the section (for the active state); `to` is where the link goes, e.g. the latest cash book month.
const withTo = (cashHref: string) => PAGES.map((p) => ({ ...p, to: p.href === "/kas" ? cashHref : p.href }));

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Moves the active mark to a tapped link straight away instead of when the new screen arrives.
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

// The bar on top of every page. Not fixed to the bottom: Safari's address bar lives there.
export function AppHeader({ notifications, ...nav }: NavProps & { notifications: Notification[] }) {
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="relative mx-auto flex h-16 max-w-[560px] items-center justify-between gap-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        {/* Wordmark placeholder until a final logo is chosen. */}
        <Link href="/" className="flex min-h-11 items-center text-[0.95rem] font-bold tracking-[0.06em]">HAMIDKOST</Link>
        <div className="flex items-center gap-2.5">
          <NotificationBell notifications={notifications} />
          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} aria-label="Menu admin"
            className="press relative grid h-11 w-11 cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-ink bg-navy text-[0.8rem] font-semibold text-white shadow-[2px_2px_0_var(--color-ink)] hover:bg-navy-hover">
            <span aria-hidden>AD</span>
            {nav.dueCount > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 border border-ink bg-orange" aria-hidden />}
          </button>
        </div>
      </div>
      <MenuSheet open={menu} onClose={() => setMenu(false)} {...nav} />
    </header>
  );
}

function MenuSheet({ open, onClose, cashHref, dueCount }: NavProps & { open: boolean; onClose: () => void }) {
  const { isOn, onTap } = useNavHighlight();
  const { open: openQuickAdd, actions } = useQuickAdd();
  const pathname = usePathname();

  // Leaving the page (a menu link, back/forward) closes the menu.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname && open) onClose();
    lastPath.current = pathname;
  }, [pathname, open, onClose]);

  const row = "flex min-h-12 items-center gap-3 border-b border-line px-1 text-base";
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <nav aria-label="Halaman">
        <ul>
          {[...withTo(cashHref), { ...SETTINGS, to: SETTINGS.href }].map((p) => (
            <li key={p.href}>
              <Link href={p.to} aria-current={isOn(p.href) ? "page" : undefined} onClick={(e) => { onTap(p.href)(e); onClose(); }}
                className={`${row} ${isOn(p.href) ? "font-semibold" : ""}`}>
                <span aria-hidden className={`h-2.5 w-2.5 shrink-0 border-[1.5px] border-ink ${isOn(p.href) ? "bg-orange" : ""}`} />
                <span className="flex-1">{p.label}</span>
                {p.href === "/pengingat" && dueCount > 0 && (
                  <span className="num rounded-[3px] bg-orange px-1.5 text-xs font-semibold text-white" aria-label={`${dueCount} jatuh tempo`}>{dueCount}</span>
                )}
                <IconChevronRight width={16} className="text-ink-soft" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="menu-add" className="mt-6">
        <h3 id="menu-add" className="eyebrow mb-2 text-ink-soft">Tambah</h3>
        <ul className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => (
            <li key={a.kind}>
              <button type="button" onClick={() => { onClose(); openQuickAdd(a.kind); }}
                className="card press flex h-full min-h-20 w-full cursor-pointer flex-col items-start gap-2 p-3 text-left shadow-[3px_3px_0_var(--color-ink)] hover:bg-cream">
                <a.icon width={20} />
                <span className="text-sm leading-tight font-medium">{a.label}</span>
                <span className="text-xs leading-snug text-ink-soft">{a.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex items-center gap-3 border-t-[1.5px] border-ink pt-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-navy text-[0.8rem] font-semibold text-white" aria-hidden>AD</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Admin</div>
          <div className="text-xs text-ink-soft">Kost Mujair 12</div>
        </div>
        <form action={logout}>
          <SubmitButton className="btn-secondary btn-sm" pendingText="Keluar…">
            <IconLogout width={16} /> Keluar
          </SubmitButton>
        </form>
      </div>
    </Sheet>
  );
}

// Page-end tabs, the same four pages as the menu. They sit after the content, not fixed.
export function PageTabs({ cashHref }: { cashHref: string }) {
  const { isOn, onTap } = useNavHighlight();
  return (
    <nav aria-label="Pindah halaman" className="mt-10 grid grid-cols-4 border-t-[1.5px] border-ink">
      {withTo(cashHref).map((p) => (
        <Link key={p.href} href={p.to} aria-current={isOn(p.href) ? "page" : undefined} onClick={onTap(p.href)}
          className="relative flex min-h-14 items-center justify-center text-center">
          {isOn(p.href) && <span aria-hidden className="absolute inset-x-3 -top-[1.5px] h-[3px] bg-orange" />}
          <span className={`eyebrow ${isOn(p.href) ? "" : "text-ink-soft"}`}>{p.label}</span>
        </Link>
      ))}
    </nav>
  );
}
