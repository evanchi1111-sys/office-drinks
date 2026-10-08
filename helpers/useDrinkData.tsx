import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getState } from "../endpoints/state_GET.schema";
import { postShopsSave } from "../endpoints/shops/save_POST.schema";
import { postShopsDelete } from "../endpoints/shops/delete_POST.schema";
import { postRosterSave } from "../endpoints/roster/save_POST.schema";
import { postSessionsManage, type InputType as SessionInput } from "../endpoints/sessions/manage_POST.schema";
import { postOrdersManage, type InputType as OrderInput } from "../endpoints/orders/manage_POST.schema";
import { postMenuRecognize } from "../endpoints/menu/recognize_POST.schema";
import { postAdminCheck } from "../endpoints/admin/check_POST.schema";
import { handleAdminError, setAdminPassword } from "./adminStore";

const KEY = ["state"] as const;

export function useAppState() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => getState(),
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });
}

function useInvalidating<TIn, TOut>(fn: (x: TIn) => Promise<TOut>, admin = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => {
      if (admin) handleAdminError(e);
      toast.error(e.message);
    },
  });
}

export const useSaveShop = () => useInvalidating(postShopsSave, true);
export const useDeleteShop = () => useInvalidating(postShopsDelete, true);
export const useSaveRoster = () => useInvalidating(postRosterSave, true);
export const useSessionAction = () => useInvalidating((b: SessionInput) => postSessionsManage(b));
export const useOrderAction = () => useInvalidating((b: OrderInput) => postOrdersManage(b));

export function useRecognizeMenu() {
  return useMutation({
    mutationFn: postMenuRecognize,
    onError: (e: Error) => {
      handleAdminError(e);
      toast.error(e.message);
    },
  });
}

export async function tryUnlock(password: string): Promise<boolean> {
  try {
    await postAdminCheck({ password });
    setAdminPassword(password);
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "密碼不正確");
    return false;
  }
}