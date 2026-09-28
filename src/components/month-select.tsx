"use client";

import { useRouter } from "next/navigation";
import { IconCalendar } from "./icons";
import { SelectPill, type SelectOption } from "./kit-client";

// hrefTemplate: where a picked month goes, with ":month" standing for its slug (e.g. "/kas/:month?tab=rent").
export function MonthSelect({ options, value, hrefTemplate }: { options: SelectOption[]; value: string; hrefTemplate: string }) {
  const router = useRouter();
  return (
    <SelectPill key={value} ariaLabel="Month" icon={IconCalendar} options={options} defaultValue={value}
      className="min-w-48 flex-1"
      onChange={(v) => router.push(hrefTemplate.replace(":month", v), { scroll: false })} />
  );
}
