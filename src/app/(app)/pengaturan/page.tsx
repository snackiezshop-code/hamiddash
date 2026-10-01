import { db } from "@/lib/db";
import { addRecipient, toggleRecipient, updateRecipientBank } from "@/app/actions";
import { PageHeader, Section } from "@/components/ui";
import { AmountInput, SubmitButton } from "@/components/forms";
import { rupiah } from "@/lib/format";
import { BankAccount } from "@/components/bank";
import { SwitchSubmit } from "@/components/kit-client";
import { IconPlus } from "@/components/icons";

export default async function SettingsPage() {
  const recipients = await db.recipient.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Penerima transfer bulanan: pengurus, pewaris, bank" title="Pengaturan" />
      <div className="flex flex-col gap-4">
        <Section title="Penerima transfer">
          <ul className="divide-y divide-line">
            {recipients.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${r.isActive ? "" : "text-ink-soft line-through"}`}>{r.name}</div>
                    <div className="text-xs text-ink-soft">{[r.role, r.monthlyAmount ? rupiah(r.monthlyAmount) : null, r.isActive ? "Aktif" : "Nonaktif"].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <BankAccount bank={r.bankName} account={r.accountNumber} holder={r.accountHolder} />
                    <form action={toggleRecipient}>
                      <input type="hidden" name="id" value={r.id} />
                      <SwitchSubmit checked={r.isActive} label={`${r.name} aktif`} />
                    </form>
                  </div>
                </div>
                <details className="mt-1.5">
                  <summary className="eyebrow inline-flex min-h-11 cursor-pointer items-center text-ink-soft hover:text-ink">
                    Ubah nominal dan rekening
                  </summary>
                  <form action={updateRecipientBank} className="mt-2 grid grid-cols-[6rem_minmax(0,1fr)] gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="bankName" defaultValue={r.bankName ?? ""} placeholder="BSI" aria-label={`Bank ${r.name}`} className="field" />
                    <input name="accountNumber" defaultValue={r.accountNumber ?? ""} inputMode="numeric" placeholder="Nomor rekening"
                      aria-label={`Nomor rekening ${r.name}`} className="field num" />
                    <input name="accountHolder" defaultValue={r.accountHolder ?? ""} placeholder="Atas nama"
                      aria-label={`Atas nama rekening ${r.name}`} className="field col-span-2 sm:col-span-1" />
                    <AmountInput name="monthlyAmount" defaultValue={r.monthlyAmount} placeholder="Nominal transfer"
                      aria-label={`Nominal transfer ke ${r.name}`} className="field num col-span-2 sm:col-span-3" />
                    <SubmitButton className="btn-primary btn-sm" pendingText="Menyimpan…">Simpan</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Mencentang transfer terkirim menambahkan nominalnya ke pengeluaran bulan itu. Penerima nonaktif tidak muncul di
            daftar transfer berikutnya. Catatan transfer lama tetap tersimpan.
          </p>
        </Section>

        <form action={addRecipient} className="card flex flex-col gap-3">
          <h2 className="eyebrow text-ink-soft">Tambah penerima</h2>
          <div>
            <label className="label" htmlFor="name">Nama</label>
            <input id="name" name="name" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="role">Peran</label>
            <input id="role" name="role" list="roles" className="field" placeholder="Pengurus / Pewaris / Bank" />
            <datalist id="roles">
              <option value="Pengurus" /><option value="Pewaris" /><option value="Bank" />
            </datalist>
          </div>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <div>
              <label className="label" htmlFor="bankName">Bank</label>
              <input id="bankName" name="bankName" className="field" placeholder="BSI" />
            </div>
            <div>
              <label className="label" htmlFor="accountNumber">Nomor rekening</label>
              <input id="accountNumber" name="accountNumber" inputMode="numeric" className="field num" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="accountHolder">Atas nama</label>
            <input id="accountHolder" name="accountHolder" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="monthlyAmount">Nominal transfer</label>
            <AmountInput id="monthlyAmount" name="monthlyAmount" className="field num" />
          </div>
          <SubmitButton pendingText="Menyimpan…"><IconPlus width={16} /> Tambah penerima</SubmitButton>
        </form>
      </div>
    </>
  );
}
