-- 05_task_workflows.sql — tạo, giao, checklist, minh chứng, duyệt, hủy/khôi phục, bình chọn.
-- Chạy sau 04_task_schema.sql. Mọi ghi đều RPC, cùng transaction với log/thông báo.

create or replace function public.ghi_log(p_project uuid,p_task uuid,p_member uuid,p_hanh_dong text,p_truoc numeric default null,p_sau numeric default null)
returns void language sql security definer set search_path='' as $$
 insert into public.activity_log(project_id,task_id,member_id,hanh_dong,tien_do_truoc,tien_do_sau)
 values(p_project,p_task,p_member,p_hanh_dong,p_truoc,p_sau);
$$;
create or replace function public.gui_thong_bao(p_member uuid,p_loai text,p_task uuid,p_noi_dung text)
returns void language sql security definer set search_path='' as $$
 insert into public.thong_bao(member_id,loai,task_id,noi_dung)
 select p_member,p_loai,p_task,p_noi_dung from public.members m where m.id=p_member and m.trang_thai='dang_tham_gia';
$$;
create or replace function public.tien_do_task(p_task uuid)
returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(round(100.0*sum(case when da_xong then trong_so else 0 end)/nullif(sum(trong_so),0),2),0)
 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet';
$$;
create or replace function public.co_the_duyet_task(p_task uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_project uuid; v_managers int; v_is_assigned boolean;
begin
 select project_id into v_project from public.tasks where id=p_task;
 if not public.la_quan_ly(v_project) then return false; end if;
 select count(*) into v_managers from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom');
 select exists(select 1 from public.task_assignees a join public.members m on m.id=a.member_id where a.task_id=p_task and a.trang_thai='dang_lam' and m.user_id=auth.uid()) into v_is_assigned;
 return not v_is_assigned or v_managers=1;
end; $$;
revoke all on function public.ghi_log(uuid,uuid,uuid,text,numeric,numeric),public.gui_thong_bao(uuid,text,uuid,text),public.tien_do_task(uuid),public.co_the_duyet_task(uuid) from public,anon,authenticated;

create or replace function public.tao_task(p_project uuid,p_tieu_de text,p_mo_ta text,p_han_chot date,p_checklist jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_item jsonb; v_n int:=0;
begin
 if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó mới được tạo task'; end if;
 if not exists(select 1 from public.projects where id=p_project and trang_thai='dang_hoat_dong') then raise exception 'Công việc đã lưu trữ'; end if;
 if char_length(btrim(coalesce(p_tieu_de,''))) not between 1 and 200 then raise exception 'Tiêu đề task phải từ 1 đến 200 ký tự'; end if;
 if char_length(coalesce(p_mo_ta,''))>5000 then raise exception 'Mô tả tối đa 5000 ký tự'; end if;
 if coalesce(jsonb_typeof(p_checklist),'')<>'array' or jsonb_array_length(p_checklist)<1 or jsonb_array_length(p_checklist)>30 then raise exception 'Task cần từ 1 đến 30 mục checklist'; end if;
 insert into public.tasks(project_id,han_chot) values(p_project,p_han_chot) returning id into v_task;
 insert into public.task_details(task_id,tieu_de,mo_ta) values(v_task,btrim(p_tieu_de),coalesce(p_mo_ta,''));
 for v_item in select value from jsonb_array_elements(p_checklist) loop
  if char_length(btrim(coalesce(v_item->>'noi_dung','')))=0 then raise exception 'Nội dung checklist không được để trống'; end if;
  insert into public.task_checklist(task_id,noi_dung,trong_so) values(v_task,btrim(v_item->>'noi_dung'),coalesce((v_item->>'trong_so')::numeric,1));
  v_n:=v_n+1;
 end loop;
 perform public.ghi_log(p_project,null,(select id from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia'),'tao_task:'||v_task::text);
 return v_task;
end; $$;

create or replace function public.cap_nhat_task(p_task uuid,p_tieu_de text,p_mo_ta text,p_han_chot date)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy task hoặc bạn không có quyền'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if char_length(btrim(coalesce(p_tieu_de,''))) not between 1 and 200 or char_length(coalesce(p_mo_ta,''))>5000 then raise exception 'Tiêu đề hoặc mô tả vượt giới hạn'; end if;
 update public.task_details set tieu_de=btrim(p_tieu_de),mo_ta=coalesce(p_mo_ta,'') where task_id=p_task;
 update public.tasks set han_chot=p_han_chot,cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'cap_nhat_task');
end; $$;

create or replace function public.gan_task(p_task uuid,p_member uuid,p_vai_tro text default 'chinh')
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_uid uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy task hoặc bạn không có quyền'; end if;
 if (p_vai_tro='chinh' and v_state<>'can_lam') or (p_vai_tro='ho_tro' and v_state not in('can_lam','dang_lam')) or not exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet') then raise exception 'Chỉ có thể giao người chính khi Cần làm, hoặc người hỗ trợ khi Cần làm/Đang làm'; end if;
 if p_vai_tro not in('chinh','ho_tro') then raise exception 'Vai trò task không hợp lệ'; end if;
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

create or replace function public.bat_dau_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_member uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where user_id=auth.uid() and project_id=v_project and trang_thai='dang_tham_gia';
 if v_state<>'can_lam' or not exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and trang_thai='dang_lam') then raise exception 'Bạn không thể bắt đầu task này'; end if;
 update public.tasks set trang_thai='dang_lam',cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,v_member,'bat_dau',0,public.tien_do_task(p_task));
end; $$;

create or replace function public.them_muc_task(p_task uuid,p_noi_dung text,p_trong_so numeric default 1)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_id uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if (select count(*) from public.task_checklist where task_id=p_task)>=30 then raise exception 'Mỗi task tối đa 30 mục checklist'; end if;
 insert into public.task_checklist(task_id,noi_dung,trong_so) values(p_task,btrim(p_noi_dung),p_trong_so) returning id into v_id;
 perform public.ghi_log(v_project,p_task,null,'them_muc'); return v_id;
end; $$;
create or replace function public.cap_nhat_muc_task(p_muc uuid,p_noi_dung text,p_trong_so numeric)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text;
begin
 select c.task_id,t.project_id,t.trang_thai into v_task,v_project,v_state from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 update public.task_checklist set noi_dung=btrim(p_noi_dung),trong_so=p_trong_so where id=p_muc;
 perform public.ghi_log(v_project,v_task,null,'sua_muc');
end; $$;
create or replace function public.xoa_muc_task(p_muc uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text;
begin
 select c.task_id,t.project_id,t.trang_thai into v_task,v_project,v_state from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa checklist'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') or (select da_xong from public.task_checklist where id=p_muc) then raise exception 'Bỏ tích mục trước khi xóa; task đang khóa'; end if;
 if (select count(*) from public.task_checklist where task_id=v_task and trang_thai_muc='da_duyet')<=1 and exists(select 1 from public.task_assignees where task_id=v_task and trang_thai='dang_lam') then raise exception 'Task đã giao phải còn ít nhất một mục'; end if;
 delete from public.task_checklist where id=p_muc;
 perform public.ghi_log(v_project,v_task,null,'xoa_muc');
end; $$;
create or replace function public.de_xuat_muc(p_task uuid,p_noi_dung text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_id uuid;
begin
 select project_id into v_project from public.tasks where id=p_task and trang_thai='dang_lam';
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or not exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and trang_thai='dang_lam') then raise exception 'Chỉ người được giao mới đề xuất checklist'; end if;
 if (select count(*) from public.task_checklist where task_id=p_task and de_xuat_boi=v_member and trang_thai_muc='cho_duyet')>=5 then raise exception 'Bạn đã có 5 đề xuất đang chờ'; end if;
 insert into public.task_checklist(task_id,noi_dung,de_xuat_boi,trang_thai_muc) values(p_task,btrim(p_noi_dung),v_member,'cho_duyet') returning id into v_id; return v_id;
end; $$;
create or replace function public.xu_ly_de_xuat_muc(p_muc uuid,p_duyet boolean,p_ly_do text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_user uuid;
begin
 select c.task_id,t.project_id,m.user_id into v_task,v_project,v_user from public.task_checklist c join public.tasks t on t.id=c.task_id left join public.members m on m.id=c.de_xuat_boi where c.id=p_muc and c.trang_thai_muc='cho_duyet';
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền'; end if;
 update public.task_checklist set trang_thai_muc=case when p_duyet then 'da_duyet' else 'tu_choi' end where id=p_muc;
 if not p_duyet and char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do từ chối cần ít nhất 10 ký tự'; end if;
 if v_user is not null then perform public.gui_thong_bao((select id from public.members where user_id=v_user and project_id=v_project),'de_xuat_checklist',v_task,coalesce(p_ly_do,'Đề xuất checklist đã được xử lý')); end if;
end; $$;

create or replace function public.them_link(p_muc uuid,p_url text,p_ghi_chu text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_member uuid; v_host text; v_norm text; v_id uuid;
begin
 select c.task_id,t.project_id into v_task,v_project from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or not (public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=v_task and member_id=v_member and trang_thai='dang_lam')) then raise exception 'Bạn không được gắn minh chứng cho task này'; end if;
 if (select trang_thai from public.tasks where id=v_task) in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if char_length(p_url)>2000 or p_url !~ '^https://[^[:space:]]+$' or p_url ~* '^https://[^/@:]+:[^/@]+@' then raise exception 'Link phải là HTTPS hợp lệ, không chứa khoảng trắng hoặc thông tin đăng nhập'; end if;
 v_host:=lower(split_part(split_part(p_url,'://',2),'/',1)); if position('.' in v_host)=0 then raise exception 'Link cần có tên miền hợp lệ'; end if;
 v_norm:=regexp_replace(rtrim(btrim(p_url),'/'),'^https://([^/]+)','https://'||lower(v_host));
 if (select count(*) from public.task_links where muc_id=p_muc)>=10 then raise exception 'Mỗi mục tối đa 10 link'; end if;
 insert into public.task_links(task_id,muc_id,url,url_chuan_hoa,ghi_chu,nguoi_them) values(v_task,p_muc,btrim(p_url),v_norm,left(coalesce(p_ghi_chu,''),1000),v_member) returning id into v_id;
 perform public.ghi_log(v_project,v_task,v_member,'them_link'); return v_id;
end; $$;
create or replace function public.xoa_link(p_link uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_muc uuid; v_member uuid; v_state text;
begin
 select l.task_id,t.project_id,l.muc_id,l.nguoi_them,t.trang_thai into v_task,v_project,v_muc,v_member,v_state from public.task_links l join public.tasks t on t.id=l.task_id where l.id=p_link;
 if not (public.la_quan_ly(v_project) or exists(select 1 from public.members where id=v_member and user_id=auth.uid() and trang_thai='dang_tham_gia')) then raise exception 'Bạn không có quyền xóa link'; end if;
 if v_state in('cho_duyet','hoan_thanh','da_huy') then raise exception 'Task đang bị khóa'; end if;
 if (select da_xong from public.task_checklist where id=v_muc) then raise exception 'Bỏ tích mục trước khi xóa link'; end if;
 delete from public.task_links where id=p_link; perform public.ghi_log(v_project,v_task,v_member,'xoa_link');
end; $$;

create or replace function public.tick_muc(p_muc uuid,p_da_xong boolean)
returns numeric language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_member uuid; v_before numeric; v_after numeric;
begin
 select c.task_id,t.project_id,t.trang_thai into v_task,v_project,v_state from public.task_checklist c join public.tasks t on t.id=c.task_id where c.id=p_muc for update of c,t;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_state<>'dang_lam' then raise exception 'Chỉ task Đang làm mới được cập nhật'; end if;
 if not (public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=v_task and member_id=v_member and trang_thai='dang_lam')) then raise exception 'Bạn không được giao task này'; end if;
 if p_da_xong and not exists(select 1 from public.task_links where muc_id=p_muc and nguoi_them=v_member and trang_thai_link='hop_le') then raise exception 'Bạn cần tự gắn link minh chứng trước khi tích'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_checklist set da_xong=p_da_xong,nguoi_hoan_thanh=case when p_da_xong then v_member else null end,thoi_gian_hoan_thanh=case when p_da_xong then now() else null end where id=p_muc;
 v_after:=public.tien_do_task(v_task); update public.tasks set tien_do=v_after,cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,v_member,case when p_da_xong then 'tick_muc' else 'bo_tick_muc' end,v_before,v_after); return v_after;
end; $$;

create or replace function public.gui_duyet_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_state text;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_state<>'dang_lam' or not(public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and vai_tro_trong_task='chinh' and trang_thai='dang_lam')) then raise exception 'Chỉ người chính hoặc nhóm trưởng/phó gửi duyệt được'; end if;
 if exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet' and not da_xong) then raise exception 'Cần hoàn thành mọi mục checklist trước khi gửi duyệt'; end if;
 if not exists(select 1 from public.task_checklist where task_id=p_task and trang_thai_muc='da_duyet') then raise exception 'Task cần có checklist'; end if;
 update public.tasks set trang_thai='cho_duyet',cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,v_member,'gui_duyet',public.tien_do_task(p_task),public.tien_do_task(p_task));
