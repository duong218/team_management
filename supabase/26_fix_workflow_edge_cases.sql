-- Bản vá các trường hợp hiếm trong quy trình checklist và chuyển giao.
-- Chạy sau 25_don_du_lieu_cu_sau_6_thang.sql.

create or replace function public.roi_nhom(p_project uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_role text; v_leads int;
begin
 select id,vai_tro into v_member,v_role from public.members
 where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_member is null then raise exception 'Bạn không còn tham gia công việc này'; end if;
 if exists(select 1 from public.task_assignees a join public.tasks t on t.id=a.task_id
   where a.member_id=v_member and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet')) then
  raise exception 'Bạn còn task đang được giao; hãy nhờ nhóm trưởng/phó chuyển giao hoặc xử lý task trước khi rời nhóm';
 end if;
 if v_role='truong_nhom' then
  select count(*) into v_leads from public.members where project_id=p_project and trang_thai='dang_tham_gia' and vai_tro='truong_nhom';
  if v_leads<=1 then raise exception 'Nhóm trưởng cuối cùng không thể rời công việc'; end if;
 end if;
 update public.members set trang_thai='da_roi',ly_do_roi='tu_roi' where id=v_member;
 perform public.ghi_log(p_project,null,v_member,'roi_nhom');
 for v_member in select id from public.members where project_id=p_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop
  perform public.gui_thong_bao(v_member,'thanh_vien_roi',null,'Một thành viên đã rời công việc');
 end loop;
end; $$;

create or replace function public.gui_duyet_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_state text;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_state<>'dang_lam' or not(public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and vai_tro_trong_task='chinh' and trang_thai='dang_lam')) then raise exception 'Chỉ người chính hoặc nhóm trưởng/phó gửi duyệt được'; end if;
 if exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='cho_duyet') then raise exception 'Nhóm trưởng/phó cần xử lý hết đề xuất checklist trước khi gửi duyệt'; end if;
 if exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet' and not da_xong) then raise exception 'Cần hoàn thành mọi mục checklist trước khi gửi duyệt'; end if;
 if not exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet') then raise exception 'Task cần có checklist'; end if;
 update public.tasks set trang_thai='cho_duyet',cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,v_member,'gui_duyet',public.tien_do_task(p_task),public.tien_do_task(p_task));
end; $$;

create or replace function public.xu_ly_de_xuat_muc(p_muc uuid,p_duyet boolean,p_ly_do text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_proposer uuid; v_before numeric; v_after numeric;
begin
 select c.task_id,t.project_id,t.trang_thai,c.de_xuat_boi into v_task,v_project,v_state,v_proposer
 from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc and c.trang_thai_muc='cho_duyet' for update of c,t;
 if v_task is null or not public.la_quan_ly(v_project) then raise exception 'Đề xuất không còn hiệu lực hoặc bạn không có quyền'; end if;
 if p_duyet and v_state not in('can_lam','dang_lam') then raise exception 'Không thể duyệt đề xuất khi task đã gửi duyệt, hoàn thành hoặc bị hủy; hãy từ chối đề xuất để đóng lại'; end if;
 if not p_duyet and char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do từ chối cần từ 10 đến 1000 ký tự'; end if;
 if p_duyet and (select count(*) from public.task_checklist where task_id=v_task and trang_thai_muc='da_duyet')>=30 then raise exception 'Mỗi task tối đa 30 mục checklist'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_checklist set trang_thai_muc=case when p_duyet then 'da_duyet' else 'tu_choi' end,
  ly_do_xu_ly=case when p_duyet then null else btrim(p_ly_do) end where id=p_muc and trang_thai_muc='cho_duyet';
 v_after:=public.tien_do_task(v_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,null,case when p_duyet then 'duyet_de_xuat_muc' else 'tu_choi_de_xuat_muc' end,v_before,v_after);
 if v_proposer is not null then perform public.gui_thong_bao(v_proposer,'de_xuat_checklist',v_task,case when p_duyet then 'Đề xuất checklist đã được duyệt' else 'Đề xuất checklist bị từ chối: '||left(btrim(p_ly_do),900) end); end if;
end; $$;

create or replace function public.xin_chuyen_giao(p_task uuid,p_ly_do text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_id uuid; v_manager uuid;
begin
 -- Khóa cùng hàng task với chuyen_giao_task; sau khi chờ khóa phải kiểm tra lại người đang được giao.
 select project_id into v_project from public.tasks where id=p_task and trang_thai='dang_lam' for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or not exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and trang_thai='dang_lam') then raise exception 'Bạn không được giao task Đang làm này'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do cần ít nhất 10 ký tự'; end if;
 if exists(select 1 from public.task_yeu_cau where task_id=p_task and member_id=v_member and trang_thai='dang_cho') then raise exception 'Bạn đã có yêu cầu chuyển giao đang chờ xử lý'; end if;
 insert into public.task_yeu_cau(task_id,member_id,ly_do) values(p_task,v_member,btrim(p_ly_do)) returning id into v_id;
 perform public.ghi_log(v_project,p_task,v_member,'xin_chuyen_giao');
 for v_manager in select id from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_manager,'yeu_cau_chuyen_giao',p_task,'Có yêu cầu chuyển giao task'); end loop;
 return v_id;
