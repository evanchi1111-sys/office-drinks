import { z } from "zod";
import { callApi } from "../../helpers/apiClient";
import { participantSchema } from "../../helpers/drinkTypes";

const participants = z.array(participantSchema).max(600).nullable();

export const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(1).max(60),
    shopId: z.string().min(1).max(40),
    participants: participants.optional(),
  }),
  z.object({
    action: z.literal("setParticipants"),
    id: z.string().min(1).max(40),
    participants,
  }),
  z.object({ action: z.literal("close"), id: z.string().min(1).max(40) }),
  z.object({ action: z.literal("reopen"), id: z.string().min(1).max(40) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1).max(40) }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { id: string };

export const postSessionsManage = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("sessions/manage", "POST", schema.parse(body), init);