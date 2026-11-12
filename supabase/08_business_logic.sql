-- 08_business_logic.sql — bản vá nghiệp vụ bổ sung sau 07_reports_archive.sql.
-- Chạy thủ công trong Supabase SQL Editor sau các file 01–07.

-- Lưu lý do duyệt/từ chối đề xuất checklist để người đề xuất xem lại được.
alter table public.task_checklist add column if not exists ly_do_xu_ly text;

-- Cài đặt mới được bổ sung trong 02; định nghĩa ở đây để DB đã chạy 01–07 cũng nhận được.
create or replace function public.cap_nhat_cong_viec(p_project uuid,p_ten text,p_max_members integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_old_ten text; v_old_max integer; v_count integer; v_ten text:=btrim(coalesce(p_ten,''));
begin
 if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa cài đặt'; end if;
 select ten,max_members into v_old_ten,v_old_max from public.projects where id=p_project and trang_thai='dang_hoat_dong' for update;
 if not found then raise exception 'Công việc không hoạt động'; end if;
 if char_length(v_ten) not between 2 and 100 then raise exception 'Tên công việc phải từ 2 đến 100 ký tự'; end if;
 if p_max_members is null or p_max_members not between 1 and 100 then raise exception 'Số thành viên tối đa phải từ 1 đến 100'; end if;
 select (select count(*) from public.members where project_id=p_project and trang_thai='dang_tham_gia')+
        (select count(*) from public.join_requests where project_id=p_project and trang_thai='cho_duyet') into v_count;
 if p_max_members<v_count then raise exception 'Giới hạn mới thấp hơn số thành viên hiện tại và đang chờ'; end if;
 update public.projects set ten=v_ten,max_members=p_max_members where id=p_project;
 if v_old_ten is distinct from v_ten or v_old_max is distinct from p_max_members then
  perform public.ghi_log(p_project,null,null,'cap_nhat_cai_dat:'||v_old_ten||'/'||v_old_max||'->'||v_ten||'/'||p_max_members);
 end if;
end; $$;
revoke all on function public.cap_nhat_cong_viec(uuid,text,integer) from public,anon;
grant execute on function public.cap_nhat_cong_viec(uuid,text,integer) to authenticated;

-- Giới hạn 10 theo nhóm trưởng hiện tại, kể cả công việc được nhận chuyển quyền.
create or replace function public.tao_cong_viec(p_ten text,p_max_members int default 20)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ten text:=btrim(coalesce(p_ten,'')); v_duoc boolean; v_dem int; v_id uuid;
begin
 if v_uid is null then raise exception 'Bạn chưa đăng nhập'; end if;
 if char_length(v_ten) not between 2 and 100 then raise exception 'Tên công việc phải từ 2 đến 100 ký tự'; end if;
 if p_max_members is null or p_max_members not between 1 and 100 then raise exception 'Số thành viên tối đa phải từ 1 đến 100'; end if;
 select duoc_tao_cong_viec into v_duoc from public.profiles where user_id=v_uid for update;
 if v_duoc is null then raise exception 'Bạn cần điền hồ sơ trước'; end if;
 if not v_duoc then raise exception 'Bạn chưa có quyền tạo công việc'; end if;
 select count(*) into v_dem from public.projects p join public.members m on m.project_id=p.id
  where m.user_id=v_uid and m.trang_thai='dang_tham_gia' and m.vai_tro='truong_nhom' and p.trang_thai='dang_hoat_dong';
 if v_dem>=10 then raise exception 'Bạn đã có 10 công việc đang hoạt động. Hãy lưu trữ bớt một công việc'; end if;
 insert into public.projects(ten,max_members,tao_boi,join_code) values(v_ten,p_max_members,v_uid,public.tao_ma_ngau_nhien()) returning id into v_id;
 insert into public.members(project_id,user_id,vai_tro) values(v_id,v_uid,'truong_nhom');
 perform public.ghi_log(v_id,null,null,'tao_cong_viec');
 return v_id;
end; $$;
revoke all on function public.tao_cong_viec(text,integer) from public,anon;
grant execute on function public.tao_cong_viec(text,integer) to authenticated;

create or replace function public.duyet_moi(p_request uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_max int; v_occupancy int; v_old_member uuid;
begin
 select project_id into v_project from public.join_requests where id=p_request and trang_thai='cho_duyet';
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Yêu cầu không còn hiệu lực hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 update public.join_requests set trang_thai='da_duyet',xu_ly_boi=auth.uid(),xu_ly_luc=now()
  where id=p_request and trang_thai='cho_duyet' returning user_id into v_user;
 if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;
 select (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia')+
        (select count(*) from public.join_requests where project_id=v_project and trang_thai='cho_duyet') into v_occupancy;
 if v_occupancy>=v_max then raise exception 'Công việc đã đủ người'; end if;
 if exists(select 1 from public.members where project_id=v_project and user_id=v_user and trang_thai='dang_tham_gia') then raise exception 'Người này đã ở trong nhóm'; end if;
 update public.members set trang_thai='dang_tham_gia',ly_do_roi=null,vai_tro='thanh_vien'
  where project_id=v_project and user_id=v_user and trang_thai='da_roi' returning id into v_old_member;
 if v_old_member is null then insert into public.members(project_id,user_id,vai_tro) values(v_project,v_user,'thanh_vien'); end if;
end; $$;
revoke all on function public.duyet_moi(uuid) from public,anon;
grant execute on function public.duyet_moi(uuid) to authenticated;

create or replace function public.duyet_thay_the(p_request uuid,p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_max int; v_occupancy int; v_old_role text; v_old_state text; v_actor_role text;
begin
 select project_id into v_project from public.join_requests where id=p_request and trang_thai='cho_duyet';
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Yêu cầu không còn hiệu lực hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 select vai_tro,trang_thai into v_old_role,v_old_state from public.members where id=p_member and project_id=v_project for update;
 if not found then raise exception 'Không tìm thấy thành viên cũ trong công việc này'; end if;
 select vai_tro into v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_old_role='truong_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng mới thay thế được nhóm trưởng'; end if;
 update public.join_requests set trang_thai='da_thay_the',xu_ly_boi=auth.uid(),xu_ly_luc=now()
  where id=p_request and trang_thai='cho_duyet' returning user_id into v_user;
 if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;
 if exists(select 1 from public.members where project_id=v_project and user_id=v_user) then raise exception 'Tài khoản này đã có dòng trong công việc, không thay thế được'; end if;
 if v_old_state='da_roi' then
  select (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia')+
         (select count(*) from public.join_requests where project_id=v_project and trang_thai='cho_duyet') into v_occupancy;
  if v_occupancy>=v_max then raise exception 'Công việc đã đủ người'; end if;
 end if;
 update public.members set user_id=v_user,trang_thai='dang_tham_gia',ly_do_roi=null,
  vai_tro=case when v_old_state='da_roi' and v_old_role='truong_nhom' and exists(select 1 from public.members where project_id=v_project and id<>p_member and trang_thai='dang_tham_gia' and vai_tro='truong_nhom') then 'thanh_vien' else v_old_role end
  where id=p_member;
end; $$;
revoke all on function public.duyet_thay_the(uuid,uuid) from public,anon;
grant execute on function public.duyet_thay_the(uuid,uuid) to authenticated;

create or replace function public.moi_lai(p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_role text; v_max int; v_occupancy int;
begin
 select project_id,user_id,vai_tro into v_project,v_user,v_role from public.members where id=p_member and trang_thai='da_roi';
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy thành viên đã rời hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 select vai_tro into v_role from public.members where id=p_member and project_id=v_project and trang_thai='da_roi' for update;
 if not found then raise exception 'Thành viên đã được mời lại hoặc thay đổi'; end if;
 update public.join_requests set trang_thai='da_duyet',xu_ly_boi=auth.uid(),xu_ly_luc=now() where project_id=v_project and user_id=v_user and trang_thai='cho_duyet';
 select (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia')+
        (select count(*) from public.join_requests where project_id=v_project and trang_thai='cho_duyet') into v_occupancy;
 if v_occupancy>=v_max then raise exception 'Công việc đã đủ người'; end if;
 update public.members set trang_thai='dang_tham_gia',ly_do_roi=null,
  vai_tro=case when v_role='truong_nhom' and exists(select 1 from public.members where project_id=v_project and id<>p_member and trang_thai='dang_tham_gia' and vai_tro='truong_nhom') then 'thanh_vien' else v_role end
  where id=p_member;
 perform public.ghi_log(v_project,null,p_member,'moi_lai');
 perform public.gui_thong_bao(p_member,'moi_lai',null,'Nhóm trưởng/phó đã mời bạn quay lại công việc');
end; $$;
revoke all on function public.moi_lai(uuid) from public,anon;
grant execute on function public.moi_lai(uuid) to authenticated;

-- Người hỗ trợ có thể được thêm khi task chạy; giao/chuyển người chính vẫn chỉ ở Cần làm/qua RPC chuyển giao.
create or replace function public.gan_task(p_task uuid,p_member uuid,p_vai_tro text default 'chinh')
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_uid uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy task hoặc bạn không có quyền'; end if;
 if p_vai_tro not in('chinh','ho_tro') or (p_vai_tro='chinh' and v_state<>'can_lam') or (p_vai_tro='ho_tro' and v_state not in('can_lam','dang_lam')) then raise exception 'Task không ở trạng thái phù hợp để giao vai trò này'; end if;
 if not exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet') then raise exception 'Task cần có checklist'; end if;
 select user_id into v_uid from public.members where id=p_member and project_id=v_project and trang_thai='dang_tham_gia';
 if v_uid is null then raise exception 'Người nhận không còn tham gia công việc'; end if;
 if exists(select 1 from public.task_assignees where task_id=p_task and member_id=p_member and trang_thai='dang_lam') then raise exception 'Thành viên này đã được giao task'; end if;
 if p_vai_tro='chinh' and exists(select 1 from public.task_assignees where task_id=p_task and vai_tro_trong_task='chinh' and trang_thai='dang_lam') then raise exception 'Task đã có người chính; hãy dùng Chuyển giao'; end if;
 insert into public.task_assignees(task_id,member_id,vai_tro_trong_task,giao_boi) values(p_task,p_member,p_vai_tro,auth.uid())
 on conflict(task_id,member_id) do update set vai_tro_trong_task=excluded.vai_tro_trong_task,trang_thai='dang_lam';
 delete from public.task_votes where task_id=p_task;
 perform public.ghi_log(v_project,p_task,p_member,'gan_task');
 perform public.gui_thong_bao(p_member,'duoc_giao',p_task,'Bạn được giao một task mới');
end; $$;
revoke all on function public.gan_task(uuid,uuid,text) from public,anon;
grant execute on function public.gan_task(uuid,uuid,text) to authenticated;

create or replace function public.binh_chon_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_member uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_project is null or v_member is null or v_state<>'can_lam' or not exists(select 1 from public.projects where id=v_project and trang_thai='dang_hoat_dong' and bat_binh_chon) then raise exception 'Bình chọn đang tắt hoặc task không sẵn sàng'; end if;
 if exists(select 1 from public.task_assignees where task_id=p_task and trang_thai='dang_lam') then raise exception 'Task đã được giao'; end if;
 insert into public.task_votes(task_id,member_id) values(p_task,v_member) on conflict do nothing;
end; $$;
revoke all on function public.binh_chon_task(uuid) from public,anon;
grant execute on function public.binh_chon_task(uuid) to authenticated;

create or replace function public.tao_task(p_project uuid,p_tieu_de text,p_mo_ta text,p_han_chot date,p_checklist jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_item jsonb; v_member uuid;
begin
 if not public.la_quan_ly(p_project) or not exists(select 1 from public.projects where id=p_project and trang_thai='dang_hoat_dong') then raise exception 'Chỉ quản lý được tạo task trong công việc đang hoạt động'; end if;
 if char_length(btrim(coalesce(p_tieu_de,''))) not between 1 and 200 or char_length(coalesce(p_mo_ta,''))>5000 then raise exception 'Tiêu đề hoặc mô tả vượt giới hạn'; end if;
 if coalesce(jsonb_typeof(p_checklist),'')<>'array' then raise exception 'Danh sách checklist phải là một mảng'; end if;
 if jsonb_array_length(p_checklist) not between 1 and 30 then raise exception 'Task cần từ 1 đến 30 mục checklist'; end if;
 insert into public.tasks(project_id,han_chot) values(p_project,p_han_chot) returning id into v_task;
 insert into public.task_details(task_id,tieu_de,mo_ta) values(v_task,btrim(p_tieu_de),coalesce(p_mo_ta,''));
 for v_item in select value from jsonb_array_elements(p_checklist) loop
  if char_length(btrim(coalesce(v_item->>'noi_dung',''))) not between 1 and 500 then raise exception 'Nội dung checklist phải từ 1 đến 500 ký tự'; end if;
  insert into public.task_checklist(task_id,noi_dung,trong_so) values(v_task,btrim(v_item->>'noi_dung'),coalesce((v_item->>'trong_so')::numeric,1));
 end loop;
 select id into v_member from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 perform public.ghi_log(p_project,null,v_member,'tao_task:'||v_task::text);
 return v_task;
end; $$;
revoke all on function public.tao_task(uuid,text,text,date,jsonb) from public,anon;
grant execute on function public.tao_task(uuid,text,text,date,jsonb) to authenticated;

-- Chỉ chính người được giao task mới được thêm minh chứng, kể cả khi người khác là quản lý.
create or replace function public.them_link(p_muc uuid,p_url text,p_ghi_chu text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_member uuid; v_host text; v_norm text; v_id uuid;
begin
 select c.task_id,t.project_id into v_task,v_project from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc;
 select m.id into v_member from public.members m where m.project_id=v_project and m.user_id=auth.uid() and m.trang_thai='dang_tham_gia';
 if v_member is null or not exists(select 1 from public.task_assignees a where a.task_id=v_task and a.member_id=v_member and a.trang_thai='dang_lam') then raise exception 'Chỉ người được giao task mới được gắn minh chứng'; end if;
 if (select t.trang_thai from public.tasks t where t.id=v_task) in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if char_length(p_url)>2000 or p_url !~ '^https://[^[:space:]]+$' or p_url ~* '^https://[^/@:]+:[^/@]+@' then raise exception 'Link phải là HTTPS hợp lệ, không chứa khoảng trắng hoặc thông tin đăng nhập'; end if;
 v_host:=lower(split_part(split_part(p_url,'://',2),'/',1));
 if position('.' in v_host)=0 then raise exception 'Link cần có tên miền hợp lệ'; end if;
 v_norm:=regexp_replace(rtrim(btrim(p_url),'/'),'^https://([^/]+)','https://'||lower(v_host));
 if (select count(*) from public.task_links l where l.muc_id=p_muc)>=10 then raise exception 'Mỗi mục tối đa 10 link'; end if;
 insert into public.task_links(task_id,muc_id,url,url_chuan_hoa,ghi_chu,nguoi_them) values(v_task,p_muc,btrim(p_url),v_norm,left(coalesce(p_ghi_chu,''),1000),v_member) returning id into v_id;
 perform public.ghi_log(v_project,v_task,v_member,'them_link');
 return v_id;
end; $$;
revoke all on function public.them_link(uuid,text,text) from public,anon;
grant execute on function public.them_link(uuid,text,text) to authenticated;

create or replace function public.xoa_link(p_link uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_muc uuid; v_member uuid; v_state text;
begin
 select l.task_id,t.project_id,l.muc_id,l.nguoi_them,t.trang_thai into v_task,v_project,v_muc,v_member,v_state
 from public.task_links l join public.tasks t on t.id=l.task_id where l.id=p_link for update of l,t;
 if v_task is null or not(public.la_quan_ly(v_project) or exists(select 1 from public.members where id=v_member and user_id=auth.uid() and trang_thai='dang_tham_gia')) then raise exception 'Bạn không có quyền xóa link'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if (select da_xong from public.task_checklist where id=v_muc) then raise exception 'Bỏ tích mục trước khi xóa link'; end if;
 delete from public.task_links where id=p_link;
 perform public.ghi_log(v_project,v_task,v_member,'xoa_link');
end; $$;
revoke all on function public.xoa_link(uuid) from public,anon;
grant execute on function public.xoa_link(uuid) to authenticated;

-- Cập nhật task có kiểm tra phiên bản; mọi đổi hạn đều cần lý do và được ghi nhật ký.
drop function if exists public.cap_nhat_task(uuid,text,text,date);
create or replace function public.cap_nhat_task(p_task uuid,p_tieu_de text,p_mo_ta text,p_han_chot date,p_ly_do_han text,p_cap_nhat_luc timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_old_due date; v_current timestamptz;
begin
 select project_id,trang_thai,han_chot,cap_nhat_luc into v_project,v_state,v_old_due,v_current from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy task hoặc bạn không có quyền'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if p_cap_nhat_luc is null or p_cap_nhat_luc is distinct from v_current then raise exception 'Task đã được người khác sửa; hãy tải lại rồi thử lại'; end if;
 if char_length(btrim(coalesce(p_tieu_de,''))) not between 1 and 200 or char_length(coalesce(p_mo_ta,''))>5000 then raise exception 'Tiêu đề hoặc mô tả vượt giới hạn'; end if;
 if p_han_chot is distinct from v_old_due and char_length(btrim(coalesce(p_ly_do_han,''))) not between 10 and 1000 then raise exception 'Đổi hạn cần lý do từ 10 đến 1000 ký tự'; end if;
 update public.task_details set tieu_de=btrim(p_tieu_de),mo_ta=coalesce(p_mo_ta,'') where task_id=p_task;
 update public.tasks set han_chot=p_han_chot,cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'cap_nhat_task');
 if p_han_chot is distinct from v_old_due then perform public.ghi_log(v_project,p_task,null,'doi_han_chot:'||coalesce(v_old_due::text,'chua_dat')||'->'||coalesce(p_han_chot::text,'xoa')||':'||left(btrim(p_ly_do_han),500)); end if;
end; $$;
revoke all on function public.cap_nhat_task(uuid,text,text,date,text,timestamptz) from public,anon;
grant execute on function public.cap_nhat_task(uuid,text,text,date,text,timestamptz) to authenticated;

-- Checklist chứa người hoàn thành, vì vậy chỉ trả danh tính của chính người xem (trừ quản lý).
drop policy if exists task_checklist_read on public.task_checklist;
drop policy if exists task_checklist_manager_read on public.task_checklist;
create policy task_checklist_manager_read on public.task_checklist for select to authenticated
 using (exists(select 1 from public.tasks t where t.id=task_id and public.la_quan_ly(t.project_id)));
revoke all on public.task_checklist from anon,authenticated;

create or replace function public.danh_sach_checklist(p_task uuid)
returns table(id uuid,task_id uuid,noi_dung text,trong_so numeric,da_xong boolean,trang_thai_muc text,
 de_xuat_boi uuid,nguoi_hoan_thanh uuid,thoi_gian_hoan_thanh timestamptz,tao_luc timestamptz,ly_do_xu_ly text)
language plpgsql stable security definer set search_path='' as $$
declare v_project uuid; v_self uuid; v_manager boolean;
begin
 select t.project_id into v_project from public.tasks t where t.id=p_task;
 select m.id into v_self from public.members m where m.project_id=v_project and m.user_id=auth.uid() and m.trang_thai='dang_tham_gia';
 v_manager:=public.la_quan_ly(v_project);
 if v_project is null or not(v_manager or public.co_quyen_task(p_task) or
      (public.task_chua_giao(p_task) and public.la_thanh_vien(v_project))) then
  raise exception 'Bạn không được xem checklist của task này';
 end if;
 return query select c.id,c.task_id,c.noi_dung,c.trong_so,c.da_xong,c.trang_thai_muc,c.de_xuat_boi,
  case when v_manager or c.nguoi_hoan_thanh=v_self then c.nguoi_hoan_thanh else null end,
  c.thoi_gian_hoan_thanh,c.tao_luc,c.ly_do_xu_ly
 from public.task_checklist c where c.task_id=p_task order by c.tao_luc;
end; $$;
revoke all on function public.danh_sach_checklist(uuid) from public,anon;
grant execute on function public.danh_sach_checklist(uuid) to authenticated;

create or replace function public.dong_gop_task(p_task uuid)
returns table(member_id uuid,phan_tram numeric)
language plpgsql stable security definer set search_path='' as $$
declare v_project uuid; v_self uuid;
begin
 select project_id into v_project from public.tasks where id=p_task;
 select id into v_self from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_project is null or not(public.la_quan_ly(v_project) or
    exists(select 1 from public.task_assignees a where a.task_id=p_task and a.member_id=v_self)) then
  raise exception 'Bạn không được xem đóng góp task này';
 end if;
 if exists(select 1 from public.task_dong_gop_dieu_chinh where task_id=p_task) then
  return query select a.member_id,a.phan_tram from public.task_dong_gop_dieu_chinh a
   where a.task_id=p_task and (public.la_quan_ly(v_project) or a.member_id=v_self);
 else
  return query with weights as (
    select c.nguoi_hoan_thanh member_id,sum(c.trong_so) weight from public.task_checklist c
    where c.task_id=p_task and c.trang_thai_muc='da_duyet' and c.da_xong and c.nguoi_hoan_thanh is not null group by c.nguoi_hoan_thanh
  ), total as (select sum(weight) value from weights)
  select w.member_id,100*w.weight/nullif(t.value,0) from weights w cross join total t
  where public.la_quan_ly(v_project) or w.member_id=v_self;
 end if;
end; $$;
revoke all on function public.dong_gop_task(uuid) from public,anon;
grant execute on function public.dong_gop_task(uuid) to authenticated;
revoke all on public.task_dong_gop_dieu_chinh from anon,authenticated;

-- Bản vá cho người được giao task đã mở được lịch sử nhưng cột kết quả id trùng với tasks.id.
create or replace function public.lich_su_nguoi_chinh(p_task uuid)
returns table(id uuid,tu_member uuid,tu_ten text,den_member uuid,den_ten text,nguoi_chuyen uuid,tien_do_luc_chuyen numeric,loai_chuyen text,ly_do text,thoi_gian timestamptz,da_sua_loai boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_project uuid; v_mgr boolean;
begin
 select t.project_id into v_project from public.tasks t where t.id=p_task;
 if not public.co_quyen_task(p_task) then raise exception 'Bạn không được xem lịch sử task này'; end if;
 v_mgr:=public.la_quan_ly(v_project);
 return query select x.id,x.tu_member,p1.ho_ten,x.den_member,p2.ho_ten,x.nguoi_chuyen,x.tien_do_luc_chuyen,x.loai_chuyen,
  case when v_mgr then x.ly_do else null end,x.thoi_gian,x.da_sua_loai
 from public.task_chuyen_giao x
 join public.members m1 on m1.id=x.tu_member join public.profiles p1 on p1.user_id=m1.user_id
 join public.members m2 on m2.id=x.den_member join public.profiles p2 on p2.user_id=m2.user_id
 where x.task_id=p_task order by x.thoi_gian;
end; $$;

-- Triggers chỉ cần được PostgreSQL gọi, không phải là API cho client.
revoke all on function public.log_join_request_event() from public, anon, authenticated;
revoke all on function public.log_member_account_replacement() from public, anon, authenticated;
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;

-- Thay đổi trọng số chỉ do trưởng/phó nhóm thực hiện, tổng đúng 100%.
create or replace function public.cap_nhat_trong_so_diem(p_project uuid,p_trong_so jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_a numeric; v_b numeric; v_c numeric;
begin
 if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được đổi trọng số'; end if;
 if (select trang_thai from public.projects where id=p_project for update)<>'dang_hoat_dong' then raise exception 'Công việc đã kết thúc'; end if;
 if jsonb_typeof(p_trong_so)<>'object' or (select count(*) from jsonb_object_keys(p_trong_so))<>3
    or not (p_trong_so ?& array['a','b','c']) then raise exception 'Cần nhập đủ trọng số A, B, C'; end if;
 begin
  v_a:=(p_trong_so->>'a')::numeric; v_b:=(p_trong_so->>'b')::numeric; v_c:=(p_trong_so->>'c')::numeric;
 exception when others then raise exception 'Trọng số phải là số hợp lệ'; end;
 if v_a<0 or v_b<0 or v_c<0 or abs(v_a+v_b+v_c-1)>0.000001 then raise exception 'Trọng số không âm và tổng phải bằng 100%%'; end if;
 update public.projects set trong_so_diem=jsonb_build_object('a',v_a,'b',v_b,'c',v_c) where id=p_project;
 perform public.ghi_log(p_project,null,null,'cap_nhat_trong_so_diem');
end; $$;
revoke all on function public.cap_nhat_trong_so_diem(uuid,jsonb) from public,anon;
grant execute on function public.cap_nhat_trong_so_diem(uuid,jsonb) to authenticated;

-- Yêu cầu của người hỗ trợ là gỡ họ khỏi task; không cần người tiếp nhận mới.
create or replace function public.xu_ly_yeu_cau_chuyen_giao(p_yeu_cau uuid,p_quyet_dinh text,p_den_member uuid,p_loai text,p_ly_do_xu_ly text,p_han_moi date default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_from uuid; v_role text; v_reason text;
begin
 select r.task_id,t.project_id,r.member_id,a.vai_tro_trong_task,r.ly_do
 into v_task,v_project,v_from,v_role,v_reason
 from public.task_yeu_cau r join public.tasks t on t.id=r.task_id
 join public.task_assignees a on a.task_id=t.id and a.member_id=r.member_id and a.trang_thai='dang_lam'
 where r.id=p_yeu_cau and r.trang_thai='dang_cho' for update of r,t;
 if v_task is null or not public.la_quan_ly(v_project) then raise exception 'Yêu cầu không còn hiệu lực hoặc bạn không có quyền'; end if;
 if p_quyet_dinh='tu_choi' then
  perform public.tu_choi_yeu_cau_chuyen_giao(p_yeu_cau,p_ly_do_xu_ly); return;
 elsif p_quyet_dinh='chuyen' and v_role='chinh' then
  perform public.chuyen_giao_task(v_task,v_from,p_den_member,p_loai,v_reason,p_han_moi);
 elsif p_quyet_dinh='go' and v_role='ho_tro' then
  update public.task_assignees set trang_thai='da_go' where task_id=v_task and member_id=v_from;
  perform public.ghi_log(v_project,v_task,v_from,'go_nguoi_ho_tro',null,null);
  perform public.gui_thong_bao(v_from,'yeu_cau_chuyen_giao_da_xu_ly',v_task,'Bạn đã được gỡ khỏi task theo yêu cầu');
 else raise exception 'Lựa chọn xử lý không phù hợp với vai trò người xin'; end if;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now()
 where id=p_yeu_cau and trang_thai='dang_cho';
end; $$;
revoke all on function public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,date) from public,anon;
grant execute on function public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,date) to authenticated;

-- Chỉ một nhóm trưởng: chuyển quyền là một thao tác nguyên tử, đồng thời hạ vai trò người chuyển.
create or replace function public.doi_vai_tro(p_member uuid,p_vai_tro text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_old text; v_actor uuid; v_actor_role text;
begin
 if p_vai_tro not in('truong_nhom','pho_nhom','thanh_vien') then raise exception 'Vai trò không hợp lệ'; end if;
 select project_id,vai_tro into v_project,v_old from public.members where id=p_member and trang_thai='dang_tham_gia' for update;
 select id,vai_tro into v_actor,v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_project is null or v_actor is null or v_actor=v_member or not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền đổi vai trò'; end if;
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

-- Bảo vệ trạng thái lưu trữ kể cả khi client gọi nhầm RPC ghi.
create or replace function public.chan_sua_cong_viec_luu_tru()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_actor uuid;
begin
 if tg_table_name in('members','tasks') then
  v_project:=coalesce((to_jsonb(new)->>'project_id')::uuid,(to_jsonb(old)->>'project_id')::uuid);
 else
  v_task:=coalesce((to_jsonb(new)->>'task_id')::uuid,(to_jsonb(old)->>'task_id')::uuid);
  if v_task is not null then select project_id into v_project from public.tasks where id=v_task; end if;
 end if;
 select trang_thai into v_state from public.projects where id=v_project for share;
 if v_state='luu_tru' then raise exception 'Công việc đã lưu trữ, không thể thay đổi dữ liệu'; end if;
 -- Serialize a write with kicking/leaving: once the membership update wins, the write must fail.
 if auth.uid() is not null then
  perform 1 from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for share;
  if not found then raise exception 'Bạn không còn tham gia công việc này'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function public.chan_sua_cong_viec_luu_tru() from public,anon,authenticated;

create or replace function public.chan_sua_du_an_khong_quyen()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
 if auth.uid() is null then return new; end if;
 select vai_tro into v_role from public.members where project_id=old.id and user_id=auth.uid()
  and trang_thai='dang_tham_gia' for share;
 if coalesce(v_role,'') not in('truong_nhom','pho_nhom') then raise exception 'Bạn không còn quyền quản lý công việc này'; end if;
 if old.trang_thai='luu_tru' and new.trang_thai<>'dang_hoat_dong' then
  raise exception 'Công việc đã lưu trữ';
 end if;
 if old.trang_thai='luu_tru' and new.trang_thai='dang_hoat_dong' and v_role<>'truong_nhom' then
  raise exception 'Chỉ nhóm trưởng được mở lại công việc';
 end if;
 return new;
end; $$;
revoke all on function public.chan_sua_du_an_khong_quyen() from public,anon,authenticated;
drop trigger if exists project_write_guard on public.projects;
create trigger project_write_guard before update on public.projects
 for each row execute function public.chan_sua_du_an_khong_quyen();

do $$
declare t text;
begin
 foreach t in array array['members','tasks','task_details','task_assignees','task_checklist','task_links','task_votes','task_chuyen_giao','task_yeu_cau','task_dong_gop_dieu_chinh'] loop
  execute format('drop trigger if exists block_archived_project_write on public.%I',t);
  execute format('create trigger block_archived_project_write before insert or update or delete on public.%I for each row execute function public.chan_sua_cong_viec_luu_tru()',t);
 end loop;
end $$;

-- Tạo + giao trong cùng transaction để không để lại task mồ côi khi giao thất bại.
create or replace function public.tao_task_giao(p_project uuid,p_tieu_de text,p_mo_ta text,p_han_chot date,p_checklist jsonb,p_member uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid;
begin
 if p_member is null then raise exception 'Chọn người được giao'; end if;
 v_task:=public.tao_task(p_project,p_tieu_de,p_mo_ta,p_han_chot,p_checklist);
 perform public.gan_task(v_task,p_member,'chinh');
 return v_task;
end; $$;
revoke all on function public.tao_task_giao(uuid,text,text,date,jsonb,uuid) from public,anon;
grant execute on function public.tao_task_giao(uuid,text,text,date,jsonb,uuid) to authenticated;

create or replace function public.them_muc_task(p_task uuid,p_noi_dung text,p_trong_so numeric default 1)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_id uuid; v_before numeric; v_after numeric; v_content text:=btrim(coalesce(p_noi_dung,''));
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if char_length(v_content) not between 1 and 500 or p_trong_so is null or p_trong_so<=0 or p_trong_so>10 or p_trong_so<>round(p_trong_so,2) then raise exception 'Nội dung hoặc trọng số checklist không hợp lệ'; end if;
 if (select count(*) from public.task_checklist where task_id=p_task and trang_thai_muc<>'tu_choi')>=30 then raise exception 'Mỗi task tối đa 30 mục checklist'; end if;
 v_before:=public.tien_do_task(p_task);
 insert into public.task_checklist(task_id,noi_dung,trong_so) values(p_task,v_content,p_trong_so) returning id into v_id;
 v_after:=public.tien_do_task(p_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'them_muc',v_before,v_after);
 return v_id;
end; $$;

create or replace function public.cap_nhat_muc_task(p_muc uuid,p_noi_dung text,p_trong_so numeric)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_before numeric; v_after numeric; v_content text:=btrim(coalesce(p_noi_dung,''));
begin
 select c.task_id,t.project_id,t.trang_thai into v_task,v_project,v_state
 from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if char_length(v_content) not between 1 and 500 or p_trong_so is null or p_trong_so<=0 or p_trong_so>10 or p_trong_so<>round(p_trong_so,2) then raise exception 'Nội dung hoặc trọng số checklist không hợp lệ'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_checklist set noi_dung=v_content,trong_so=p_trong_so where id=p_muc;
 v_after:=public.tien_do_task(v_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,null,'sua_muc',v_before,v_after);
end; $$;

create or replace function public.xoa_muc_task(p_muc uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_done boolean; v_before numeric; v_after numeric;
begin
 select c.task_id,t.project_id,t.trang_thai,c.da_xong into v_task,v_project,v_state,v_done
 from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') or v_done then raise exception 'Bỏ tích mục trước khi xóa; task đang khóa'; end if;
 if exists(select 1 from public.task_links where muc_id=p_muc) then raise exception 'Hãy xóa link của mục trước'; end if;
 if (select count(*) from public.task_checklist where task_id=v_task and trang_thai_muc='da_duyet')<=1 and exists(select 1 from public.task_assignees where task_id=v_task) then raise exception 'Task đã giao phải còn ít nhất một mục'; end if;
 v_before:=public.tien_do_task(v_task);
 delete from public.task_checklist where id=p_muc;
 v_after:=public.tien_do_task(v_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,null,'xoa_muc',v_before,v_after);
end; $$;

create or replace function public.de_xuat_muc(p_task uuid,p_noi_dung text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_member uuid; v_id uuid; v_content text:=btrim(coalesce(p_noi_dung,''));
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_state<>'dang_lam' or v_member is null or not exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and trang_thai='dang_lam') then raise exception 'Chỉ người đang làm task mới đề xuất checklist'; end if;
 if char_length(v_content) not between 1 and 500 then raise exception 'Nội dung checklist phải từ 1 đến 500 ký tự'; end if;
 if (select count(*) from public.task_checklist where task_id=p_task and de_xuat_boi=v_member and trang_thai_muc='cho_duyet')>=5 then raise exception 'Bạn đã có 5 đề xuất đang chờ'; end if;
 if (select count(*) from public.task_checklist where task_id=p_task and trang_thai_muc<>'tu_choi')>=30 then raise exception 'Mỗi task tối đa 30 mục checklist'; end if;
 insert into public.task_checklist(task_id,noi_dung,de_xuat_boi,trang_thai_muc) values(p_task,v_content,v_member,'cho_duyet') returning id into v_id;
 perform public.ghi_log(v_project,p_task,v_member,'de_xuat_muc');
 return v_id;
end; $$;

create or replace function public.xu_ly_de_xuat_muc(p_muc uuid,p_duyet boolean,p_ly_do text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_proposer uuid; v_member uuid; v_before numeric; v_after numeric;
begin
 select c.task_id,t.project_id,t.trang_thai,c.de_xuat_boi into v_task,v_project,v_state,v_proposer
 from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc and c.trang_thai_muc='cho_duyet' for update of c,t;
 if v_task is null or not public.la_quan_ly(v_project) then raise exception 'Đề xuất không còn hiệu lực hoặc bạn không có quyền'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if not p_duyet and char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do từ chối cần từ 10 đến 1000 ký tự'; end if;
 if p_duyet and (select count(*) from public.task_checklist where task_id=v_task and trang_thai_muc='da_duyet')>=30 then raise exception 'Mỗi task tối đa 30 mục checklist'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_checklist set trang_thai_muc=case when p_duyet then 'da_duyet' else 'tu_choi' end,
  ly_do_xu_ly=case when p_duyet then null else btrim(p_ly_do) end where id=p_muc and trang_thai_muc='cho_duyet';
 v_after:=public.tien_do_task(v_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,null,case when p_duyet then 'duyet_de_xuat_muc' else 'tu_choi_de_xuat_muc' end,v_before,v_after);
 if v_proposer is not null then
  perform public.gui_thong_bao(v_proposer,'de_xuat_checklist',v_task,case when p_duyet then 'Đề xuất checklist đã được duyệt' else 'Đề xuất checklist bị từ chối: '||left(btrim(p_ly_do),900) end);
 end if;
end; $$;

revoke all on function public.them_muc_task(uuid,text,numeric),public.cap_nhat_muc_task(uuid,text,numeric),
 public.xoa_muc_task(uuid),public.de_xuat_muc(uuid,text),public.xu_ly_de_xuat_muc(uuid,boolean,text) from public,anon;
grant execute on function public.them_muc_task(uuid,text,numeric),public.cap_nhat_muc_task(uuid,text,numeric),
 public.xoa_muc_task(uuid),public.de_xuat_muc(uuid,text),public.xu_ly_de_xuat_muc(uuid,boolean,text) to authenticated;

create or replace function public.tick_muc(p_muc uuid,p_da_xong boolean)
returns numeric language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_member uuid; v_before numeric; v_after numeric; v_old_owner uuid; v_was_done boolean;
begin
 select c.task_id,t.project_id,t.trang_thai,c.nguoi_hoan_thanh,c.da_xong
 into v_task,v_project,v_state,v_old_owner,v_was_done
 from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or v_state<>'dang_lam' then raise exception 'Chỉ thành viên đang tham gia mới cập nhật được task Đang làm'; end if;
 if not(public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=v_task and member_id=v_member and trang_thai='dang_lam')) then raise exception 'Bạn không được giao task này'; end if;
 if v_was_done=p_da_xong then raise exception 'Mục đã ở trạng thái này; hãy tải lại dữ liệu'; end if;
 if not p_da_xong and v_old_owner<>v_member and not public.la_quan_ly(v_project) then raise exception 'Chỉ người đã hoàn thành mục hoặc quản lý mới được bỏ tích'; end if;
 if p_da_xong and not exists(select 1 from public.task_links where muc_id=p_muc and nguoi_them=v_member and trang_thai_link='hop_le') then raise exception 'Bạn cần tự gắn link minh chứng trước khi tích'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_checklist set da_xong=p_da_xong,nguoi_hoan_thanh=case when p_da_xong then v_member else null end,
  thoi_gian_hoan_thanh=case when p_da_xong then now() else null end where id=p_muc;
 v_after:=public.tien_do_task(v_task);
 update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,v_member,case when p_da_xong then 'tick_muc:'||p_muc else 'bo_tick_muc:'||p_muc end,v_before,v_after);
 return v_after;
end; $$;

create or replace function public.mo_lai_task(p_task uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_owner uuid;
begin
 select project_id into v_project from public.tasks where id=p_task and trang_thai='hoan_thanh' for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được mở lại task đã hoàn thành'; end if;
 if char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do cần từ 10 đến 1000 ký tự'; end if;
 update public.tasks set trang_thai='dang_lam',cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'mo_lai_task:'||left(btrim(p_ly_do),900),100,public.tien_do_task(p_task));
 for v_owner in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop
  perform public.gui_thong_bao(v_owner,'task_mo_lai',p_task,'Task đã được mở lại: '||left(btrim(p_ly_do),800));
 end loop;
end; $$;

create or replace function public.huy_task(p_task uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_member uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền hủy task'; end if;
 if v_state='da_huy' or (select trang_thai from public.projects where id=v_project)<>'dang_hoat_dong' then raise exception 'Task hoặc công việc không còn hoạt động'; end if;
 if char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do cần từ 10 đến 1000 ký tự'; end if;
 update public.tasks set trang_thai='da_huy',trang_thai_truoc_huy=v_state,ly_do_huy=btrim(p_ly_do),cap_nhat_luc=now() where id=p_task;
 for v_member in select member_id from public.task_yeu_cau where task_id=p_task and trang_thai='dang_cho' loop
  perform public.gui_thong_bao(v_member,'yeu_cau_chuyen_giao_da_dong',p_task,'Yêu cầu chuyển giao đóng vì task đã bị hủy');
 end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now()
  where task_id=p_task and trang_thai='dang_cho';
 delete from public.task_votes where task_id=p_task;
 perform public.ghi_log(v_project,p_task,null,'huy_task:'||left(btrim(p_ly_do),900));
 for v_member in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop
  perform public.gui_thong_bao(v_member,'task_bi_huy',p_task,'Task bị hủy: '||left(btrim(p_ly_do),800));
 end loop;
end; $$;

create or replace function public.xoa_task_trong(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid;
begin
 select project_id into v_project from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy task hoặc bạn không có quyền'; end if;
 if exists(select 1 from public.task_assignees where task_id=p_task)
  or exists(select 1 from public.task_checklist where task_id=p_task and da_xong)
  or exists(select 1 from public.activity_log where task_id=p_task) then raise exception 'Task đã có hoạt động, hãy hủy mềm'; end if;
 delete from public.task_votes where task_id=p_task;
 delete from public.task_links where task_id=p_task;
 delete from public.task_checklist where task_id=p_task;
 delete from public.task_details where task_id=p_task;
 delete from public.tasks where id=p_task;
end; $$;

revoke all on function public.tick_muc(uuid,boolean),public.mo_lai_task(uuid,text),public.huy_task(uuid,text),public.xoa_task_trong(uuid) from public,anon;
grant execute on function public.tick_muc(uuid,boolean),public.mo_lai_task(uuid,text),public.huy_task(uuid,text),public.xoa_task_trong(uuid) to authenticated;

-- Điểm chỉ trả trực tiếp cho quản lý khi đang làm; thành viên xem điểm của mình sau khi chốt.
create or replace function public.diem_hien_tai(p_project uuid,p_member uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_ma text; v_manager boolean; v_project_state text; v_people int; v_plan numeric; v_p numeric;
 v_b_den int; v_b_num int; v_c_den int; v_c_num int; v_a numeric; v_b numeric; v_c numeric;
 v_f numeric; v_wa numeric; v_wb numeric; v_wc numeric; v_den numeric; v_score numeric;
begin
 select trang_thai into v_project_state from public.projects where id=p_project;
 v_manager:=public.la_quan_ly(p_project);
 select pi.ma_dinh_danh into v_ma from public.members m join public.profile_rieng pi on pi.user_id=m.user_id
  where m.id=p_member and m.project_id=p_project;
 if v_ma is null then raise exception 'Không tìm thấy thành viên trong công việc này'; end if;
 if not v_manager and not exists(select 1 from public.members where id=p_member and user_id=auth.uid()) then raise exception 'Bạn không được xem điểm thành viên này'; end if;
 if v_project_state='dang_hoat_dong' and not v_manager then raise exception 'Điểm chỉ hiển thị cho thành viên sau khi chốt sổ'; end if;
 select coalesce(sum(c.trong_so),0) into v_plan from public.task_checklist c join public.tasks t on t.id=c.task_id
  where t.project_id=p_project and t.trang_thai<>'da_huy' and c.trang_thai_muc='da_duyet';
 select count(distinct pi.ma_dinh_danh) into v_people from public.members m join public.profile_rieng pi on pi.user_id=m.user_id
  where m.project_id=p_project and (
   m.trang_thai='dang_tham_gia'
   or exists(select 1 from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai<>'da_huy')
   or exists(select 1 from public.task_checklist c where c.nguoi_hoan_thanh=m.id and c.da_xong)
  );
 v_f:=case when v_people>0 then v_plan/v_people else 0 end;
 select coalesce(sum(case when exists(select 1 from public.task_dong_gop_dieu_chinh d where d.task_id=t.id)
    then (select coalesce(sum(d.phan_tram),0) from public.task_dong_gop_dieu_chinh d
      join public.members dm on dm.id=d.member_id join public.profile_rieng dpi on dpi.user_id=dm.user_id
      where d.task_id=t.id and dpi.ma_dinh_danh=v_ma)
       * (select coalesce(sum(c.trong_so),0) from public.task_checklist c where c.task_id=t.id and c.trang_thai_muc='da_duyet' and c.da_xong)/100
    else (select coalesce(sum(c.trong_so),0) from public.task_checklist c
      join public.members cm on cm.id=c.nguoi_hoan_thanh join public.profile_rieng cpi on cpi.user_id=cm.user_id
      where c.task_id=t.id and c.trang_thai_muc='da_duyet' and c.da_xong and cpi.ma_dinh_danh=v_ma)
   end),0) into v_p from public.tasks t where t.project_id=p_project;
 v_a:=case when v_f>0 then least(1,v_p/v_f) else null end;
 with my_rows as (
  select t.id,t.trang_thai,t.han_chot,a.trang_thai assignment_state,
   not(a.trang_thai='da_chuyen' and exists(select 1 from public.task_chuyen_giao x where x.task_id=t.id and x.tu_member=a.member_id and x.loai_chuyen='khach_quan')) eligible
  from public.task_assignees a join public.members m on m.id=a.member_id join public.profile_rieng pi on pi.user_id=m.user_id
  join public.tasks t on t.id=a.task_id where t.project_id=p_project and pi.ma_dinh_danh=v_ma and a.vai_tro_trong_task='chinh' and t.trang_thai<>'da_huy'
 ), by_task as (
  select id,max(trang_thai) trang_thai,max(han_chot) han_chot,bool_or(eligible) eligible,
   bool_or(assignment_state='dang_lam') active_principal from my_rows group by id
 )
 select count(*) filter(where eligible),count(*) filter(where eligible and active_principal and trang_thai='hoan_thanh'),
  count(*) filter(where trang_thai='hoan_thanh' and han_chot is not null and active_principal),
  count(*) filter(where trang_thai='hoan_thanh' and han_chot is not null and active_principal and
   coalesce((select max(l.thoi_gian) from public.activity_log l where l.task_id=by_task.id and l.hanh_dong in('duyet_task','tu_duyet')),
    now()) < ((han_chot+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))
 into v_b_den,v_b_num,v_c_den,v_c_num from by_task;
 v_b:=case when v_b_den>0 then v_b_num::numeric/v_b_den else null end;
 v_c:=case when v_c_den>0 then v_c_num::numeric/v_c_den else null end;
 if v_b_den=0 then return jsonb_build_object('trang_thai_diem','chua_duoc_giao','a',v_a,'b',v_b,'c',v_c,'diem',null,'phan_da_lam',v_p,'phan_ke_hoach',v_f); end if;
 select (trong_so_diem->>'a')::numeric,(trong_so_diem->>'b')::numeric,(trong_so_diem->>'c')::numeric into v_wa,v_wb,v_wc from public.projects where id=p_project;
 v_den:=case when v_a is not null then v_wa else 0 end+case when v_b is not null then v_wb else 0 end+case when v_c is not null then v_wc else 0 end;
 v_score:=case when v_den>0 then round(10*(coalesce(v_a*v_wa,0)+coalesce(v_b*v_wb,0)+coalesce(v_c*v_wc,0))/v_den,2) else null end;
 return jsonb_build_object('trang_thai_diem',case when v_p=0 then 'duoc_giao_chua_lam' else 'da_lam' end,
  'a',v_a,'b',v_b,'c',v_c,'diem',v_score,'phan_da_lam',v_p,'phan_ke_hoach',v_f,'so_task_duoc_giao',v_b_den);
end; $$;
revoke all on function public.diem_hien_tai(uuid,uuid) from public,anon;
grant execute on function public.diem_hien_tai(uuid,uuid) to authenticated;

create or replace function public.bao_cao_cong_viec(p_project uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_saved jsonb; v_result jsonb; v_status text;
begin
 if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được xem báo cáo'; end if;
 select trang_thai into v_status from public.projects where id=p_project;
 if v_status='luu_tru' then
  select du_lieu into v_saved from public.chot_so where project_id=p_project order by lan_chot desc limit 1;
  if v_saved is null then raise exception 'Chưa tìm thấy bản chốt sổ'; end if;
  select coalesce(jsonb_agg(jsonb_set(jsonb_set(m,'{diem_chot}',coalesce(to_jsonb(s.diem_chot),'null'::jsonb),true),
    '{ly_do_dieu_chinh}',coalesce(to_jsonb(s.ly_do_dieu_chinh),'null'::jsonb),true) order by m->>'ma_dinh_danh'),'[]'::jsonb)
   into v_result from jsonb_array_elements(coalesce(v_saved->'members','[]'::jsonb)) m
   left join lateral (
    select max(d.diem_chot) diem_chot,string_agg(distinct d.ly_do_dieu_chinh,'; ') filter(where d.ly_do_dieu_chinh is not null) ly_do_dieu_chinh
    from public.diem_thanh_vien d join public.chot_so s on s.id=d.chot_so_id
    where s.project_id=p_project and s.id=(select id from public.chot_so where project_id=p_project order by lan_chot desc limit 1)
     and d.member_id=any(array(select jsonb_array_elements_text(coalesce(m->'member_ids',jsonb_build_array(m->>'member_id')))::uuid))
   ) s on true;
  return jsonb_set(v_saved,'{members}',v_result,true);
 end if;
 select jsonb_build_object(
  'project',jsonb_build_object('id',p.id,'ten',p.ten,'trang_thai',p.trang_thai,'max_members',p.max_members,'tao_luc',p.tao_luc,'trong_so_diem',p.trong_so_diem),
  'summary',jsonb_build_object('so_thanh_vien', (select count(*) from public.members m where m.project_id=p_project and m.trang_thai='dang_tham_gia'),
   'so_task', (select count(*) from public.tasks t where t.project_id=p_project and t.trang_thai<>'da_huy'),
   'tien_do_trung_binh', (select coalesce(round(avg(t.tien_do),2),0) from public.tasks t where t.project_id=p_project and t.trang_thai<>'da_huy'),
   'so_task_hoan_thanh',(select count(*) from public.tasks t where t.project_id=p_project and t.trang_thai='hoan_thanh'),
   'so_task_dang_lam',(select count(*) from public.tasks t where t.project_id=p_project and t.trang_thai in('can_lam','dang_lam','cho_duyet'))),
  'members',coalesce((select jsonb_agg(jsonb_build_object(
   'member_id',g.member_ids[1],'member_ids',to_jsonb(g.member_ids),'user_ids',to_jsonb(g.user_ids),'ma_dinh_danh',g.ma_dinh_danh,
   'ho_ten',g.ho_ten,'don_vi',g.don_vi,'vai_tro',g.vai_tro,'trang_thai',g.trang_thai,
   'so_task_duoc_giao',coalesce((select count(*) from (select t.id from public.tasks t join public.task_assignees a on a.task_id=t.id
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and t.trang_thai<>'da_huy'
     and not(a.trang_thai='da_chuyen' and exists(select 1 from public.task_chuyen_giao x where x.task_id=t.id and x.tu_member=a.member_id and x.loai_chuyen='khach_quan')) group by t.id) x),0),
   'so_task_hoan_thanh',coalesce((select count(distinct t.id) from public.tasks t join public.task_assignees a on a.task_id=t.id
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and a.trang_thai='dang_lam' and t.trang_thai='hoan_thanh'),0),
   'so_task_dang_lam',coalesce((select count(distinct t.id) from public.tasks t join public.task_assignees a on a.task_id=t.id
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet')),0),
   'so_task_qua_han',coalesce((select count(distinct t.id) from public.tasks t join public.task_assignees a on a.task_id=t.id
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet') and t.han_chot<(now() at time zone 'Asia/Ho_Chi_Minh')::date),0),
   'diem',public.diem_hien_tai(p_project,g.member_ids[1]),'diem_chot',null,'task_ids',coalesce((select jsonb_agg(distinct t.id) from public.tasks t join public.task_assignees a on a.task_id=t.id where a.member_id=any(g.member_ids) and t.project_id=p_project),'[]'::jsonb)
  ) order by g.ma_dinh_danh) from (
   select pi.ma_dinh_danh,array_agg(m.id order by m.id) member_ids,array_agg(m.user_id order by m.id) user_ids,
    string_agg(distinct pr.ho_ten,' / ' order by pr.ho_ten) ho_ten,string_agg(distinct pr.don_vi,' / ' order by pr.don_vi) don_vi,
    string_agg(distinct m.vai_tro,' / ' order by m.vai_tro) vai_tro,string_agg(distinct m.trang_thai,' / ' order by m.trang_thai) trang_thai
   from public.members m join public.profiles pr on pr.user_id=m.user_id join public.profile_rieng pi on pi.user_id=m.user_id
   where m.project_id=p_project and (m.trang_thai='dang_tham_gia' or exists(select 1 from public.task_assignees a where a.member_id=m.id and a.trang_thai='dang_lam') or exists(select 1 from public.task_checklist c where c.nguoi_hoan_thanh=m.id and c.da_xong))
   group by pi.ma_dinh_danh
  ) g),'[]'::jsonb),
  'tasks',coalesce((select jsonb_agg(jsonb_build_object(
   'task_id',t.id,'tieu_de',d.tieu_de,'mo_ta',d.mo_ta,'trang_thai',t.trang_thai,'han_chot',t.han_chot,'tien_do',t.tien_do,'ly_do_huy',t.ly_do_huy,
   'tu_duyet',exists(select 1 from public.activity_log l where l.task_id=t.id and l.hanh_dong='tu_duyet'),
   'assignees',(select coalesce(jsonb_agg(jsonb_build_object('member_id',a.member_id,'ho_ten',pr.ho_ten,'ma_dinh_danh',pi.ma_dinh_danh,'vai_tro',a.vai_tro_trong_task,'trang_thai',a.trang_thai,'giao_boi',a.giao_boi,'giao_boi_ten',gp.ho_ten,'thoi_gian_giao',a.thoi_gian_giao) order by a.thoi_gian_giao),'[]'::jsonb)
    from public.task_assignees a join public.members m on m.id=a.member_id join public.profiles pr on pr.user_id=m.user_id join public.profile_rieng pi on pi.user_id=m.user_id left join public.profiles gp on gp.user_id=a.giao_boi where a.task_id=t.id),
   'checklist',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'noi_dung',c.noi_dung,'trong_so',c.trong_so,'da_xong',c.da_xong,'nguoi_hoan_thanh',c.nguoi_hoan_thanh,'ho_ten_nguoi_hoan_thanh',cp.ho_ten,'thoi_gian_hoan_thanh',c.thoi_gian_hoan_thanh,'trang_thai_muc',c.trang_thai_muc,'ly_do_xu_ly',c.ly_do_xu_ly,'links',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'url',l.url,'ghi_chu',l.ghi_chu,'trang_thai_link',l.trang_thai_link,'ly_do_tu_choi',l.ly_do_tu_choi,'thoi_gian',l.thoi_gian) order by l.thoi_gian) from public.task_links l where l.muc_id=c.id),'[]'::jsonb)) order by c.tao_luc),'[]'::jsonb) from public.task_checklist c left join public.members cm on cm.id=c.nguoi_hoan_thanh left join public.profiles cp on cp.user_id=cm.user_id where c.task_id=t.id),
   'contributions',(select coalesce(jsonb_agg(jsonb_build_object('member_id',x.member_id,'ho_ten',x.ho_ten,'ma_dinh_danh',x.ma_dinh_danh,'phan_tram',x.phan_tram) order by x.ma_dinh_danh),'[]'::jsonb) from (
    select a.member_id,pr.ho_ten,pi.ma_dinh_danh,a.phan_tram from public.task_dong_gop_dieu_chinh a join public.members m on m.id=a.member_id join public.profiles pr on pr.user_id=m.user_id join public.profile_rieng pi on pi.user_id=m.user_id where a.task_id=t.id and exists(select 1 from public.task_dong_gop_dieu_chinh x where x.task_id=t.id)
    union all
    select c.nguoi_hoan_thanh,pr.ho_ten,pi.ma_dinh_danh,100*sum(c.trong_so)/nullif((select sum(z.trong_so) from public.task_checklist z where z.task_id=t.id and z.da_xong and z.trang_thai_muc='da_duyet'),0)
    from public.task_checklist c join public.members m on m.id=c.nguoi_hoan_thanh join public.profiles pr on pr.user_id=m.user_id join public.profile_rieng pi on pi.user_id=m.user_id
    where c.task_id=t.id and c.da_xong and c.trang_thai_muc='da_duyet' and not exists(select 1 from public.task_dong_gop_dieu_chinh x where x.task_id=t.id) group by c.nguoi_hoan_thanh,pr.ho_ten,pi.ma_dinh_danh
   ) x),
   'transfer_history',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'tu_member',x.tu_member,'tu_ten',p1.ho_ten,'den_member',x.den_member,'den_ten',p2.ho_ten,'nguoi_chuyen',x.nguoi_chuyen,'nguoi_chuyen_ten',p3.ho_ten,'tien_do_luc_chuyen',x.tien_do_luc_chuyen,'loai_chuyen',x.loai_chuyen,'ly_do',x.ly_do,'da_sua_loai',x.da_sua_loai,'thoi_gian',x.thoi_gian) order by x.thoi_gian),'[]'::jsonb) from public.task_chuyen_giao x join public.members m1 on m1.id=x.tu_member join public.profiles p1 on p1.user_id=m1.user_id join public.members m2 on m2.id=x.den_member join public.profiles p2 on p2.user_id=m2.user_id left join public.profiles p3 on p3.user_id=x.nguoi_chuyen where x.task_id=t.id)
  ) order by t.tao_luc) from public.tasks t join public.task_details d on d.task_id=t.id where t.project_id=p_project),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(jsonb_build_object('thoi_gian',l.thoi_gian,'hanh_dong',l.hanh_dong,'member_id',l.member_id,'ho_ten',pr.ho_ten,'task_id',l.task_id,'tien_do_truoc',l.tien_do_truoc,'tien_do_sau',l.tien_do_sau) order by l.thoi_gian) from public.activity_log l left join public.members m on m.id=l.member_id left join public.profiles pr on pr.user_id=m.user_id where l.project_id=p_project),'[]'::jsonb),
  'warnings','[]'::jsonb,'caveat','Điểm chỉ phản ánh hoạt động được ghi; minh chứng là link người dùng cung cấp, hệ thống không xác thực nội dung. Mã định danh trùng được gộp thành một người; người vào muộn cần nhóm trưởng điều chỉnh điểm kèm lý do.')
 into v_result from public.projects p where p.id=p_project;
 return coalesce(v_result,'{}'::jsonb);
end; $$;
revoke all on function public.bao_cao_cong_viec(uuid) from public,anon;
grant execute on function public.bao_cao_cong_viec(uuid) to authenticated;

-- Bản vá cho hệ thống đã chạy 01–07: bỏ qua hạn mới null và giữ thời điểm giao gốc.
create or replace function public.chuyen_giao_task(p_task uuid,p_tu_member uuid,p_den_member uuid,p_loai text,p_ly_do text,p_han_moi date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_progress numeric; v_new uuid; v_vai text; v_old_user uuid; v_new_user uuid; v_old_due date;
begin
 select project_id,trang_thai,tien_do,han_chot into v_project,v_state,v_progress,v_old_due from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) or v_state not in('can_lam','dang_lam') then raise exception 'Chỉ quản lý được chuyển task Cần làm/Đang làm'; end if;
 if p_loai not in('khach_quan','chua_kip') or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Chọn loại chuyển và nhập lý do từ 10 ký tự'; end if;
 select a.vai_tro_trong_task,m.user_id into v_vai,v_old_user from public.task_assignees a join public.members m on m.id=a.member_id where a.task_id=p_task and a.member_id=p_tu_member and (a.trang_thai='dang_lam' or (a.trang_thai='da_go' and m.trang_thai='da_roi' and a.vai_tro_trong_task='chinh' and exists(select 1 from public.loai_nguoi l where l.member_id=m.id and l.project_id=v_project and l.xu_ly_tien_do='giu'))) for update of a;
 if v_vai is null then raise exception 'Người chuyển không còn được giao task'; end if;
 if v_vai<>'chinh' then raise exception 'Người hỗ trợ được gỡ khỏi task, không chuyển giao vai trò chính'; end if;
 select user_id into v_new_user from public.members where id=p_den_member and project_id=v_project and trang_thai='dang_tham_gia';
 if v_new_user is null or v_new_user=v_old_user then raise exception 'Người nhận phải là thành viên đang tham gia khác'; end if;
 update public.task_assignees set trang_thai='da_chuyen' where task_id=p_task and member_id=p_tu_member;
 insert into public.task_assignees(task_id,member_id,vai_tro_trong_task,trang_thai,giao_boi) values(p_task,p_den_member,'chinh','dang_lam',auth.uid())
 on conflict(task_id,member_id) do update set vai_tro_trong_task='chinh',trang_thai='dang_lam',giao_boi=auth.uid();
 insert into public.task_chuyen_giao(task_id,tu_member,den_member,nguoi_chuyen,tien_do_luc_chuyen,loai_chuyen,ly_do) values(p_task,p_tu_member,p_den_member,auth.uid(),v_progress,p_loai,btrim(p_ly_do)) returning id into v_new;
 update public.tasks set han_chot=coalesce(p_han_moi,han_chot),cap_nhat_luc=now() where id=p_task;
 if p_han_moi is not null and p_han_moi is distinct from v_old_due then
  perform public.ghi_log(v_project,p_task,null,'doi_han_chot_khi_chuyen:'||coalesce(v_old_due::text,'chua_dat')||'->'||p_han_moi::text||':'||left(btrim(p_ly_do),500));
 end if;
 for v_new_user in select member_id from public.task_yeu_cau where task_id=p_task and trang_thai='dang_cho' loop perform public.gui_thong_bao(v_new_user,'yeu_cau_chuyen_giao_da_xu_ly',p_task,'Yêu cầu chuyển giao đã được xử lý do task chuyển người chính'); end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now() where task_id=p_task and trang_thai='dang_cho';
 perform public.ghi_log(v_project,p_task,p_tu_member,'chuyen_giao:'||p_loai,v_progress,v_progress);
 perform public.gui_thong_bao(p_tu_member,'task_chuyen_di',p_task,'Task đã chuyển cho thành viên khác: '||left(p_ly_do,900));
 perform public.gui_thong_bao(p_den_member,'task_nhan_chuyen_giao',p_task,'Bạn nhận task đã làm được '||v_progress||'%');
 return v_new;
end; $$;

-- Lưu cảnh báo cùng snapshot trước khi đóng project để báo cáo lịch sử không đổi theo thời gian.
create or replace function public.ket_thuc_cong_viec(p_project uuid,p_xac_nhan boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text; v_warn jsonb; v_id uuid; v_lane int; v_report jsonb; v_member record; v_score jsonb; v_contrib numeric;
begin
 select vai_tro into v_actor_role from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if coalesce(v_actor_role,'') not in('truong_nhom','pho_nhom') or (select trang_thai from public.projects where id=p_project for update)<>'dang_hoat_dong' then raise exception 'Không có quyền hoặc công việc đã kết thúc'; end if;
 select coalesce(jsonb_agg(item),'[]'::jsonb) into v_warn from (
  select jsonb_build_object('loai','task_chua_xong','task_id',t.id,'tieu_de',d.tieu_de,'trang_thai',t.trang_thai,'tien_do',t.tien_do) item from public.tasks t join public.task_details d on d.task_id=t.id where t.project_id=p_project and t.trang_thai not in('hoan_thanh','da_huy')
  union all select jsonb_build_object('loai','link_bi_tu_choi','task_id',l.task_id,'link_id',l.id,'ly_do',l.ly_do_tu_choi) from public.task_links l join public.tasks t on t.id=l.task_id where t.project_id=p_project and l.trang_thai_link='bi_tu_choi'
  union all select jsonb_build_object('loai','yeu_cau_chuyen_giao','task_id',r.task_id,'request_id',r.id,'member_id',r.member_id) from public.task_yeu_cau r join public.tasks t on t.id=r.task_id where t.project_id=p_project and r.trang_thai='dang_cho'
 ) warnings(item);
 if jsonb_array_length(v_warn)>0 and not p_xac_nhan then return jsonb_build_object('canh_bao',v_warn,'can_xac_nhan',true); end if;
 select coalesce(max(lan_chot),0)+1 into v_lane from public.chot_so where project_id=p_project;
 v_report:=jsonb_set(public.bao_cao_cong_viec(p_project),'{warnings}',v_warn,true);
 insert into public.chot_so(project_id,lan_chot,nguoi_chot,du_lieu) values(p_project,v_lane,auth.uid(),v_report) returning id into v_id;
 for v_member in select id from public.members where project_id=p_project and (trang_thai='dang_tham_gia' or exists(select 1 from public.task_assignees a where a.member_id=id) or exists(select 1 from public.task_checklist c where c.nguoi_hoan_thanh=id)) loop
  v_score:=public.diem_hien_tai(p_project,v_member.id);
  select round(100*sum(c.trong_so) filter(where c.da_xong and c.nguoi_hoan_thanh=v_member.id)/nullif(sum(c.trong_so) filter(where c.da_xong),0),4) into v_contrib from public.task_checklist c join public.tasks t on t.id=c.task_id where t.project_id=p_project;
  insert into public.chot_so_chi_tiet(chot_so_id,member_id,phan_tram_dong_gop,du_lieu) values(v_id,v_member.id,v_contrib,v_score);
  insert into public.diem_thanh_vien(chot_so_id,member_id,diem_cong_thuc,diem_chot) values(v_id,v_member.id,(v_score->>'diem')::numeric,(v_score->>'diem')::numeric);
 end loop;
 update public.projects set trang_thai='luu_tru',join_code=null where id=p_project;
 update public.join_requests set trang_thai='het_han',xu_ly_boi=auth.uid(),xu_ly_luc=now() where project_id=p_project and trang_thai='cho_duyet';
 perform public.ghi_log(p_project,null,null,'ket_thuc_cong_viec');
 for v_member in select id from public.members where project_id=p_project and trang_thai='dang_tham_gia' loop perform public.gui_thong_bao(v_member.id,'cong_viec_ket_thuc',null,'Công việc đã kết thúc và được chốt sổ'); end loop;
 return jsonb_build_object('chot_so_id',v_id,'canh_bao',v_warn,'can_xac_nhan',false);
end; $$;
revoke all on function public.chuyen_giao_task(uuid,uuid,uuid,text,text,date),public.ket_thuc_cong_viec(uuid,boolean) from public,anon;
grant execute on function public.chuyen_giao_task(uuid,uuid,uuid,text,text,date),public.ket_thuc_cong_viec(uuid,boolean) to authenticated;

-- Khi giữ tiến độ lúc kick, giữ dòng người chính dang_lam để nhóm quản lý chuyển tiếp được.
create or replace function public.loai_thanh_vien(p_member uuid,p_ly_do text,p_xu_ly_tien_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_role text; v_actor_role text; v_task record; v_count int; v_progress numeric;
begin
 if p_xu_ly_tien_do not in('giu','xoa','khong_co') then raise exception 'Cách xử lý tiến độ không hợp lệ'; end if;
 if char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do cần từ 10 đến 1000 ký tự'; end if;
 select project_id,user_id,vai_tro into v_project,v_user,v_role from public.members where id=p_member and trang_thai='dang_tham_gia' for update;
 if v_project is null or v_user=auth.uid() then raise exception 'Không thể loại chính mình hoặc thành viên không còn hoạt động'; end if;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền loại thành viên'; end if;
 select vai_tro into v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_role='truong_nhom' then raise exception 'Không thể loại nhóm trưởng'; end if;
 if v_role='pho_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được loại phó nhóm'; end if;
 if exists(select 1 from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai='cho_duyet') then raise exception 'Trả lại task Chờ duyệt trước khi loại thành viên'; end if;
 select count(*) into v_count from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam');
 if v_count>0 and p_xu_ly_tien_do='khong_co' then raise exception 'Chọn cách xử lý tiến độ cho các task đang làm'; end if;
 for v_task in select t.id,t.project_id,t.trang_thai,a.vai_tro_trong_task from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam') loop
  if p_xu_ly_tien_do='xoa' then
   v_progress:=public.tien_do_task(v_task.id);
   update public.task_checklist set da_xong=false,nguoi_hoan_thanh=null,thoi_gian_hoan_thanh=null where task_id=v_task.id and nguoi_hoan_thanh=p_member;
   update public.task_assignees set trang_thai='da_go' where task_id=v_task.id and member_id=p_member;
   update public.tasks set tien_do=public.tien_do_task(v_task.id),trang_thai=case when v_task.vai_tro_trong_task='chinh' then 'can_lam' else trang_thai end,cap_nhat_luc=now() where id=v_task.id;
   perform public.ghi_log(v_task.project_id,v_task.id,p_member,'loai_xoa_tien_do',v_progress,public.tien_do_task(v_task.id));
  elsif p_xu_ly_tien_do='giu' then
   if v_task.vai_tro_trong_task='ho_tro' then update public.task_assignees set trang_thai='da_go' where task_id=v_task.id and member_id=p_member; end if;
   perform public.ghi_log(v_task.project_id,v_task.id,p_member,'loai_giu_tien_do',public.tien_do_task(v_task.id),public.tien_do_task(v_task.id));
  end if;
 end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now() where member_id=p_member and trang_thai='dang_cho';
 update public.members set trang_thai='da_roi',ly_do_roi='bi_loai' where id=p_member;
 insert into public.loai_nguoi(project_id,member_id,user_id,xu_ly_tien_do,ly_do,nguoi_loai) values(v_project,p_member,v_user,p_xu_ly_tien_do,btrim(p_ly_do),auth.uid());
 perform public.ghi_log(v_project,null,p_member,'loai_thanh_vien');
 for v_task in select id from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_task.id,'thanh_vien_bi_loai',null,'Một thành viên đã bị loại khỏi công việc'); end loop;
end; $$;
revoke all on function public.loai_thanh_vien(uuid,text,text) from public,anon;
grant execute on function public.loai_thanh_vien(uuid,text,text) to authenticated;

-- Mã định danh trùng được gộp thành một người trong báo cáo; không cho tự chỉnh qua tài khoản trùng.
create or replace function public.dieu_chinh_diem(p_project uuid,p_member uuid,p_diem numeric,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_actor_role text; v_actor_ma text; v_target_ma text; v_has_leader boolean; v_chot uuid;
begin
 if p_diem is null or p_diem not between 0 and 10 or char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Điểm phải từ 0 đến 10 và lý do từ 10 đến 1000 ký tự'; end if;
 select m.id,m.vai_tro,pi.ma_dinh_danh into v_actor,v_actor_role,v_actor_ma from public.members m join public.profile_rieng pi on pi.user_id=m.user_id
  where m.project_id=p_project and m.user_id=auth.uid() and m.trang_thai='dang_tham_gia';
 if v_actor is null or not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được điều chỉnh điểm'; end if;
 select pi.ma_dinh_danh into v_target_ma from public.members m join public.profile_rieng pi on pi.user_id=m.user_id where m.id=p_member and m.project_id=p_project;
 if v_target_ma is null then raise exception 'Không tìm thấy thành viên trong công việc'; end if;
 if v_target_ma=v_actor_ma then raise exception 'Không được tự điều chỉnh điểm của mình'; end if;
 select exists(select 1 from public.members m join public.profile_rieng pi on pi.user_id=m.user_id where m.project_id=p_project and pi.ma_dinh_danh=v_target_ma and m.vai_tro='truong_nhom') into v_has_leader;
 if v_has_leader and v_actor_role<>'pho_nhom' then raise exception 'Chỉ phó nhóm được điều chỉnh điểm nhóm trưởng'; end if;
 select id into v_chot from public.chot_so where project_id=p_project order by lan_chot desc limit 1;
 if v_chot is null then raise exception 'Chưa có lần chốt sổ'; end if;
 update public.diem_thanh_vien d set diem_chot=p_diem,ly_do_dieu_chinh=btrim(p_ly_do),nguoi_dieu_chinh=auth.uid()
  from public.members m join public.profile_rieng pi on pi.user_id=m.user_id
  where d.chot_so_id=v_chot and d.member_id=m.id and m.project_id=p_project and pi.ma_dinh_danh=v_target_ma;
 if not found then raise exception 'Không tìm thấy dòng điểm đã chốt'; end if;
 perform public.ghi_log(p_project,null,p_member,'dieu_chinh_diem:'||p_diem||':'||left(btrim(p_ly_do),500));
end; $$;
revoke all on function public.dieu_chinh_diem(uuid,uuid,numeric,text) from public,anon;
grant execute on function public.dieu_chinh_diem(uuid,uuid,numeric,text) to authenticated;
