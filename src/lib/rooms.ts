import type { Prisma } from "@/generated/prisma/client";
import type { DrawerRoom } from "@/components/room-drawer";
import { properName } from "./format";
import type { OpenPromise } from "./promises";
import type { AnnualState } from "./annual";

// Prisma include + mapper shared by every page that can open the room drawer.
export const drawerRoomInclude = {
  tenant: true,
  roomIncomes: {
    include: { period: true },
    orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    take: 6,
  },
} satisfies Prisma.RoomInclude;

type RoomWithDrawerData = {
  id: string;
  number: number;
  status: DrawerRoom["status"];
  monthlyRent: number;
  tenant: (NonNullable<DrawerRoom["tenant"]> & Record<string, unknown>) | null;
  roomIncomes: { id: string; status: DrawerRoom["status"]; amount: number; period: { year: number; month: number } }[];
};

// `promises`: open payment promises by room id (from openPromises()), so the sheet can show and edit them.
// `annual`: yearly-rent states by room id (from annualStates()).
export function toDrawerRoom(r: RoomWithDrawerData, promises?: Map<string, OpenPromise>, annual?: Map<string, AnnualState>): DrawerRoom {
  const p = promises?.get(r.id);
  const a = annual?.get(r.id);
  return {
    id: r.id, number: r.number, status: r.status, monthlyRent: r.monthlyRent,
    promise: p ? { id: p.id, date: p.date } : null,
    annual: a ? { rent: a.rent, remaining: a.remaining, paid: a.paid, partial: a.partial, termLabel: a.termLabel, termEnd: a.termEnd, dueDate: a.dueDate, daysUntilDue: a.daysUntilDue } : null,
    tenant: r.tenant && {
      name: properName(r.tenant.name), phone: r.tenant.phone, reminderDay: r.tenant.reminderDay,
      moveInDate: r.tenant.moveInDate, leaseEndDate: r.tenant.leaseEndDate, notes: r.tenant.notes,
    },
    history: r.roomIncomes.map((h) => ({ id: h.id, year: h.period.year, month: h.period.month, status: h.status, amount: h.amount })),
  };
}
