-- Sửa thứ tự xóa thành viên để trigger không chặn khi xóa công việc đã lưu trữ.
begin;

create or replace function public.xoa_cong_viec_vinh_vien(p_project uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state text;
begin
  if auth.uid() is null or not public.la_quan_ly(p_project) then
    raise exception 'Bạn không có quyền xóa công việc này';
  end if;

  select trang_thai
    into v_state
    from public.projects
   where id = p_project
   for update;

  if v_state is null then
    raise exception 'Không tìm thấy công việc';
  end if;

  if v_state <> 'luu_tru' then
    raise exception 'Chỉ xóa được công việc đã kết thúc';
  end if;

  -- Mở khóa tạm trong giao dịch để trigger cho phép dọn dữ liệu.
  update public.projects
     set trang_thai = 'dang_hoat_dong'
   where id = p_project;

  delete from public.thong_bao b
  using public.members m
  where b.member_id = m.id
    and m.project_id = p_project;

  delete from public.activity_log
   where project_id = p_project;

  delete from public.loai_nguoi
   where project_id = p_project;

  delete from public.chot_so_chi_tiet d
  using public.chot_so c
  where d.chot_so_id = c.id
    and c.project_id = p_project;

  delete from public.diem_thanh_vien d
  using public.chot_so c
  where d.chot_so_id = c.id
    and c.project_id = p_project;

  delete from public.chot_so
   where project_id = p_project;

  delete from public.task_links l
  using public.tasks t
  where l.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_assignees a
  using public.tasks t
  where a.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_votes v
  using public.tasks t
  where v.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_chuyen_giao x
  using public.tasks t
  where x.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_yeu_cau r
  using public.tasks t
  where r.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_dong_gop_dieu_chinh d
  using public.tasks t
  where d.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_comments c
  using public.tasks t
  where c.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_checklist c
  using public.tasks t
  where c.task_id = t.id
    and t.project_id = p_project;

  delete from public.task_details d
  using public.tasks t
  where d.task_id = t.id
    and t.project_id = p_project;

  delete from public.tasks
   where project_id = p_project;

  delete from public.join_requests
   where project_id = p_project;

  -- Xóa người khác trước để người gọi vẫn còn là thành viên trong lúc trigger chạy.
  delete from public.members
   where project_id = p_project
     and user_id is distinct from auth.uid();

  -- Xóa người gọi cuối cùng.
  delete from public.members
   where project_id = p_project
     and user_id = auth.uid();

  delete from public.projects
   where id = p_project;
end;
$$;

revoke all
  on function public.xoa_cong_viec_vinh_vien(uuid)
  from public, anon;

grant execute
  on function public.xoa_cong_viec_vinh_vien(uuid)
  to authenticated;

commit;