end; $$;
create or replace function public.duyet_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_owner uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if not public.co_the_duyet_task(p_task) then raise exception 'Bạn không được duyệt task của chính mình'; end if;
 if v_state<>'cho_duyet' then raise exception 'Task không ở trạng thái Chờ duyệt'; end if;
 if exists(select 1 from public.task_checklist c where c.task_id=p_task and c.trang_thai_muc='da_duyet' and (not c.da_xong or not exists(select 1 from public.task_links l where l.muc_id=c.id and l.trang_thai_link='hop_le'))) then raise exception 'Có mục thiếu minh chứng hợp lệ'; end if;
 update public.tasks set trang_thai='hoan_thanh',tien_do=100,cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,case when (select count(*) from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom'))=1 then 'tu_duyet' else 'duyet_task' end,100,100);
 for v_owner in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop perform public.gui_thong_bao(v_owner,'task_hoan_thanh',p_task,'Task đã được duyệt hoàn thành'); end loop;
end; $$;
create or replace function public.tra_lai_task(p_task uuid,p_ly_do text,p_bo_tick uuid[] default '{}')
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_owner uuid; v_before numeric;
begin
 select project_id into v_project from public.tasks where id=p_task and trang_thai='cho_duyet' for update;
 if not public.la_quan_ly(v_project) or not public.co_the_duyet_task(p_task) then raise exception 'Bạn không được trả lại task này'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do cần ít nhất 10 ký tự'; end if;
 v_before:=public.tien_do_task(p_task);
 update public.task_checklist set da_xong=false,nguoi_hoan_thanh=null,thoi_gian_hoan_thanh=null where task_id=p_task and id=any(p_bo_tick);
 update public.tasks set trang_thai='dang_lam',tien_do=public.tien_do_task(p_task),cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'tra_lai_task: '||left(p_ly_do,1000),v_before,public.tien_do_task(p_task));
 for v_owner in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop perform public.gui_thong_bao(v_owner,'task_tra_lai',p_task,'Task bị trả lại: '||left(p_ly_do,900)); end loop;
