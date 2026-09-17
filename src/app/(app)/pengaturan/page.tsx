import { db } from "@/lib/db";
import { addRecipient, toggleRecipient, updateRecipientBank } from "@/app/actions";
import { PageHeader, Section } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { BankAccount } from "@/components/bank";
import { SwitchSubmit } from "@/components/kit-client";
import { IconPlus } from "@/components/icons";

export default async function SettingsPage() {
  const recipients = await db.recipient.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Settings" subtitle="Monthly transfer recipients (caretaker, heirs, bank)" />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Section title="Transfer recipients">
          <ul className="divide-y divide-line">
            {recipients.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${r.isActive ? "" : "text-ink-soft line-through"}`}>{r.name}</div>
                    <div className="text-xs text-ink-soft">{[r.role, r.isActive ? "Active" : "Inactive"].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <BankAccount bank={r.bankName} account={r.accountNumber} holder={r.accountHolder} />
                    <form action={toggleRecipient}>
                      <input type="hidden" name="id" value={r.id} />
                      <SwitchSubmit checked={r.isActive} label={`${r.name} active`} />
                    </form>
                  </div>
                </div>
                <details className="mt-1.5">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold text-ink-soft hover:text-ink">
                    {r.accountNumber ? "Edit bank account" : "Add bank account"}
                  </summary>
                  <form action={updateRecipientBank} className="mt-2 grid grid-cols-[6rem_minmax(0,1fr)] gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="bankName" defaultValue={r.bankName ?? ""} placeholder="BSI" aria-label={`Bank for ${r.name}`} className="field" />
                    <input name="accountNumber" defaultValue={r.accountNumber ?? ""} inputMode="numeric" placeholder="Account number"
                      aria-label={`Account number for ${r.name}`} className="field num" />
                    <input name="accountHolder" defaultValue={r.accountHolder ?? ""} placeholder="Name on account"
                      aria-label={`Account holder for ${r.name}`} className="field col-span-2 sm:col-span-1" />
                    <SubmitButton className="btn-primary btn-sm" pendingText="Saving…">Save</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Inactive recipients are left off future transfer checklists. Past transfer records are kept.
          </p>
        </Section>

        <form action={addRecipient} className="card flex h-fit flex-col gap-3 bg-butter">
          <h2 className="h-display text-lg">Add recipient</h2>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="role">Role</label>
            <input id="role" name="role" list="roles" className="field" placeholder="Caretaker / Heir / Bank" />
            <datalist id="roles">
              <option value="Caretaker" /><option value="Heir" /><option value="Bank" />
            </datalist>
          </div>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <div>
              <label className="label" htmlFor="bankName">Bank</label>
              <input id="bankName" name="bankName" className="field" placeholder="BSI" />
            </div>
            <div>
              <label className="label" htmlFor="accountNumber">Account number</label>
              <input id="accountNumber" name="accountNumber" inputMode="numeric" className="field num" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="accountHolder">Name on account</label>
            <input id="accountHolder" name="accountHolder" className="field" />
          </div>
          <SubmitButton pendingText="Saving…"><IconPlus width={16} height={16} /> Add</SubmitButton>
        </form>
      </div>
    </>
  );
}
