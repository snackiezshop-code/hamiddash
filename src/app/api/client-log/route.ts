import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// Sink for reportClientIssue(): logged-in browsers only, one server log line per report.
export async function POST(request: Request) {
  if (!(await verifyToken((await cookies()).get(SESSION_COOKIE)?.value))) return new Response(null, { status: 401 });
  const body = (await request.text()).slice(0, 8000);
  console.error("[hamid] client issue", body);
  return new Response(null, { status: 204 });
}
