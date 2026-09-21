import { db } from "@/lib/db";
import { formatDate, todayJakarta } from "@/lib/format";
import { deleteChecklistItem, toggleChecklistItem } from "@/app/actions";
import { Empty, PageHeader, Section } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { CountPill, IconBadge, ListRow, TASK_CATEGORIES, taskCategoryMeta } from "@/components/kit";
import { SegmentedLinks } from "@/components/kit-client";
import { QuickAddButton } from "@/components/quick-add";
import { IconCheck, IconPlus, IconTrash } from "@/components/icons";

export default async function ChecklistPage({ searchParams }: PageProps<"/checklist">) {
  const { status: statusParam, cat: catParam } = await searchParams;
  const status = statusParam === "done" ? "done" : "todo";
  const cat = TASK_CATEGORIES.some((c) => c.value === catParam) ? (catParam as string) : null;

  const [items, rooms] = await Promise.all([
    db.checklistItem.findMany({ orderBy: [{ isDone: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] }),
    db.room.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true } }),
  ]);
  const roomNo = new Map(rooms.map((r) => [r.id, r.number]));
  const today = todayJakarta();

  const inCat = (i: (typeof items)[number]) => !cat || taskCategoryMeta(i.category) === taskCategoryMeta(cat);
  const openCount = items.filter((i) => !i.isDone && inCat(i)).length;
  const doneCount = items.filter((i) => i.isDone && inCat(i)).length;
  const shown = items.filter((i) => i.isDone === (status === "done") && inCat(i));

  const href = (next: { status?: string; cat?: string | null }) => {
    const q = new URLSearchParams();
    const st = next.status ?? status;
    const c = next.cat === undefined ? cat : next.cat;
    if (st === "done") q.set("status", "done");
    if (c) q.set("cat", c);
    const qs = q.toString();
    return `/checklist${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Checklist" subtitle="Cleaning, maintenance and admin tasks"
        actions={<QuickAddButton kind="task" className="btn-primary"><IconPlus width={16} height={16} /> Add task</QuickAddButton>} />

      <div className="mb-3">
        <SegmentedLinks label="Show tasks" items={[
          { href: href({ status: "todo" }), label: `To do ${openCount}`, active: status === "todo" },
          { href: href({ status: "done" }), label: `Done ${doneCount}`, active: status === "done" },
        ]} />
      </div>
      <div className="mb-5">
        <SegmentedLinks label="Filter by category" items={[
          { href: href({ cat: null }), label: "All", active: !cat },
          ...TASK_CATEGORIES.map((c) => ({ href: href({ cat: c.value }), label: c.value, active: cat === c.value })),
        ]} />
      </div>

      <Section title={status === "done" ? "Done" : "To do"} action={<CountPill n={shown.length} />}>
        {shown.length === 0 ? (
          <Empty>
            {status === "done"
              ? `No finished ${cat ? cat.toLowerCase() + " " : ""}tasks yet.`
              : `Nothing to do${cat ? ` in ${cat.toLowerCase()}` : ""}. Add a task with the + button.`}
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((item) => {
              const meta = taskCategoryMeta(item.category);
              const overdue = !item.isDone && item.dueDate && item.dueDate < today;
              const room = item.roomId ? roomNo.get(item.roomId) : undefined;
              return (
                <li key={item.id}>
                  <ListRow wrapTitle
                    leading={<IconBadge icon={meta.icon} tone={meta.tone} />}
                    title={<span className={item.isDone ? "text-ink-soft line-through" : ""}>{item.title}</span>}
                    subtitle={[item.category, room !== undefined ? `Room ${room}` : null].filter(Boolean).join(" · ") || undefined}
                    trailing={
                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.dueDate && (
                          <span className={`num text-xs ${overdue ? "font-semibold text-blush-deep" : "text-ink-soft"}`}>
                            {overdue ? "Overdue " : ""}{formatDate(item.dueDate).replace(/ \d{4}$/, "")}
                          </span>
                        )}
                        {item.isDone && (
                          <form action={deleteChecklistItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <ConfirmButton message={`Delete task "${item.title}"?`} aria-label={`Delete task ${item.title}`}
                              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-terra-strong hover:text-[#F6F1E5]">
                              <IconTrash width={18} height={18} />
                            </ConfirmButton>
                          </form>
                        )}
                        <form action={toggleChecklistItem}>
                          <input type="hidden" name="id" value={item.id} />
                          <SubmitButton aria-label={item.isDone ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
                            className={`grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                              item.isDone ? "border-ink bg-ink text-cream" : "border-dashed border-ink/40 hover:border-ink"
                            }`}>
                            {item.isDone && <IconCheck width={18} height={18} strokeWidth={3} />}
                          </SubmitButton>
                        </form>
                      </div>
                    } />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
