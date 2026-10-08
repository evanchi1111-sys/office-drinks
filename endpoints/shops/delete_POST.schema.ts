import { z } from "zod";
import { callApi } from "../../helpers/apiClient";

export const schema = z.object({
  password: z.string().min(1).max(200),
  id: z.string().min(1).max(40),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postShopsDelete = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("shops/delete", "POST", schema.parse(body), init);