-- Chỉ trưởng nhóm được tự duyệt task do mình nhận; phó nhóm vẫn duyệt task của người khác.
-- Chạy sau các migration 01–30.

create or replace function public.co_the_duyet_task(p_task uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_member uuid;
  v_role text;
  v_is_assigned boolean;
begin
  select t.project_id into v_project
  from public.tasks t
  where t.id = p_task;

  if v_project is null then
    return false;
  end if;

  select m.id, m.vai_tro into v_member, v_role
  from public.members m
  where m.project_id = v_project
    and m.user_id = auth.uid()
    and m.trang_thai = 'dang_tham_gia';

  if v_role is null or v_role not in ('truong_nhom', 'pho_nhom') then
    return false;
  end if;

  select exists (
    select 1
    from public.task_assignees a
    where a.task_id = p_task
      and a.member_id = v_member
      and a.trang_thai = 'dang_lam'
  ) into v_is_assigned;

  return not v_is_assigned or v_role = 'truong_nhom';
end;
$$;

revoke all on function public.co_the_duyet_task(uuid)
  from public, anon, authenticated;

create or replace function public.duyet_task(p_task uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_actor uuid;
  v_role text;
  v_is_assigned boolean;
  v_owner uuid;
begin
  select t.project_id, t.trang_thai
    into v_project, v_state
  from public.tasks t
  where t.id = p_task
  for update;

  if v_project is null then
    raise exception 'Không tìm thấy task';
  end if;

  select m.id, m.vai_tro into v_actor, v_role
  from public.members m
  where m.project_id = v_project
    and m.user_id = auth.uid()
    and m.trang_thai = 'dang_tham_gia';

  if v_role is null or v_role not in ('truong_nhom', 'pho_nhom') then
    raise exception 'Chỉ trưởng/phó nhóm mới được duyệt task';
  end if;

  if v_state <> 'cho_duyet' then
    raise exception 'Task không ở trạng thái Chờ duyệt';
  end if;

  select exists (
    select 1
    from public.task_assignees a
    where a.task_id = p_task
      and a.member_id = v_actor
      and a.trang_thai = 'dang_lam'
  ) into v_is_assigned;

  if v_is_assigned and v_role <> 'truong_nhom' then
    raise exception 'Chỉ trưởng nhóm mới được tự duyệt task của mình';
  end if;

  if exists (
    select 1
    from public.task_checklist c
    where c.task_id = p_task
      and c.trang_thai_muc = 'da_duyet'
      and (
        not c.da_xong
        or not exists (
          select 1
          from public.task_links l
          where l.muc_id = c.id
            and l.trang_thai_link = 'hop_le'
        )
      )
  ) then
    raise exception 'Có mục thiếu minh chứng hợp lệ';
  end if;

  update public.tasks
  set trang_thai = 'hoan_thanh', tien_do = 100, cap_nhat_luc = now()
  where id = p_task;

  perform public.ghi_log(
    v_project,
    p_task,
    v_actor,
    case when v_is_assigned then 'tu_duyet' else 'duyet_task' end,
    100,
    100
  );

  for v_owner in
    select a.member_id
    from public.task_assignees a
    where a.task_id = p_task and a.trang_thai = 'dang_lam'
  loop
    perform public.gui_thong_bao(
      v_owner, 'task_hoan_thanh', p_task, 'Task đã được duyệt hoàn thành'
    );
  end loop;
end;
$$;

revoke all on function public.duyet_task(uuid) from public, anon;
grant execute on function public.duyet_task(uuid) to authenticated;
