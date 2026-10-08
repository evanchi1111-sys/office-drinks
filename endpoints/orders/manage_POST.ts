import superjson from "superjson";
import { nanoid } from "nanoid";
import { schema, OutputType } from "./manage_POST.schema";
import { db } from "../../helpers/db";
import { ok, fail, errMessage } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.action === "add") {
      const session = await db
        .selectFrom("sessions")
        .select(["id", "status"])
        .where("id", "=", input.sessionId)
        .executeTakeFirst();
      if (!session) return fail("找不到這個團", 404);
      if (session.status !== "open") return fail("這個團已經結束訂購了", 409);
      await db
        .insertInto("orders")
        .values(input.orders.map((o) => ({ id: nanoid(12), sessionId: session.id, ...o })))
        .execute();
      return ok({ count: input.orders.length } satisfies OutputType);
    }
    if (input.action === "update") {
      const row = await db
        .selectFrom("orders")
        .innerJoin("sessions", "sessions.id", "orders.sessionId")
        .select("sessions.status")
        .where("orders.id", "=", input.id)
        .executeTakeFirst();
      if (!row) return fail("找不到這筆訂單", 404);
      if (row.status !== "open") return fail("這個團已經結束訂購了", 409);
      await db.updateTable("orders").set(input.order).where("id", "=", input.id).execute();
      return ok({ count: 1 } satisfies OutputType);
    }
    await db.deleteFrom("orders").where("id", "=", input.id).execute();
    return ok({ count: 1 } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 400);
  }
}