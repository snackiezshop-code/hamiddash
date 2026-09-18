import { MONTHS, shiftMonth } from "./format";

// The heirs take turns: one of them receives the transfer each month, in this order.
// Keyed by recipient id so it survives renames. Everyone not listed (Max, BNI) is paid every month.
const HEIR_TURNS = [
  "cmu4zv2zr000hgnkevt7yh8e6", // Ferriyati (Mimi): August 2026
  "cmu4zv2zr000ignkeh425bc4x", // Laili Suhairi (Bunda): September 2026
  "cmu4zv2zr000jgnkezeb50knq", // Karyawati (Cecek): October 2026
  "cmu4zv2zs000kgnkexyndea9d", // Siti Lailina (Mama): November 2026
];
const FIRST_TURN = { year: 2026, month: 8 };

export type TransferDue =
  | { kind: "monthly" }
  | { kind: "turn" } // this heir's turn this month
  | { kind: "later"; label: string; monthsAhead: number }; // an heir whose turn is in a later month

export function transferDue(recipientId: string, year: number, month: number): TransferDue {
  const idx = HEIR_TURNS.indexOf(recipientId);
  if (idx < 0) return { kind: "monthly" };
  const elapsed = year * 12 + month - (FIRST_TURN.year * 12 + FIRST_TURN.month);
  const current = ((elapsed % HEIR_TURNS.length) + HEIR_TURNS.length) % HEIR_TURNS.length;
  const monthsAhead = (idx - current + HEIR_TURNS.length) % HEIR_TURNS.length;
  if (monthsAhead === 0) return { kind: "turn" };
  const next = shiftMonth(year, month, monthsAhead);
  return { kind: "later", label: MONTHS[next.month - 1].slice(0, 3), monthsAhead };
}

export const isDue = (d: TransferDue) => d.kind !== "later";

export const dueLabel = (d: TransferDue) => (d.kind === "monthly" ? "Monthly" : d.kind === "turn" ? "This month" : d.label);

// Due transfers first (monthly, then this month's heir), then the other heirs by how soon their turn comes.
export function dueOrder(d: TransferDue) {
  return d.kind === "monthly" ? 0 : d.kind === "turn" ? 1 : 1 + d.monthsAhead;
}
