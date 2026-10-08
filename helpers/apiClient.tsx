import superjson from "superjson";

export async function callApi<T>(
  route: string,
  method: "GET" | "POST",
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/_api/${route}`, {
    method,
    body: method === "POST" ? superjson.stringify(body ?? {}) : undefined,
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = "發生錯誤,請稍後再試";
    try {
      msg = superjson.parse<{ error: string }>(text).error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return superjson.parse<T>(text);
}