"use client";

import { useRouter } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react";
import { SelectPill, type SelectOption } from "./kit-client";

export function MonthSelect({ options, value, tab }: { options: SelectOption[]; value: string; tab: string }) {
  const router = useRouter();
  return (
    <SelectPill key={value} ariaLabel="Month" icon={CalendarBlank} options={options} defaultValue={value}
      className="min-w-48 flex-1"
      onChange={(v) => router.push(`/kas/${v}?tab=${tab}`, { scroll: false })} />
  );
}