end; $$;

create or replace function public.huy_task(p_task uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_owner uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền hủy task'; end if;
 if v_state='da_huy' or (select trang_thai from public.projects where id=v_project)<>'dang_hoat_dong' then raise exception 'Task/công việc không còn hoạt động'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do cần ít nhất 10 ký tự'; end if;
 update public.tasks set trang_thai='da_huy',trang_thai_truoc_huy=v_state,ly_do_huy=left(p_ly_do,1000),cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'huy_task: '||left(p_ly_do,900));
 for v_owner in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop perform public.gui_thong_bao(v_owner,'task_bi_huy',p_task,'Task bị hủy: '||left(p_ly_do,900)); end loop;
end; $$;
create or replace function public.khoi_phuc_task(p_task uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_prev text; v_owner uuid;
begin
 select project_id,trang_thai_truoc_huy into v_project,v_prev from public.tasks where id=p_task and trang_thai='da_huy' for update;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền khôi phục task'; end if;
 if (select trang_thai from public.projects where id=v_project)<>'dang_hoat_dong' then raise exception 'Công việc đã lưu trữ'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 or v_prev is null then raise exception 'Cần lý do hợp lệ để khôi phục'; end if;
 update public.tasks set trang_thai=v_prev,trang_thai_truoc_huy=null,ly_do_huy=null,cap_nhat_luc=now() where id=p_task;
 perform public.ghi_log(v_project,p_task,null,'khoi_phuc_task: '||left(p_ly_do,900));
 for v_owner in select member_id from public.task_assignees where task_id=p_task and trang_thai='dang_lam' loop perform public.gui_thong_bao(v_owner,'task_khoi_phuc',p_task,'Task đã được khôi phục'); end loop;
end; $$;
create or replace function public.xoa_task_trong(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid;
begin
 select project_id into v_project from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) or exists(select 1 from public.task_assignees where task_id=p_task) or exists(select 1 from public.task_checklist where task_id=p_task and da_xong) or exists(select 1 from public.activity_log where task_id=p_task) then raise exception 'Task đã có hoạt động, hãy hủy mềm'; end if;
 delete from public.task_links where task_id=p_task; delete from public.task_checklist where task_id=p_task; delete from public.task_details where task_id=p_task; delete from public.tasks where id=p_task;
end; $$;

create or replace function public.binh_chon_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid;
begin
 select project_id into v_project from public.tasks where id=p_task and trang_thai='can_lam' for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or not exists(select 1 from public.projects where id=v_project and bat_binh_chon) then raise exception 'Bình chọn đang tắt hoặc task không sẵn sàng'; end if;
 if exists(select 1 from public.task_assignees where task_id=p_task and trang_thai='dang_lam') then raise exception 'Task đã được giao'; end if;
 insert into public.task_votes(task_id,member_id) values(p_task,v_member) on conflict do nothing;
end; $$;
create or replace function public.bo_binh_chon_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid;
begin
 select project_id into v_project from public.tasks where id=p_task;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 delete from public.task_votes where task_id=p_task and member_id=v_member and exists(select 1 from public.projects where id=v_project and bat_binh_chon) and not exists(select 1 from public.task_assignees where task_id=p_task and trang_thai='dang_lam');
end; $$;
create or replace function public.bat_binh_chon(p_project uuid,p_bat boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.la_quan_ly(p_project) or not exists(select 1 from public.projects where id=p_project and trang_thai='dang_hoat_dong') then raise exception 'Bạn không có quyền hoặc công việc đã đóng'; end if;
 update public.projects set bat_binh_chon=p_bat where id=p_project;
end; $$;
create or replace function public.dem_binh_chon(p_project uuid)
returns table(task_id uuid,so_phieu bigint)
language sql stable security definer set search_path='' as $$
 select t.id,count(v.member_id) from public.tasks t left join public.task_votes v on v.task_id=t.id
 where t.project_id=p_project and t.trang_thai='can_lam' and exists(select 1 from public.projects p where p.id=p_project and p.bat_binh_chon) and public.la_thanh_vien(p_project)
 group by t.id;
$$;
create or replace function public.ds_binh_chon(p_project uuid)
returns table(task_id uuid,member_id uuid,ho_ten text,thoi_gian timestamptz)
language sql stable security definer set search_path='' as $$
 select v.task_id,v.member_id,p.ho_ten,v.thoi_gian from public.task_votes v join public.tasks t on t.id=v.task_id join public.members m on m.id=v.member_id join public.profiles p on p.user_id=m.user_id
 where t.project_id=p_project and public.la_quan_ly(p_project);
$$;

-- RLS reads on restricted vote table go through the count/detail RPCs.
revoke all on public.task_votes from authenticated;
revoke all on function public.tao_task(uuid,text,text,date,jsonb),public.cap_nhat_task(uuid,text,text,date),public.gan_task(uuid,uuid,text),public.bat_dau_task(uuid),public.them_muc_task(uuid,text,numeric),public.cap_nhat_muc_task(uuid,text,numeric),public.xoa_muc_task(uuid),public.de_xuat_muc(uuid,text),public.xu_ly_de_xuat_muc(uuid,boolean,text),public.them_link(uuid,text,text),public.xoa_link(uuid),public.tick_muc(uuid,boolean),public.gui_duyet_task(uuid),public.duyet_task(uuid),public.tra_lai_task(uuid,text,uuid[]),public.huy_task(uuid,text),public.khoi_phuc_task(uuid,text),public.xoa_task_trong(uuid),public.binh_chon_task(uuid),public.bo_binh_chon_task(uuid),public.bat_binh_chon(uuid,boolean),public.dem_binh_chon(uuid),public.ds_binh_chon(uuid) from public,anon;
grant execute on function public.tao_task(uuid,text,text,date,jsonb),public.cap_nhat_task(uuid,text,text,date),public.gan_task(uuid,uuid,text),public.bat_dau_task(uuid),public.them_muc_task(uuid,text,numeric),public.cap_nhat_muc_task(uuid,text,numeric),public.xoa_muc_task(uuid),public.de_xuat_muc(uuid,text),public.xu_ly_de_xuat_muc(uuid,boolean,text),public.them_link(uuid,text,text),public.xoa_link(uuid),public.tick_muc(uuid,boolean),public.gui_duyet_task(uuid),public.duyet_task(uuid),public.tra_lai_task(uuid,text,uuid[]),public.huy_task(uuid,text),public.khoi_phuc_task(uuid,text),public.xoa_task_trong(uuid),public.binh_chon_task(uuid),public.bo_binh_chon_task(uuid),public.bat_binh_chon(uuid,boolean),public.dem_binh_chon(uuid),public.ds_binh_chon(uuid) to authenticated;
