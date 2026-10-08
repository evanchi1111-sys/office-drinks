import type { Shop, Unit, SessionRow, OrderRow } from "../helpers/drinkTypes";
import { callApi } from "../helpers/apiClient";

export type OutputType = {
  shops: Shop[];
  units: Unit[];
  sessions: SessionRow[];
  orders: OrderRow[];
};

export const getState = (init?: RequestInit) =>
  callApi<OutputType>("state", "GET", undefined, init);