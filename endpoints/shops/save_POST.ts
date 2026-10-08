import superjson from "superjson";
import { nanoid } from "nanoid";
import { schema, OutputType } from "./save_POST.schema";
import { db } from "../../helpers/db";
import { ok, fail, errMessage, assertAdmin } from "../../helpers/endpointUtils";

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    assertAdmin(input.password);
    const { shop } = input;
    const id = shop.id ?? nanoid(10);
    await db
      .insertInto("shops")
      .values({ id, name: shop.name, phone: shop.phone, sizes: shop.sizes, items: shop.items, toppings: shop.toppings })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: shop.name,
          phone: shop.phone,
          sizes: shop.sizes,
          items: shop.items,
          toppings: shop.toppings,
        }),
      )
      .execute();
    return ok({
      shop: { id, name: shop.name, phone: shop.phone, sizes: shop.sizes, items: shop.items, toppings: shop.toppings },
    } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 400);
  }
}