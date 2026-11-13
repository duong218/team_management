-- 18_lich_su_chi_doc.sql
-- Chặn bình luận mới ở task thuộc công việc đã kết thúc; dữ liệu lịch sử vẫn đọc được.
begin;

create or replace function public.them_binh_luan(p_task uuid, p_binh_luan text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_task_state text; v_project_state text;
begin
 select t.project_id,t.trang_thai,p.trang_thai
 into v_project,v_task_state,v_project_state
 from public.tasks t join public.projects p on p.id=t.project_id
 where t.id=p_task;
 select id into v_member from public.members
 where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if not public.co_quyen_task(p_task)
    or char_length(btrim(coalesce(p_binh_luan,''))) not between 1 and 2000
    or v_task_state='da_huy'
    or v_project_state<>'dang_hoat_dong' then
   raise exception 'Không có quyền hoặc công việc đã kết thúc';
 end if;
 insert into public.task_comments(task_id,user_id,noi_dung)
 values(p_task,auth.uid(),btrim(p_binh_luan));
 perform public.ghi_log(v_project,p_task,v_member,'them_binh_luan');
end; $$;

revoke all on function public.them_binh_luan(uuid,text) from public,anon;
grant execute on function public.them_binh_luan(uuid,text) to authenticated;

commit;
