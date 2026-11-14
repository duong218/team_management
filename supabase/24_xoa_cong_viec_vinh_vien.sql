-- 24_xoa_cong_viec_vinh_vien.sql
-- Xóa vĩnh viễn một công việc đã kết thúc cùng toàn bộ dữ liệu thuộc công việc đó.
-- Chạy sau file 23. Chỉ trưởng nhóm/phó nhóm đang tham gia được gọi.
begin;

create or replace function public.xoa_cong_viec_vinh_vien(p_project uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_state text;
begin
 if auth.uid() is null or not public.la_quan_ly(p_project) then
  raise exception 'Bạn không có quyền xóa công việc này';
 end if;

 select trang_thai into v_state from public.projects where id=p_project for update;
 if v_state is null then raise exception 'Không tìm thấy công việc'; end if;
 if v_state<>'luu_tru' then raise exception 'Chỉ xóa được công việc đã kết thúc'; end if;

 -- Trigger khóa ghi ở công việc lưu trữ; mở khóa tạm trong giao dịch này để xóa,
 -- trạng thái chưa commit không hiển thị cho phiên khác.
 update public.projects set trang_thai='dang_hoat_dong' where id=p_project;

 delete from public.thong_bao b using public.members m
  where b.member_id=m.id and m.project_id=p_project;
 delete from public.activity_log where project_id=p_project;
 delete from public.loai_nguoi where project_id=p_project;
 delete from public.chot_so_chi_tiet d using public.chot_so c
  where d.chot_so_id=c.id and c.project_id=p_project;
 delete from public.diem_thanh_vien d using public.chot_so c
  where d.chot_so_id=c.id and c.project_id=p_project;
 delete from public.chot_so where project_id=p_project;

 delete from public.task_links l using public.tasks t
  where l.task_id=t.id and t.project_id=p_project;
 delete from public.task_assignees a using public.tasks t
  where a.task_id=t.id and t.project_id=p_project;
 delete from public.task_votes v using public.tasks t
  where v.task_id=t.id and t.project_id=p_project;
 delete from public.task_chuyen_giao x using public.tasks t
  where x.task_id=t.id and t.project_id=p_project;
 delete from public.task_yeu_cau r using public.tasks t
  where r.task_id=t.id and t.project_id=p_project;
 delete from public.task_dong_gop_dieu_chinh d using public.tasks t
  where d.task_id=t.id and t.project_id=p_project;
 delete from public.task_comments c using public.tasks t
  where c.task_id=t.id and t.project_id=p_project;
 delete from public.task_checklist c using public.tasks t
  where c.task_id=t.id and t.project_id=p_project;
 delete from public.task_details d using public.tasks t
  where d.task_id=t.id and t.project_id=p_project;
 delete from public.tasks where project_id=p_project;

 delete from public.join_requests where project_id=p_project;
 delete from public.members where project_id=p_project;
 delete from public.projects where id=p_project;
end; $$;

revoke all on function public.xoa_cong_viec_vinh_vien(uuid) from public,anon;
grant execute on function public.xoa_cong_viec_vinh_vien(uuid) to authenticated;

commit;
