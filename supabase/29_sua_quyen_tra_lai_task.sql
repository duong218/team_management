-- Cho phép quản lý trả task về làm lại kể cả khi họ cũng là người được giao.
-- Quy tắc không tự duyệt chỉ áp dụng cho duyet_task, không áp dụng cho trả lại.
-- Chạy sau các migration 01–28.

create or replace function public.tra_lai_task(
  p_task uuid,
  p_ly_do text,
  p_bo_tick uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_owner uuid;
  v_before numeric;
begin
  select t.project_id, t.trang_thai
    into v_project, v_state
  from public.tasks t
  where t.id = p_task
  for update;

  if v_project is null then
    raise exception 'Không tìm thấy task';
  end if;
  if not public.la_quan_ly(v_project) then
    raise exception 'Chỉ trưởng/phó nhóm mới được trả lại task';
  end if;
  if v_state <> 'cho_duyet' then
    raise exception 'Task không ở trạng thái Chờ duyệt';
  end if;
  if char_length(btrim(coalesce(p_ly_do, ''))) < 10 then
    raise exception 'Lý do cần ít nhất 10 ký tự';
  end if;

  v_before := public.tien_do_task(p_task);

  update public.task_checklist
  set da_xong = false,
      nguoi_hoan_thanh = null,
      thoi_gian_hoan_thanh = null
  where task_id = p_task
    and id = any(coalesce(p_bo_tick, '{}'::uuid[]));

  update public.tasks
  set trang_thai = 'dang_lam',
      tien_do = public.tien_do_task(p_task),
      cap_nhat_luc = now()
  where id = p_task;

  perform public.ghi_log(
    v_project,
    p_task,
    null,
    'tra_lai_task: ' || left(p_ly_do, 1000),
    v_before,
    public.tien_do_task(p_task)
  );

  for v_owner in
    select a.member_id
    from public.task_assignees a
    where a.task_id = p_task and a.trang_thai = 'dang_lam'
  loop
    perform public.gui_thong_bao(
      v_owner,
      'task_tra_lai',
      p_task,
      'Task bị trả lại: ' || left(p_ly_do, 900)
    );
  end loop;
end;
$$;

revoke all on function public.tra_lai_task(uuid, text, uuid[])
  from public, anon;
grant execute on function public.tra_lai_task(uuid, text, uuid[])
  to authenticated;
