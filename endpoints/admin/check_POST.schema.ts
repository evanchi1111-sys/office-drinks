import { z } from "zod";
import { callApi } from "../../helpers/apiClient";

export const schema = z.object({ password: z.string().min(1).max(200) });
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postAdminCheck = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("admin/check", "POST", schema.parse(body), init);