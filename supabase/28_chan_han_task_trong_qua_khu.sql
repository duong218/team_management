-- Chặn trưởng/phó nhóm đổi hạn task sang thời điểm đã qua.
-- Chạy sau 27_diem_ho_tro_va_bao_cao_dong_gop.sql.

create or replace function public.cap_nhat_task(
  p_task uuid,
  p_tieu_de text,
  p_mo_ta text,
  p_han_chot timestamptz,
  p_ly_do_han text,
  p_cap_nhat_luc timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_old_due timestamptz;
  v_current timestamptz;
begin
  select project_id, trang_thai, han_chot, cap_nhat_luc
    into v_project, v_state, v_old_due, v_current
  from public.tasks
  where id = p_task
  for update;

  if v_project is null or not public.la_quan_ly(v_project) then
    raise exception 'Không tìm thấy task hoặc bạn không có quyền';
  end if;
  if v_state in ('cho_duyet', 'hoan_thanh', 'da_huy') then
    raise exception 'Task đang bị khóa';
  end if;
  if p_cap_nhat_luc is null or p_cap_nhat_luc is distinct from v_current then
    raise exception 'Task đã được người khác sửa; hãy tải lại rồi thử lại';
  end if;
  if char_length(btrim(coalesce(p_tieu_de, ''))) not between 1 and 200
    or char_length(coalesce(p_mo_ta, '')) > 5000 then
    raise exception 'Tiêu đề hoặc mô tả vượt giới hạn';
  end if;
  if p_han_chot is distinct from v_old_due
    and p_han_chot is not null
    and p_han_chot <= now() then
    raise exception 'Hạn chót mới phải là thời gian trong tương lai';
  end if;
  if p_han_chot is distinct from v_old_due
    and char_length(btrim(coalesce(p_ly_do_han, ''))) not between 10 and 1000 then
    raise exception 'Đổi hạn cần lý do từ 10 đến 1000 ký tự';
  end if;

  update public.task_details
  set tieu_de = btrim(p_tieu_de), mo_ta = coalesce(p_mo_ta, '')
  where task_id = p_task;
  update public.tasks
  set han_chot = p_han_chot, cap_nhat_luc = now()
  where id = p_task;

  perform public.ghi_log(v_project, p_task, null, 'cap_nhat_task');
  if p_han_chot is distinct from v_old_due then
    perform public.ghi_log(
      v_project,
      p_task,
      null,
      'doi_han_chot:' || coalesce(v_old_due::text, 'chua_dat') || '->'
        || coalesce(p_han_chot::text, 'xoa') || ':' || left(btrim(p_ly_do_han), 500)
    );
  end if;
end;
$$;

create or replace function public.chuyen_giao_task(
  p_task uuid,
  p_tu_member uuid,
  p_den_member uuid,
  p_loai text,
  p_ly_do text,
  p_han_moi timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_progress numeric;
  v_new uuid;
  v_role text;
  v_old_user uuid;
  v_new_user uuid;
  v_old_due timestamptz;
begin
  select project_id, trang_thai, tien_do, han_chot
    into v_project, v_state, v_progress, v_old_due
  from public.tasks
  where id = p_task
  for update;

  if not public.la_quan_ly(v_project) or v_state not in ('can_lam', 'dang_lam') then
    raise exception 'Chỉ quản lý được chuyển task Cần làm/Đang làm';
  end if;
  if p_loai not in ('khach_quan', 'chua_kip')
    or char_length(btrim(coalesce(p_ly_do, ''))) < 10 then
    raise exception 'Chọn loại chuyển và nhập lý do từ 10 ký tự';
  end if;
  if p_han_moi is not null and p_han_moi is distinct from v_old_due and p_han_moi <= now() then
    raise exception 'Hạn chót mới phải là thời gian trong tương lai';
  end if;

  select a.vai_tro_trong_task, m.user_id into v_role, v_old_user
  from public.task_assignees a
  join public.members m on m.id = a.member_id
  where a.task_id = p_task and a.member_id = p_tu_member
    and (a.trang_thai = 'dang_lam' or (
      a.trang_thai = 'da_go' and m.trang_thai = 'da_roi'
      and a.vai_tro_trong_task = 'chinh'
      and exists (
        select 1 from public.loai_nguoi l
        where l.member_id = m.id and l.project_id = v_project and l.xu_ly_tien_do = 'giu'
      )
    ))
  for update of a;
  if v_role is null then raise exception 'Người chuyển không còn được giao task'; end if;
  if v_role <> 'chinh' then raise exception 'Người hỗ trợ được gỡ khỏi task, không chuyển giao vai trò chính'; end if;

  select user_id into v_new_user
  from public.members
  where id = p_den_member and project_id = v_project and trang_thai = 'dang_tham_gia';
  if v_new_user is null or v_new_user = v_old_user then
    raise exception 'Người nhận phải là thành viên đang tham gia khác';
  end if;

  update public.task_assignees set trang_thai = 'da_chuyen'
  where task_id = p_task and member_id = p_tu_member;
  insert into public.task_assignees(task_id, member_id, vai_tro_trong_task, trang_thai, giao_boi)
  values (p_task, p_den_member, 'chinh', 'dang_lam', auth.uid())
  on conflict (task_id, member_id) do update
    set vai_tro_trong_task = 'chinh', trang_thai = 'dang_lam', giao_boi = auth.uid();
  insert into public.task_chuyen_giao(
    task_id, tu_member, den_member, nguoi_chuyen, tien_do_luc_chuyen, loai_chuyen, ly_do
  ) values (p_task, p_tu_member, p_den_member, auth.uid(), v_progress, p_loai, btrim(p_ly_do))
  returning id into v_new;
  update public.tasks
  set han_chot = coalesce(p_han_moi, han_chot), cap_nhat_luc = now()
  where id = p_task;

  if p_han_moi is not null and p_han_moi is distinct from v_old_due then
    perform public.ghi_log(
      v_project, p_task, null,
      'doi_han_chot_khi_chuyen:' || coalesce(v_old_due::text, 'chua_dat')
        || '->' || p_han_moi::text || ':' || left(btrim(p_ly_do), 500)
    );
  end if;
  for v_new_user in
    select member_id from public.task_yeu_cau where task_id = p_task and trang_thai = 'dang_cho'
  loop
    perform public.gui_thong_bao(
      v_new_user, 'yeu_cau_chuyen_giao_da_xu_ly', p_task,
      'Yêu cầu chuyển giao đã được xử lý do task chuyển người chính'
    );
  end loop;
  update public.task_yeu_cau
  set trang_thai = 'da_chuyen', xu_ly_boi = auth.uid(), thoi_gian_xu_ly = now()
  where task_id = p_task and trang_thai = 'dang_cho';
  perform public.ghi_log(v_project, p_task, p_tu_member, 'chuyen_giao:' || p_loai, v_progress, v_progress);
  perform public.gui_thong_bao(p_tu_member, 'task_chuyen_di', p_task, 'Task đã chuyển cho thành viên khác: ' || left(p_ly_do, 900));
  perform public.gui_thong_bao(p_den_member, 'task_nhan_chuyen_giao', p_task, 'Bạn nhận task đã làm được ' || v_progress || '%');
  return v_new;
end;
$$;

revoke all on function public.cap_nhat_task(uuid, text, text, timestamptz, text, timestamptz)
  from public, anon;
grant execute on function public.cap_nhat_task(uuid, text, text, timestamptz, text, timestamptz)
  to authenticated;
revoke all on function public.chuyen_giao_task(uuid, uuid, uuid, text, text, timestamptz)
  from public, anon;
grant execute on function public.chuyen_giao_task(uuid, uuid, uuid, text, text, timestamptz)
  to authenticated;
