import superjson from "superjson";
import { schema, OutputType } from "./check_POST.schema";
import { ok, fail, errMessage, assertAdmin } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    assertAdmin(input.password);
    return ok({ ok: true } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 401);
  }
}