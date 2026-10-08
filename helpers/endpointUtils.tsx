import superjson from "superjson";
import { timingSafeEqual } from "crypto";

export function ok<T>(data: T): Response {
  return new Response(superjson.stringify(data));
}

export function fail(error: string, status = 400, code?: string): Response {
  return new Response(superjson.stringify({ error, code }), { status });
}

export function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e) {
    return "輸入資料格式不正確,請檢查後再試";
  }
  return e instanceof Error ? e.message : "發生未知錯誤";
}

/** Throws if the supplied admin password is wrong. */
export function assertAdmin(password: string): void {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("管理密碼尚未設定,請聯絡網站擁有者");
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("管理密碼不正確");
  }
}