-- 17_xoa_thanh_vien_khoi_danh_sach.sql
-- Ẩn thành viên đã rời khỏi danh sách; giữ nguyên các liên kết lịch sử task.
begin;

alter table public.members
  add column if not exists an_khoi_danh_sach boolean not null default false;

create or replace function public.ds_thanh_vien_quan_ly(p_project uuid)
returns table(member_id uuid,user_id uuid,ho_ten text,don_vi text,ma_dinh_danh text,vai_tro text,trang_thai text,ly_do_roi text,task_dang_lam bigint,chua_nhan_viec boolean,so_lan_bi_loai bigint,task_do bigint,anh_dai_dien text)
language sql stable security definer set search_path='' as $$
 select m.id,m.user_id,p.ho_ten,p.don_vi,pr.ma_dinh_danh,m.vai_tro,m.trang_thai,m.ly_do_roi,
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet')),
 not exists(select 1 from public.task_assignees a where a.member_id=m.id and a.trang_thai='dang_lam'),
 (select count(*) from public.loai_nguoi x where x.project_id=p_project and x.user_id=m.user_id),
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam')),
 p.anh_dai_dien
 from public.members m join public.profiles p on p.user_id=m.user_id join public.profile_rieng pr on pr.user_id=m.user_id
 where m.project_id=p_project and public.la_quan_ly(p_project) and not m.an_khoi_danh_sach
 order by (m.trang_thai='dang_tham_gia') desc,p.ho_ten;
$$;
create or replace function public.moi_lai(p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_role text; v_max int; v_count int;
begin
 select project_id,user_id,vai_tro into v_project,v_user,v_role from public.members where id=p_member and trang_thai='da_roi' and not an_khoi_danh_sach;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy thành viên đã rời hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 select vai_tro into v_role from public.members where id=p_member and project_id=v_project and trang_thai='da_roi' and not an_khoi_danh_sach for update;
 if not found then raise exception 'Thành viên đã được mời lại hoặc thay đổi'; end if;
 update public.join_requests set trang_thai='da_duyet',xu_ly_boi=auth.uid(),xu_ly_luc=now() where project_id=v_project and user_id=v_user and trang_thai='cho_duyet';
 select (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia')+
        (select count(*) from public.join_requests where project_id=v_project and trang_thai='cho_duyet') into v_count;
 if v_count>=v_max then raise exception 'Công việc đã đủ người'; end if;
 update public.members set trang_thai='dang_tham_gia',ly_do_roi=null,
  vai_tro=case when v_role='truong_nhom' and exists(select 1 from public.members where project_id=v_project and id<>p_member and trang_thai='dang_tham_gia' and vai_tro='truong_nhom') then 'thanh_vien' else v_role end
  where id=p_member;
 perform public.ghi_log(v_project,null,p_member,'moi_lai');
 perform public.gui_thong_bao(p_member,'moi_lai',null,'Nhóm trưởng/phó đã mời bạn quay lại công việc');
end; $$;

create or replace function public.xoa_thanh_vien_khoi_danh_sach(p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid;
begin
 select project_id into v_project from public.members where id=p_member for update;
 if not found then raise exception 'Không tìm thấy thành viên'; end if;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ trưởng nhóm hoặc phó nhóm mới được xóa khỏi danh sách'; end if;
 update public.members set an_khoi_danh_sach=true where id=p_member and trang_thai='da_roi' and not an_khoi_danh_sach;
 if not found then raise exception 'Chỉ có thể xóa thành viên đã rời nhóm khỏi danh sách'; end if;
 perform public.ghi_log(v_project,null,p_member,'xoa_khoi_danh_sach');
end; $$;

revoke all on function public.xoa_thanh_vien_khoi_danh_sach(uuid) from public,anon;
grant execute on function public.xoa_thanh_vien_khoi_danh_sach(uuid) to authenticated;
commit;
