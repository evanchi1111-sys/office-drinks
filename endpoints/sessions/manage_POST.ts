import superjson from "superjson";
import { nanoid } from "nanoid";
import { schema, OutputType } from "./manage_POST.schema";
import { db } from "../../helpers/db";
import { ok, fail, errMessage } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.action === "create") {
      const shop = await db
        .selectFrom("shops")
        .select(["id", "name"])
        .where("id", "=", input.shopId)
        .executeTakeFirst();
      if (!shop) return fail("找不到這家飲料店", 404);
      const id = nanoid(10);
      await db
        .insertInto("sessions")
        .values({
          id,
          title: input.title,
          shopId: shop.id,
          shopName: shop.name,
          status: "open",
          participants: input.participants ?? null,
        })
        .execute();
      return ok({ id } satisfies OutputType);
    }
    if (input.action === "setParticipants") {
      await db
        .updateTable("sessions")
        .set({ participants: input.participants })
        .where("id", "=", input.id)
        .execute();
      return ok({ id: input.id } satisfies OutputType);
    }
    if (input.action === "delete") {
      await db.deleteFrom("sessions").where("id", "=", input.id).execute();
    } else {
      await db
        .updateTable("sessions")
        .set({ status: input.action === "close" ? "closed" : "open" })
        .where("id", "=", input.id)
        .execute();
    }
    return ok({ id: input.id } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 400);
  }
}