"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { CATEGORY_LABEL, CATEGORY_OPTIONS } from "@/lib/format";
import { Field, SelectPill } from "./kit-client";

// Category picker for expenses. Choosing "Other" asks for its name, so the cash book never just says "Other".
export function ExpenseCategoryField({ idPrefix, defaultCategory, defaultLabel }: {
  idPrefix: string;
  defaultCategory?: ExpenseCategory;
  defaultLabel?: string | null;
}) {
  const [category, setCategory] = useState<string>(defaultCategory ?? "");
  return (
    <>
      <div>
        <span className="label">Category</span>
        <SelectPill name="category" ariaLabel="Category" required requiredMessage="Choose a category"
          defaultValue={defaultCategory} onChange={setCategory}
          options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
      </div>
      {category === "LAINNYA" && (
        <Field label="Name this category" htmlFor={`${idPrefix}-catlabel`}>
          <input id={`${idPrefix}-catlabel`} name="categoryLabel" required defaultValue={defaultLabel ?? ""} autoComplete="off"
            placeholder="e.g. PBB, Iuran RT, Gas" className="field" />
        </Field>
      )}
    </>
  );
}
