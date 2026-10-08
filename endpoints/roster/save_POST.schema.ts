import { z } from "zod";
import { callApi } from "../../helpers/apiClient";
import { unitInputSchema } from "../../helpers/drinkTypes";

export const schema = z.object({
  password: z.string().min(1).max(200),
  units: z.array(unitInputSchema).max(100),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postRosterSave = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("roster/save", "POST", schema.parse(body), init);