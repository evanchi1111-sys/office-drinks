-- =====================================================================
-- 升級 01：管理者可以刪除「已結束」的團（含訂單）
-- 用法：Supabase → SQL Editor → New query → 貼上 → Run（可重複執行）
-- =====================================================================

create or replace function public.od_session_delete(p_password text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := public.od__check_admin(p_password); v public.od_sessions;
begin
  if e is not null then return public.od__fail(e, 'admin'); end if;
  select * into v from public.od_sessions where id = p_id;
  if not found then return jsonb_build_object('ok', true); end if;
  if v.status <> 'closed' then return public.od__fail('只能刪除已結束的團，請先按「結束訂購」'); end if;
  delete from public.od_sessions where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.od_session_delete(text, text) to anon, authenticated;