end; $$;

-- Tách tài khoản mới thành một dòng member riêng để các log cũ giữ đúng danh tính.
alter table public.members drop constraint if exists members_ly_do_roi_check;
alter table public.members add constraint members_ly_do_roi_check
 check(ly_do_roi is null or ly_do_roi in('tu_roi','bi_loai','thay_the'));

create or replace function public.duyet_thay_the(p_request uuid,p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 v_project uuid; v_user uuid; v_max int; v_occupancy int; v_old_role text;
 v_old_state text; v_actor_role text; v_new_member uuid; v_assignment record;
begin
 select project_id into v_project from public.join_requests where id=p_request and trang_thai='cho_duyet';
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Yêu cầu không còn hiệu lực hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 select vai_tro,trang_thai into v_old_role,v_old_state from public.members where id=p_member and project_id=v_project for update;
 if not found then raise exception 'Không tìm thấy thành viên cũ trong công việc này'; end if;
 select vai_tro into v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_old_role='truong_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng mới thay thế được nhóm trưởng'; end if;
 if exists(select 1 from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai in('dang_lam','da_go') and t.trang_thai='cho_duyet') then
  raise exception 'Trả lại task Chờ duyệt trước khi thay thế thành viên';
 end if;
 update public.join_requests set trang_thai='da_thay_the',xu_ly_boi=auth.uid(),xu_ly_luc=now()
  where id=p_request and trang_thai='cho_duyet' returning user_id into v_user;
 if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;
 if exists(select 1 from public.members where project_id=v_project and user_id=v_user) then raise exception 'Tài khoản này đã có dòng trong công việc, không thay thế được'; end if;
 if v_old_state='da_roi' then
  select (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia')+
         (select count(*) from public.join_requests where project_id=v_project and trang_thai='cho_duyet') into v_occupancy;
  if v_occupancy>=v_max then raise exception 'Công việc đã đủ người'; end if;
 end if;
 perform public.ghi_log(v_project,null,p_member,'thanh_vien_duoc_thay_the');
 update public.members set trang_thai='da_roi',ly_do_roi='thay_the' where id=p_member;
 insert into public.members(project_id,user_id,vai_tro)
 values(v_project,v_user,case when v_old_state='da_roi' and v_old_role='truong_nhom' and exists(
  select 1 from public.members where project_id=v_project and id<>p_member and trang_thai='dang_tham_gia' and vai_tro='truong_nhom'
 ) then 'thanh_vien' else v_old_role end)
 returning id into v_new_member;
 for v_assignment in
  select a.task_id,a.vai_tro_trong_task from public.task_assignees a join public.tasks t on t.id=a.task_id
  where a.member_id=p_member and t.project_id=v_project and t.trang_thai in('can_lam','dang_lam')
   and (a.trang_thai='dang_lam' or (a.trang_thai='da_go' and a.vai_tro_trong_task='chinh'))
  for update of t,a
 loop
  update public.task_assignees set trang_thai='da_chuyen' where task_id=v_assignment.task_id and member_id=p_member;
  insert into public.task_assignees(task_id,member_id,vai_tro_trong_task,trang_thai,giao_boi)
  values(v_assignment.task_id,v_new_member,v_assignment.vai_tro_trong_task,'dang_lam',auth.uid());
  update public.tasks set cap_nhat_luc=now() where id=v_assignment.task_id;
  perform public.ghi_log(v_project,v_assignment.task_id,null,'thay_the_nguoi_duoc_giao');
  perform public.gui_thong_bao(v_new_member,'task_nhan_chuyen_giao',v_assignment.task_id,'Bạn nhận task do thay thế thành viên cũ');
 end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now()
  where member_id=p_member and trang_thai='dang_cho';
end; $$;

-- Đóng đề xuất cũ không thể xử lý nữa vì task/công việc đã khóa; giữ lại lý do để tra cứu.
update public.task_checklist c set trang_thai_muc='tu_choi',
 ly_do_xu_ly='Đề xuất được đóng khi nâng cấp vì task hoặc công việc đã khóa.'
from public.tasks t join public.projects p on p.id=t.project_id
where t.id=c.task_id and c.trang_thai_muc='cho_duyet'
 and (t.trang_thai in('cho_duyet','hoan_thanh','da_huy') or p.trang_thai='luu_tru');

revoke all on function public.roi_nhom(uuid),public.xin_chuyen_giao(uuid,text),public.gui_duyet_task(uuid),public.xu_ly_de_xuat_muc(uuid,boolean,text),public.duyet_thay_the(uuid,uuid) from public,anon;
grant execute on function public.roi_nhom(uuid),public.xin_chuyen_giao(uuid,text),public.gui_duyet_task(uuid),public.xu_ly_de_xuat_muc(uuid,boolean,text),public.duyet_thay_the(uuid,uuid) to authenticated;
