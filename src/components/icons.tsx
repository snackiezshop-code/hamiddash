import type { JSX, SVGProps } from "react";
import { Home } from "pixelarticons/react/Home";
import { DoorClosed } from "pixelarticons/react/DoorClosed";
import { Wallet } from "pixelarticons/react/Wallet";
import { BellRing } from "pixelarticons/react/BellRing";
import { SettingsCog } from "pixelarticons/react/SettingsCog";
import { Logout } from "pixelarticons/react/Logout";
import { User } from "pixelarticons/react/User";
import { Menu } from "pixelarticons/react/Menu";
import { Close } from "pixelarticons/react/Close";
import { Plus } from "pixelarticons/react/Plus";
import { Check } from "pixelarticons/react/Check";
import { Trash } from "pixelarticons/react/Trash";
import { Pencil } from "pixelarticons/react/Pencil";
import { Undo } from "pixelarticons/react/Undo";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { ChevronRight } from "pixelarticons/react/ChevronRight";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import { Download } from "pixelarticons/react/Download";
import { Calendar } from "pixelarticons/react/Calendar";
import { Search } from "pixelarticons/react/Search";
import { Copy } from "pixelarticons/react/Copy";
import { Whatsapp } from "pixelarticons/react/Whatsapp";
import { Bed } from "pixelarticons/react/Bed";
import { Receipt } from "pixelarticons/react/Receipt";
import { Banknote } from "pixelarticons/react/Banknote";
import { UserPlus } from "pixelarticons/react/UserPlus";
import { AlarmClock } from "pixelarticons/react/AlarmClock";
import { Zap } from "pixelarticons/react/Zap";
import { Waves } from "pixelarticons/react/Waves";
import { SprayWave } from "pixelarticons/react/SprayWave";
import { SprayCan } from "pixelarticons/react/SprayCan";
import { Tools } from "pixelarticons/react/Tools";
import { Wifi } from "pixelarticons/react/Wifi";
import { ToolCase } from "pixelarticons/react/ToolCase";
import { Invoice } from "pixelarticons/react/Invoice";
import { Human } from "pixelarticons/react/Human";
import { Coins } from "pixelarticons/react/Coins";
import { MoreHorizontal } from "pixelarticons/react/MoreHorizontal";
import { ClipboardNote } from "pixelarticons/react/ClipboardNote";
import { StickyNote } from "pixelarticons/react/StickyNote";

// Every icon in the app is pixel art (pixelarticons, MIT) so it matches the pixel robot and the
// pixel-H logo. They are drawn on a 24px grid in 2px "pixels": 24px is pin sharp, other sizes get
// crispEdges so the blocks stay square instead of blurring. Sizes between 18 and 24 snap up to 24.
type P = SVGProps<SVGSVGElement>;
export type AppIcon = (props: P) => JSX.Element;

function wrap(Glyph: AppIcon, defaultSize = 24): AppIcon {
  function Wrapped({ width, height, ...rest }: P) {
    let size = Number(width ?? height ?? defaultSize);
    if (size >= 18 && size < 24) size = 24;
    return <Glyph width={size} height={size} shapeRendering="crispEdges" aria-hidden {...rest} />;
  }
  Wrapped.displayName = `PixelIcon(${Glyph.name})`;
  return Wrapped;
}

export const IconHome = wrap(Home);
export const IconDoor = wrap(DoorClosed);
export const IconWallet = wrap(Wallet);
export const IconBell = wrap(BellRing);
export const IconSettings = wrap(SettingsCog);
export const IconLogout = wrap(Logout);
export const IconUser = wrap(User);
export const IconMenu = wrap(Menu);
export const IconClose = wrap(Close);
export const IconPlus = wrap(Plus);
export const IconCheck = wrap(Check);
export const IconTrash = wrap(Trash);
export const IconEdit = wrap(Pencil);
export const IconUndo = wrap(Undo);
export const IconChevronLeft = wrap(ChevronLeft);
export const IconChevronRight = wrap(ChevronRight);
export const IconChevronDown = wrap(ChevronDown);
export const IconDownload = wrap(Download);
export const IconCalendar = wrap(Calendar);
export const IconSearch = wrap(Search);
export const IconCopy = wrap(Copy);
export const IconWhatsApp = wrap(Whatsapp);
export const IconBed = wrap(Bed);
export const IconReceipt = wrap(Receipt);
export const IconBanknote = wrap(Banknote);
export const IconUserPlus = wrap(UserPlus);
export const IconAlarmClock = wrap(AlarmClock);
export const IconZap = wrap(Zap);
export const IconWaves = wrap(Waves);
export const IconSpray = wrap(SprayWave);
export const IconSprayCan = wrap(SprayCan);
export const IconTools = wrap(Tools);
export const IconWifi = wrap(Wifi);
export const IconToolCase = wrap(ToolCase);
export const IconInvoice = wrap(Invoice);
export const IconHuman = wrap(Human);
export const IconCoins = wrap(Coins);
export const IconMore = wrap(MoreHorizontal);
export const IconClipboard = wrap(ClipboardNote);
export const IconStickyNote = wrap(StickyNote);
