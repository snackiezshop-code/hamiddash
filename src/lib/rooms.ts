import type { Prisma } from "@/generated/prisma/client";
import type { DrawerRoom } from "@/components/room-drawer";

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

export function toDrawerRoom(r: RoomWithDrawerData): DrawerRoom {
  return {
    id: r.id, number: r.number, status: r.status, monthlyRent: r.monthlyRent,
    tenant: r.tenant && {
      name: r.tenant.name, phone: r.tenant.phone, reminderDay: r.tenant.reminderDay,
      moveInDate: r.tenant.moveInDate, leaseEndDate: r.tenant.leaseEndDate, notes: r.tenant.notes,
    },
    history: r.roomIncomes.map((h) => ({ id: h.id, year: h.period.year, month: h.period.month, status: h.status, amount: h.amount })),
  };
}
