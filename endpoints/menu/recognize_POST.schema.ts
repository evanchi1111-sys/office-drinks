import { z } from "zod";
import { callApi } from "../../helpers/apiClient";
import type { MenuItem, Topping } from "../../helpers/drinkTypes";

export const schema = z.object({
  password: z.string().min(1).max(200),
  // data URL of an image (png/jpeg/webp) or a PDF
  dataUrl: z
    .string()
    .max(7_000_000)
    .regex(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { sizes: string[]; items: MenuItem[]; toppings: Topping[] };

export const postMenuRecognize = (body: InputType, init?: RequestInit) =>
  callApi<OutputType>("menu/recognize", "POST", schema.parse(body), init);