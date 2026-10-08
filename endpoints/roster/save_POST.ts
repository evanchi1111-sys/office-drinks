import superjson from "superjson";
import { nanoid } from "nanoid";
import { schema, OutputType } from "./save_POST.schema";
import { db } from "../../helpers/db";
import { ok, fail, errMessage, assertAdmin } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    assertAdmin(input.password);
    const rows = input.units.map((u, i) => ({
      id: u.id ?? nanoid(10),
      name: u.name,
      members: Array.from(new Set(u.members)),
      ord: i,
    }));
    await db.transaction().execute(async (trx) => {
      if (rows.length === 0) {
        await trx.deleteFrom("units").execute();
        return;
      }
      await trx
        .deleteFrom("units")
        .where("id", "not in", rows.map((r) => r.id))
        .execute();
      for (const r of rows) {
        await trx
          .insertInto("units")
          .values(r)
          .onConflict((oc) =>
            oc.column("id").doUpdateSet({ name: r.name, members: r.members, ord: r.ord }),
          )
          .execute();
      }
    });
    return ok({ ok: true } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 400);
  }
}