import "server-only";
import { db } from "./db";
import { MONTHS_SHORT, daysBetween, todayJakarta } from "./format";

// Yearly rent (rooms on status TAHUNAN). The paid-up term ends on the tenant's leaseEndDate; the
// room's annualRent is the price. Instalments are "Pemasukan lain" rows tagged with the room and
// the end date of the term they pay for. Recording the first instalment of a new term moves the
// term end forward 12 months; until the price is covered, the rest is owed from that term's start.

export type AnnualState = {
  roomId: string;
  roomNumber: number;
  tenantName: string;
  phone: string | null;
  rent: number;
  termEnd: Date; // end of the paid-up (or part-paid) term: the tenant's leaseEndDate
  partial: boolean; // instalment(s) recorded for the current term, the rest still owed
  paid: number; // recorded so far for the term being paid (0 for a renewal)
  remaining: number; // what's owed now: the rest of this term, or a full renewal
  dueDate: Date; // when it was or is due: the day the unpaid term starts minus one (the old term end)
  daysUntilDue: number; // negative once late
  payTermStart: Date; // the term the money is for
  payTermEnd: Date;
  termLabel: string; // "Okt 2026–Sep 2027"
};

export function addMonths(d: Date, n: number) {
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last)));
}

const DAY = 24 * 60 * 60 * 1000;
const label = (start: Date, end: Date) =>
  `${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()}–${MONTHS_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;

type RoomInput = { id: string; number: number; status: string; annualRent: number | null; tenant: { name: string; phone: string | null; leaseEndDate: Date | null } | null };

export function annualStateOf(room: RoomInput, paidForTerm: (termEnd: Date) => number, today: Date): AnnualState | null {
  if (room.status !== "TAHUNAN" || !room.annualRent || !room.tenant?.leaseEndDate) return null;
  const rent = room.annualRent;
  const termEnd = room.tenant.leaseEndDate;
  const paid = paidForTerm(termEnd);
  const partial = paid > 0 && paid < rent;
  const payTermEnd = partial ? termEnd : addMonths(termEnd, 12);
  const payTermStart = new Date((partial ? addMonths(termEnd, -12) : termEnd).getTime() + DAY);
  const dueDate = new Date(payTermStart.getTime() - DAY);
  return {
    roomId: room.id, roomNumber: room.number, tenantName: room.tenant.name, phone: room.tenant.phone,
    rent, termEnd, partial, paid: partial ? paid : 0, remaining: partial ? rent - paid : rent,
    dueDate, daysUntilDue: daysBetween(today, dueDate),
    payTermStart, payTermEnd, termLabel: label(payTermStart, payTermEnd),
  };
}

// Every yearly room with a price and a term end, keyed by room id.
export async function annualStates(today: Date = todayJakarta()): Promise<Map<string, AnnualState>> {
  const [rooms, incomes] = await Promise.all([
    db.room.findMany({ where: { status: "TAHUNAN" }, include: { tenant: true } }),
    db.additionalIncome.findMany({ where: { annualRoomId: { not: null } }, select: { annualRoomId: true, annualTermEnd: true, amount: true } }),
  ]);
  const out = new Map<string, AnnualState>();
  for (const room of rooms) {
    const paidFor = (end: Date) => incomes
      .filter((i) => i.annualRoomId === room.id && i.annualTermEnd?.getTime() === end.getTime())
      .reduce((s, i) => s + i.amount, 0);
    const st = annualStateOf(room, paidFor, today);
    if (st) out.set(room.id, st);
  }
  return out;
}
