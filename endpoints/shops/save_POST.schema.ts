import { z } from "zod";
import { callApi } from "../../helpers/apiClient";
import { shopInputSchema, type Shop } from "../../helpers/drinkTypes";

export const schema = z.object({
  password: z.string().min(1).max(200),
  shop: shopInputSchema,
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { shop: Shop };

export const postShopsSave = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("shops/save", "POST", schema.parse(body), init);