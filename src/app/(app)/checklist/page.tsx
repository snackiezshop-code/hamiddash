import { db } from "@/lib/db";
import { formatDate, todayJakarta } from "@/lib/format";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/actions";
import { Empty, PageHeader, Section } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { IconCheck, IconPlus, IconTrash } from "@/components/icons";

const CATEGORIES = ["Cleaning", "Maintenance", "Admin", "Other"];
const CAT_TONE: Record<string, string> = {
  Cleaning: "bg-mint text-mint-deep",
  Maintenance: "bg-butter text-butter-deep",
  Admin: "bg-peri text-peri-deep",
};

export default async function ChecklistPage() {
  const [items, rooms] = await Promise.all([
    db.checklistItem.findMany({ orderBy: [{ isDone: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] }),
    db.room.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true } }),
  ]);
  const roomNo = new Map(rooms.map((r) => [r.id, r.number]));
  const open = items.filter((i) => !i.isDone);
  const done = items.filter((i) => i.isDone).slice(0, 20);
  const today = todayJakarta();

  const Row = ({ item }: { item: (typeof items)[number] }) => {
    const overdue = !item.isDone && item.dueDate && item.dueDate < today;
    return (
      <li className="flex items-center gap-3 py-2.5">
        <form action={toggleChecklistItem}>
          <input type="hidden" name="id" value={item.id} />
          <button aria-label={item.isDone ? "Mark as not done" : "Mark as done"}
            className={`grid h-6 w-6 cursor-pointer place-items-center rounded-lg border-2 ${item.isDone ? "border-mint-deep bg-mint-deep text-mint" : "border-ink/30 hover:border-ink"}`}>
            {item.isDone && <IconCheck width={14} height={14} strokeWidth={3} />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${item.isDone ? "text-ink-soft line-through" : ""}`}>{item.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.category && <span className={`pill ${CAT_TONE[item.category] ?? "bg-cream"}`}>{item.category}</span>}
            {item.roomId && roomNo.has(item.roomId) && <span className="pill bg-cream">Room {roomNo.get(item.roomId)}</span>}
            {item.dueDate && (
              <span className={`pill num ${overdue ? "bg-blush text-blush-deep" : "bg-cream"}`}>
                {overdue ? "Overdue · " : ""}{formatDate(item.dueDate)}
              </span>
            )}
          </div>
        </div>
        <form action={deleteChecklistItem}>
          <input type="hidden" name="id" value={item.id} />
          <ConfirmButton message={`Delete task "${item.title}"?`} aria-label="Delete"
            className="cursor-pointer rounded-full p-1.5 text-ink-soft hover:bg-blush hover:text-blush-deep">
            <IconTrash width={16} height={16} />
          </ConfirmButton>
        </form>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Checklist" subtitle="Cleaning, maintenance and admin tasks" />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <Section title="To do" action={<span className="pill bg-butter text-butter-deep">{open.length}</span>}>
            {open.length === 0 ? <Empty>All tasks are done.</Empty> : (
              <ul className="divide-y divide-line">{open.map((i) => <Row key={i.id} item={i} />)}</ul>
            )}
          </Section>
          {done.length > 0 && (
            <Section title="Done">
              <ul className="divide-y divide-line">{done.map((i) => <Row key={i.id} item={i} />)}</ul>
            </Section>
          )}
        </div>

        <form action={addChecklistItem} className="card flex h-fit flex-col gap-3 bg-peri text-peri-deep">
          <h2 className="h-display text-lg text-ink">New task</h2>
          <div>
            <label className="label" htmlFor="title">Task</label>
            <input id="title" name="title" required className="field text-ink" placeholder="e.g. Clean the water tank" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" name="category" className="field text-ink" defaultValue="Cleaning">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="roomId">Room</label>
              <select id="roomId" name="roomId" className="field text-ink" defaultValue="">
                <option value="">—</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="dueDate">Due date</label>
            <input id="dueDate" name="dueDate" type="date" className="field num text-ink" />
          </div>
          <SubmitButton pendingText="Saving…"><IconPlus width={16} height={16} /> Add task</SubmitButton>
        </form>
      </div>
    </>
  );
}
