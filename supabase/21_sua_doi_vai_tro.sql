-- Sửa lỗi tham chiếu biến chưa khai báo trong doi_vai_tro.
-- Chạy sau các migration hiện có; an toàn chạy lại.
begin;

create or replace function public.doi_vai_tro(p_member uuid,p_vai_tro text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_old text; v_actor uuid; v_actor_role text;
begin
 if p_vai_tro not in('truong_nhom','pho_nhom','thanh_vien') then raise exception 'Vai trò không hợp lệ'; end if;
 select project_id,vai_tro into v_project,v_old from public.members where id=p_member and trang_thai='dang_tham_gia' for update;
 select id,vai_tro into v_actor,v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_project is null or v_actor is null or v_actor=p_member or not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền đổi vai trò'; end if;
 if v_old='truong_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Phó nhóm không được đổi vai trò nhóm trưởng'; end if;
 if v_old='pho_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được đổi vai trò phó nhóm'; end if;
 if p_vai_tro='truong_nhom' then
  if v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được chuyển quyền'; end if;
  update public.members set vai_tro='pho_nhom' where id=v_actor;
 end if;
 if v_old='truong_nhom' and p_vai_tro<>'truong_nhom' then raise exception 'Hãy chuyển quyền nhóm trưởng cho thành viên khác trước'; end if;
 update public.members set vai_tro=p_vai_tro where id=p_member;
 perform public.ghi_log(v_project,null,p_member,'doi_vai_tro:'||v_old||'->'||p_vai_tro);
end; $$;

revoke all on function public.doi_vai_tro(uuid,text) from public,anon;
grant execute on function public.doi_vai_tro(uuid,text) to authenticated;

commit;
