import type { SVGProps } from "react";
import {
  ArrowLineDown,
  Bell,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  Copy,
  CheckSquareOffset,
  DoorOpen,
  GearSix,
  HouseLine,
  MagnifyingGlass,
  Plus,
  SignOut,
  Trash,
  UserCircle,
  Wallet,
  WarningCircle,
  WhatsappLogo,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

// Phosphor icons behind the app's existing Icon* names. `width` sets the size;
// a thicker `strokeWidth` (used on small check marks) maps to the bold weight.
type P = SVGProps<SVGSVGElement>;

function wrap(Glyph: Icon, defaultSize = 20) {
  function Wrapped({ width, height, strokeWidth, ...rest }: P) {
    const size = width ?? height ?? defaultSize;
    const weight = Number(strokeWidth) >= 3 ? "bold" : "regular";
    return <Glyph size={size} weight={weight} aria-hidden {...rest} />;
  }
  Wrapped.displayName = `Icon(${Glyph.displayName ?? "Phosphor"})`;
  return Wrapped;
}

export const IconHome = wrap(HouseLine);
export const IconDoor = wrap(DoorOpen);
export const IconWallet = wrap(Wallet);
export const IconCheck = wrap(Check);
export const IconList = wrap(CheckSquareOffset);
export const IconSettings = wrap(GearSix);
export const IconLogout = wrap(SignOut);
export const IconPlus = wrap(Plus);
export const IconTrash = wrap(Trash);
export const IconChevronLeft = wrap(CaretLeft);
export const IconChevronRight = wrap(CaretRight);
export const IconDownload = wrap(ArrowLineDown);
export const IconAlert = wrap(WarningCircle);
export const IconCalendar = wrap(CalendarBlank);
export const IconWhatsApp = wrap(WhatsappLogo, 18);
export const IconUser = wrap(UserCircle);
export const IconBell = wrap(Bell);
export const IconSearch = wrap(MagnifyingGlass);
export const IconCopy = wrap(Copy);
