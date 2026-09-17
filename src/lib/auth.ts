import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyToken } from "./session";

export async function requireAdmin() {
  const store = await cookies();
  if (!(await verifyToken(store.get(SESSION_COOKIE)?.value))) redirect("/login");
}
