import superjson from "superjson";
import { schema, OutputType } from "./delete_POST.schema";
import { db } from "../../helpers/db";
import { ok, fail, errMessage, assertAdmin } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    assertAdmin(input.password);
    await db.deleteFrom("shops").where("id", "=", input.id).execute();
    return ok({ ok: true } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 400);
  }
}