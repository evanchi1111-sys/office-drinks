import { z } from "zod";
import { callApi } from "../../helpers/apiClient";
import { orderFieldsSchema } from "../../helpers/drinkTypes";

export const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    sessionId: z.string().min(1).max(40),
    orders: z.array(orderFieldsSchema).min(1).max(30),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().min(1).max(40),
    order: orderFieldsSchema,
  }),
  z.object({ action: z.literal("delete"), id: z.string().min(1).max(40) }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { count: number };

export const postOrdersManage = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("orders/manage", "POST", schema.parse(body), init);