-- 06_member_transfer.sql — thành viên, loại/khôi phục, xin và xử lý chuyển giao.
-- Chạy sau 05_task_workflows.sql.

create or replace function public.roi_nhom(p_project uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_leads int;
begin
 select id into v_member from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for update;
 if v_member is null then raise exception 'Bạn không còn tham gia công việc này'; end if;
 if (select vai_tro from public.members where id=v_member)='truong_nhom' then
  select count(*) into v_leads from public.members where project_id=p_project and trang_thai='dang_tham_gia' and vai_tro='truong_nhom';
  if v_leads<=1 then raise exception 'Nhóm trưởng cuối cùng không thể rời công việc'; end if;
 end if;
 update public.members set trang_thai='da_roi',ly_do_roi='tu_roi' where id=v_member;
 perform public.ghi_log(p_project,null,v_member,'roi_nhom');
 -- Theo đặc tả, yêu cầu chuyển giao đang chờ vẫn để nhóm trưởng xử lý.
 for v_member in select id from public.members where project_id=p_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_member,'thanh_vien_roi',null,'Một thành viên đã rời công việc; kiểm tra các task còn dở'); end loop;
end; $$;

create or replace function public.moi_lai(p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_role text; v_max int; v_count int;
begin
 select project_id,user_id,vai_tro into v_project,v_user,v_role from public.members where id=p_member and trang_thai='da_roi';
 if v_project is null or not public.la_quan_ly(v_project) then raise exception 'Không tìm thấy thành viên đã rời hoặc bạn không có quyền'; end if;
 select max_members into v_max from public.projects where id=v_project and trang_thai='dang_hoat_dong' for update;
 if v_max is null then raise exception 'Công việc đã lưu trữ'; end if;
 select vai_tro into v_role from public.members where id=p_member and project_id=v_project and trang_thai='da_roi' for update;
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

create or replace function public.doi_vai_tro(p_member uuid,p_vai_tro text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_old text; v_actor text; v_count int;
begin
 if p_vai_tro not in('truong_nhom','pho_nhom','thanh_vien') then raise exception 'Vai trò không hợp lệ'; end if;
 select project_id,vai_tro into v_project,v_old from public.members where id=p_member and trang_thai='dang_tham_gia' for update;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền đổi vai trò'; end if;
 select vai_tro into v_actor from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_old='truong_nhom' and v_actor<>'truong_nhom' then raise exception 'Phó nhóm không được đổi vai trò nhóm trưởng'; end if;
 if v_old='pho_nhom' and v_actor<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được đổi vai trò phó nhóm'; end if;
 if p_vai_tro='truong_nhom' and v_actor<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được chuyển quyền'; end if;
 if v_old='truong_nhom' and p_vai_tro<>'truong_nhom' then
  select count(*) into v_count from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro='truong_nhom';
  if v_count<=1 then raise exception 'Công việc phải luôn có nhóm trưởng'; end if;
 end if;
 update public.members set vai_tro=p_vai_tro where id=p_member;
 perform public.ghi_log(v_project,null,p_member,'doi_vai_tro:'||v_old||'->'||p_vai_tro);
end; $$;

create or replace function public.loai_thanh_vien(p_member uuid,p_ly_do text,p_xu_ly_tien_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_user uuid; v_role text; v_actor_role text; v_task record; v_count int; v_progress numeric;
begin
 if p_xu_ly_tien_do not in('giu','xoa','khong_co') then raise exception 'Cách xử lý tiến độ không hợp lệ'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do cần ít nhất 10 ký tự'; end if;
 select project_id,user_id,vai_tro into v_project,v_user,v_role from public.members where id=p_member and trang_thai='dang_tham_gia' for update;
 if v_project is null or v_user=auth.uid() then raise exception 'Không thể loại chính mình hoặc thành viên không còn hoạt động'; end if;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền loại thành viên'; end if;
 select vai_tro into v_actor_role from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_role='truong_nhom' then raise exception 'Không thể loại nhóm trưởng'; end if;
 if v_role='pho_nhom' and v_actor_role<>'truong_nhom' then raise exception 'Chỉ nhóm trưởng được loại phó nhóm'; end if;
 if exists(select 1 from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai='cho_duyet') then raise exception 'Trả lại task Chờ duyệt trước khi loại thành viên'; end if;
 select count(*) into v_count from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam');
 if v_count>0 and p_xu_ly_tien_do='khong_co' then raise exception 'Chọn cách xử lý tiến độ cho các task đang làm'; end if;
 -- Bỏ tick có chọn lọc nhưng giữ nguyên log/link; task chính trở lại Cần làm khi được yêu cầu xóa tiến độ.
 for v_task in select t.id,t.project_id,t.trang_thai,a.vai_tro_trong_task from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=p_member and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam') loop
  if p_xu_ly_tien_do='xoa' then
   v_progress:=public.tien_do_task(v_task.id);
   update public.task_checklist set da_xong=false,nguoi_hoan_thanh=null,thoi_gian_hoan_thanh=null where task_id=v_task.id and nguoi_hoan_thanh=p_member;
   update public.task_assignees set trang_thai='da_go' where task_id=v_task.id and member_id=p_member;
   update public.tasks set tien_do=public.tien_do_task(v_task.id),trang_thai=case when v_task.vai_tro_trong_task='chinh' then 'can_lam' else trang_thai end,cap_nhat_luc=now() where id=v_task.id;
   perform public.ghi_log(v_task.project_id,v_task.id,p_member,'loai_xoa_tien_do',v_progress,public.tien_do_task(v_task.id));
 elsif p_xu_ly_tien_do='giu' then
   if v_task.vai_tro_trong_task='ho_tro' then
    update public.task_assignees set trang_thai='da_go' where task_id=v_task.id and member_id=p_member;
   end if;
   perform public.ghi_log(v_task.project_id,v_task.id,p_member,'loai_giu_tien_do',public.tien_do_task(v_task.id),public.tien_do_task(v_task.id));
  end if;
 end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now() where member_id=p_member and trang_thai='dang_cho';
 update public.members set trang_thai='da_roi',ly_do_roi='bi_loai' where id=p_member;
 insert into public.loai_nguoi(project_id,member_id,user_id,xu_ly_tien_do,ly_do,nguoi_loai) values(v_project,p_member,v_user,p_xu_ly_tien_do,btrim(p_ly_do),auth.uid());
 perform public.ghi_log(v_project,null,p_member,'loai_thanh_vien');
 for v_task in select id from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_task.id,'thanh_vien_bi_loai',null,'Một thành viên đã bị loại khỏi công việc'); end loop;
end; $$;

-- Xóa một nhánh thừa vô tình không cần biến trung gian: function trên chỉ chạy vòng xử lý chính.

create or replace function public.chuyen_giao_task(p_task uuid,p_tu_member uuid,p_den_member uuid,p_loai text,p_ly_do text,p_han_moi date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_progress numeric; v_new uuid; v_vai text; v_old_user uuid; v_new_user uuid;
begin
 select project_id,trang_thai,tien_do into v_project,v_state,v_progress from public.tasks where id=p_task for update;
 if not public.la_quan_ly(v_project) or v_state not in('can_lam','dang_lam') then raise exception 'Chỉ quản lý được chuyển task Cần làm/Đang làm'; end if;
 if p_loai not in('khach_quan','chua_kip') or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Chọn loại chuyển và nhập lý do từ 10 ký tự'; end if;
 select vai_tro_trong_task,m.user_id into v_vai,v_old_user from public.task_assignees a join public.members m on m.id=a.member_id where a.task_id=p_task and a.member_id=p_tu_member and (a.trang_thai='dang_lam' or (a.trang_thai='da_go' and m.trang_thai='da_roi' and a.vai_tro_trong_task='chinh' and exists(select 1 from public.loai_nguoi l where l.member_id=m.id and l.project_id=v_project and l.xu_ly_tien_do='giu'))) for update of a;
 if v_vai is null then raise exception 'Người chuyển không còn được giao task'; end if;
 if v_vai<>'chinh' then raise exception 'Người hỗ trợ được gỡ khỏi task, không chuyển giao vai trò chính'; end if;
 select user_id into v_new_user from public.members where id=p_den_member and project_id=v_project and trang_thai='dang_tham_gia';
 if v_new_user is null or v_new_user=v_old_user then raise exception 'Người nhận phải là thành viên đang tham gia khác'; end if;
 update public.task_assignees set trang_thai='da_chuyen' where task_id=p_task and member_id=p_tu_member;
 insert into public.task_assignees(task_id,member_id,vai_tro_trong_task,trang_thai,giao_boi) values(p_task,p_den_member,'chinh','dang_lam',auth.uid())
 on conflict(task_id,member_id) do update set vai_tro_trong_task='chinh',trang_thai='dang_lam',giao_boi=auth.uid();
 insert into public.task_chuyen_giao(task_id,tu_member,den_member,nguoi_chuyen,tien_do_luc_chuyen,loai_chuyen,ly_do) values(p_task,p_tu_member,p_den_member,auth.uid(),v_progress,p_loai,btrim(p_ly_do)) returning id into v_new;
 update public.tasks set han_chot=coalesce(p_han_moi,han_chot),cap_nhat_luc=now() where id=p_task;
 for v_new_user in select member_id from public.task_yeu_cau where task_id=p_task and trang_thai='dang_cho' loop
  perform public.gui_thong_bao(v_new_user,'yeu_cau_chuyen_giao_da_xu_ly',p_task,'Yêu cầu chuyển giao đã được xử lý do task chuyển người chính');
 end loop;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now() where task_id=p_task and trang_thai='dang_cho';
 perform public.ghi_log(v_project,p_task,p_tu_member,'chuyen_giao:'||p_loai,v_progress,v_progress);
 perform public.gui_thong_bao(p_tu_member,'task_chuyen_di',p_task,'Task đã chuyển cho thành viên khác: '||left(p_ly_do,900));
 perform public.gui_thong_bao(p_den_member,'task_nhan_chuyen_giao',p_task,'Bạn nhận task đã làm được '||v_progress||'%');
 return v_new;
end; $$;

create or replace function public.xin_chuyen_giao(p_task uuid,p_ly_do text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_id uuid; v_manager uuid;
begin
 select project_id into v_project from public.tasks where id=p_task and trang_thai='dang_lam';
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_member is null or not exists(select 1 from public.task_assignees where task_id=p_task and member_id=v_member and trang_thai='dang_lam') then raise exception 'Bạn không được giao task Đang làm này'; end if;
 if char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Lý do cần ít nhất 10 ký tự'; end if;
 insert into public.task_yeu_cau(task_id,member_id,ly_do) values(p_task,v_member,btrim(p_ly_do)) returning id into v_id;
 perform public.ghi_log(v_project,p_task,v_member,'xin_chuyen_giao');
 for v_manager in select id from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_manager,'yeu_cau_chuyen_giao',p_task,'Có yêu cầu chuyển giao task'); end loop;
 return v_id;
end; $$;
create or replace function public.rut_yeu_cau_chuyen_giao(p_yeu_cau uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_member uuid;
begin
 select r.task_id,t.project_id,r.member_id into v_task,v_project,v_member from public.task_yeu_cau r join public.tasks t on t.id=r.task_id where r.id=p_yeu_cau and r.trang_thai='dang_cho' for update of r;
 if not exists(select 1 from public.members where id=v_member and user_id=auth.uid()) then raise exception 'Chỉ người gửi được rút yêu cầu'; end if;
 update public.task_yeu_cau set trang_thai='da_rut',thoi_gian_xu_ly=now() where id=p_yeu_cau;
 perform public.ghi_log(v_project,v_task,v_member,'rut_yeu_cau_chuyen_giao');
end; $$;
create or replace function public.tu_choi_yeu_cau_chuyen_giao(p_yeu_cau uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_member uuid;
begin
 select r.task_id,t.project_id,r.member_id into v_task,v_project,v_member from public.task_yeu_cau r join public.tasks t on t.id=r.task_id where r.id=p_yeu_cau and r.trang_thai='dang_cho' for update of r;
 if not public.la_quan_ly(v_project) or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Không có quyền hoặc lý do cần ít nhất 10 ký tự'; end if;
 update public.task_yeu_cau set trang_thai='bi_tu_choi',xu_ly_boi=auth.uid(),ly_do_xu_ly=btrim(p_ly_do),thoi_gian_xu_ly=now() where id=p_yeu_cau;
 perform public.ghi_log(v_project,v_task,null,'tu_choi_yeu_cau_chuyen_giao');
 perform public.gui_thong_bao(v_member,'yeu_cau_chuyen_giao_tu_choi',v_task,'Yêu cầu chuyển giao bị từ chối: '||left(p_ly_do,900));
end; $$;
create or replace function public.xu_ly_yeu_cau_chuyen_giao(p_yeu_cau uuid,p_quyet_dinh text,p_den_member uuid,p_loai text,p_ly_do_xu_ly text,p_han_moi date default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_from uuid; v_role text; v_reason text;
begin
 select r.task_id,t.project_id,r.member_id,a.vai_tro_trong_task,r.ly_do into v_task,v_project,v_from,v_role,v_reason from public.task_yeu_cau r join public.tasks t on t.id=r.task_id join public.task_assignees a on a.task_id=t.id and a.member_id=r.member_id and a.trang_thai='dang_lam' where r.id=p_yeu_cau and r.trang_thai='dang_cho' for update of r,t;
 if not public.la_quan_ly(v_project) then raise exception 'Bạn không có quyền xử lý yêu cầu'; end if;
 if p_quyet_dinh='tu_choi' then
  perform public.tu_choi_yeu_cau_chuyen_giao(p_yeu_cau,p_ly_do_xu_ly); return;
 elsif p_quyet_dinh='chuyen' and v_role='chinh' then
  perform public.chuyen_giao_task(v_task,v_from,p_den_member,p_loai,v_reason,p_han_moi);
 elsif p_quyet_dinh='go' and v_role='ho_tro' then
  if not exists(select 1 from public.members where id=p_den_member and project_id=v_project and trang_thai='dang_tham_gia') then raise exception 'Chọn thành viên đang tham gia để tiếp nhận'; end if;
  update public.task_assignees set trang_thai='da_go' where task_id=v_task and member_id=v_from;
  insert into public.task_assignees(task_id,member_id,vai_tro_trong_task,giao_boi) values(v_task,p_den_member,'ho_tro',auth.uid()) on conflict(task_id,member_id) do update set trang_thai='dang_lam',vai_tro_trong_task='ho_tro';
  perform public.gui_thong_bao(p_den_member,'task_nhan_ho_tro',v_task,'Bạn được thêm vào task để tiếp tục hỗ trợ');
 else raise exception 'Lựa chọn không hợp lệ cho vai trò người xin'; end if;
 update public.task_yeu_cau set trang_thai='da_chuyen',xu_ly_boi=auth.uid(),thoi_gian_xu_ly=now() where id=p_yeu_cau and trang_thai='dang_cho';
end; $$;

create or replace function public.ds_yeu_cau_chuyen_giao(p_project uuid)
returns table(id uuid,task_id uuid,member_id uuid,ho_ten text,ly_do text,trang_thai text,thoi_gian timestamptz,tien_do numeric,vai_tro_trong_task text)
language sql stable security definer set search_path='' as $$
 select r.id,r.task_id,r.member_id,p.ho_ten,r.ly_do,r.trang_thai,r.thoi_gian,t.tien_do,a.vai_tro_trong_task
 from public.task_yeu_cau r join public.tasks t on t.id=r.task_id join public.task_assignees a on a.task_id=r.task_id and a.member_id=r.member_id join public.members m on m.id=r.member_id join public.profiles p on p.user_id=m.user_id
 where t.project_id=p_project and r.trang_thai='dang_cho' and public.la_quan_ly(p_project);
$$;
create or replace function public.lich_su_nguoi_chinh(p_task uuid)
returns table(id uuid,tu_member uuid,tu_ten text,den_member uuid,den_ten text,nguoi_chuyen uuid,tien_do_luc_chuyen numeric,loai_chuyen text,ly_do text,thoi_gian timestamptz,da_sua_loai boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_project uuid; v_mgr boolean;
begin
 select project_id into v_project from public.tasks where id=p_task;
 if not public.co_quyen_task(p_task) then raise exception 'Bạn không được xem lịch sử task này'; end if;
 v_mgr:=public.la_quan_ly(v_project);
 return query select x.id,x.tu_member,p1.ho_ten,x.den_member,p2.ho_ten,x.nguoi_chuyen,x.tien_do_luc_chuyen,x.loai_chuyen,case when v_mgr then x.ly_do else null end,x.thoi_gian,x.da_sua_loai
 from public.task_chuyen_giao x join public.members m1 on m1.id=x.tu_member join public.profiles p1 on p1.user_id=m1.user_id join public.members m2 on m2.id=x.den_member join public.profiles p2 on p2.user_id=m2.user_id where x.task_id=p_task order by x.thoi_gian;
end; $$;
create or replace function public.sua_loai_chuyen(p_id uuid,p_loai text,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_old text;
begin
 select x.task_id,t.project_id,x.loai_chuyen into v_task,v_project,v_old from public.task_chuyen_giao x join public.tasks t on t.id=x.task_id where x.id=p_id for update of x;
 if not public.la_quan_ly(v_project) or p_loai not in('khach_quan','chua_kip') or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Không có quyền hoặc dữ liệu sửa không hợp lệ'; end if;
 if exists(select 1 from public.projects where id=v_project and trang_thai='luu_tru') then raise exception 'Không sửa được sau khi chốt sổ'; end if;
 update public.task_chuyen_giao set loai_chuyen=p_loai,da_sua_loai=true where id=p_id;
 perform public.ghi_log(v_project,v_task,null,'sua_loai_chuyen:'||v_old||'->'||p_loai||':'||left(p_ly_do,500));
end; $$;

-- Ghi dấu và thông báo cho các RPC ở file 03 mà không sửa file đó.
create or replace function public.log_join_request_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_manager uuid; v_project uuid;
begin
 v_project:=coalesce(new.project_id,old.project_id);
 if tg_op='INSERT' then
  for v_manager in select id from public.members where project_id=v_project and trang_thai='dang_tham_gia' and vai_tro in('truong_nhom','pho_nhom') loop perform public.gui_thong_bao(v_manager,'yeu_cau_tham_gia',null,'Có yêu cầu tham gia mới'); end loop;
 elsif new.trang_thai is distinct from old.trang_thai then
  select id into v_member from public.members where project_id=v_project and user_id=new.user_id;
  if v_member is not null then perform public.ghi_log(v_project,null,v_member,'join_request:'||new.trang_thai); end if;
  if new.trang_thai in('da_duyet','da_thay_the') and v_member is not null then perform public.gui_thong_bao(v_member,'join_approved',null,'Yêu cầu tham gia đã được xử lý'); end if;
 end if;
 return new;
end; $$;
drop trigger if exists join_request_activity_notify on public.join_requests;
create trigger join_request_activity_notify after insert or update of trang_thai on public.join_requests for each row execute function public.log_join_request_event();

-- Tính số lần từ chối + bị loại ngay khi nhập mã (thay thế phần đếm ở file 03).
create or replace function public.nhap_ma(p_ma text)
returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ma text:=upper(btrim(coalesce(p_ma,''))); v_pj record; v_dem int;
begin
 if v_uid is null then raise exception 'Bạn chưa đăng nhập'; end if;
 perform 1 from public.profiles where user_id=v_uid for update;
 if not found or not exists(select 1 from public.profile_rieng where user_id=v_uid) then raise exception 'Bạn cần điền hồ sơ trước'; end if;
 delete from public.join_ma_sai where thoi_gian<now()-interval '1 day';
 select count(*) into v_dem from public.join_ma_sai where user_id=v_uid and thoi_gian>now()-interval '10 minutes';
 if v_dem>=5 then return 'tam_khoa'; end if;
 select id,max_members into v_pj from public.projects where join_code=v_ma and trang_thai='dang_hoat_dong' for update;
 if not found then insert into public.join_ma_sai(user_id) values(v_uid); return 'ma_sai'; end if;
 if exists(select 1 from public.members where project_id=v_pj.id and user_id=v_uid and trang_thai='dang_tham_gia') then return 'da_o_trong_nhom'; end if;
 select (select count(*) from public.join_requests where project_id=v_pj.id and user_id=v_uid and trang_thai='tu_choi')+(select count(*) from public.loai_nguoi where project_id=v_pj.id and user_id=v_uid) into v_dem;
 if v_dem>=3 then return 'bi_chan'; end if;
 if exists(select 1 from public.join_requests where project_id=v_pj.id and user_id=v_uid and trang_thai='cho_duyet') then return 'dang_cho'; end if;
 select (select count(*) from public.members where project_id=v_pj.id and trang_thai='dang_tham_gia')+
        (select count(*) from public.join_requests where project_id=v_pj.id and trang_thai='cho_duyet') into v_dem;
 if v_dem>=v_pj.max_members then return 'nhom_day'; end if;
 insert into public.join_requests(project_id,user_id) values(v_pj.id,v_uid);
 return 'da_gui';
end; $$;

revoke all on function public.roi_nhom(uuid),public.moi_lai(uuid),public.doi_vai_tro(uuid,text),public.loai_thanh_vien(uuid,text,text),public.chuyen_giao_task(uuid,uuid,uuid,text,text,date),public.xin_chuyen_giao(uuid,text),public.rut_yeu_cau_chuyen_giao(uuid),public.tu_choi_yeu_cau_chuyen_giao(uuid,text),public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,date),public.ds_yeu_cau_chuyen_giao(uuid),public.lich_su_nguoi_chinh(uuid),public.sua_loai_chuyen(uuid,text,text),public.nhap_ma(text) from public,anon;
grant execute on function public.roi_nhom(uuid),public.moi_lai(uuid),public.doi_vai_tro(uuid,text),public.loai_thanh_vien(uuid,text,text),public.chuyen_giao_task(uuid,uuid,uuid,text,text,date),public.xin_chuyen_giao(uuid,text),public.rut_yeu_cau_chuyen_giao(uuid),public.tu_choi_yeu_cau_chuyen_giao(uuid,text),public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,date),public.ds_yeu_cau_chuyen_giao(uuid),public.lich_su_nguoi_chinh(uuid),public.sua_loai_chuyen(uuid,text,text),public.nhap_ma(text) to authenticated;

create or replace function public.ds_thanh_vien_quan_ly(p_project uuid)
returns table(member_id uuid,user_id uuid,ho_ten text,don_vi text,ma_dinh_danh text,vai_tro text,trang_thai text,ly_do_roi text,task_dang_lam bigint,chua_nhan_viec boolean,so_lan_bi_loai bigint,task_do bigint)
language sql stable security definer set search_path='' as $$
 select m.id,m.user_id,p.ho_ten,pr.ma_dinh_danh,p.don_vi,m.vai_tro,m.trang_thai,m.ly_do_roi,
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet')),
 not exists(select 1 from public.task_assignees a where a.member_id=m.id and a.trang_thai='dang_lam'),
 (select count(*) from public.loai_nguoi x where x.project_id=p_project and x.user_id=m.user_id),
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam'))
 from public.members m join public.profiles p on p.user_id=m.user_id join public.profile_rieng pr on pr.user_id=m.user_id
 where m.project_id=p_project and public.la_quan_ly(p_project) order by (m.trang_thai='dang_tham_gia') desc,p.ho_ten;
$$;
create or replace function public.phong_cho_full(p_project uuid)
returns table(request_id uuid,user_id uuid,ho_ten text,email text,ma_dinh_danh text,don_vi text,cho_tu timestamptz,trung_ma_voi text,so_lan_bi_tu_choi bigint,so_lan_bi_loai bigint,tung_o_nhom boolean,task_do bigint)
language sql stable security definer set search_path='' as $$
 select r.id,r.user_id,p.ho_ten,u.email::text,pr.ma_dinh_danh,p.don_vi,r.tao_luc,
 (select p2.ho_ten from public.profile_rieng pr2 join public.members m2 on m2.project_id=p_project and m2.user_id=pr2.user_id join public.profiles p2 on p2.user_id=m2.user_id where pr2.ma_dinh_danh=pr.ma_dinh_danh and m2.user_id<>r.user_id limit 1),
 (select count(*) from public.join_requests j where j.project_id=p_project and j.user_id=r.user_id and j.trang_thai='tu_choi'),
 (select count(*) from public.loai_nguoi l where l.project_id=p_project and l.user_id=r.user_id),
 exists(select 1 from public.members m where m.project_id=p_project and m.user_id=r.user_id),
 (select count(distinct t.id) from public.members old join public.task_assignees a on a.member_id=old.id join public.tasks t on t.id=a.task_id where old.project_id=p_project and old.user_id=r.user_id and t.trang_thai in('can_lam','dang_lam','cho_duyet'))
 from public.join_requests r join public.profiles p on p.user_id=r.user_id join public.profile_rieng pr on pr.user_id=r.user_id join auth.users u on u.id=r.user_id
 where r.project_id=p_project and r.trang_thai='cho_duyet' and public.la_quan_ly(p_project) order by r.tao_luc;
$$;

create or replace function public.them_binh_luan(p_task uuid,p_binh_luan text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_state text;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if not public.co_quyen_task(p_task) or char_length(btrim(coalesce(p_binh_luan,''))) not between 1 and 2000 or v_state='da_huy' then raise exception 'Không có quyền hoặc bình luận không hợp lệ'; end if;
 update public.task_details set binh_luan=case when binh_luan='' then btrim(p_binh_luan) else binh_luan||E'\n'||btrim(p_binh_luan) end where task_id=p_task and char_length(binh_luan)+char_length(p_binh_luan)+1<=2000;
 if not found then raise exception 'Tổng bình luận tối đa 2000 ký tự'; end if;
 perform public.ghi_log(v_project,p_task,v_member,'them_binh_luan');
end; $$;
create or replace function public.tu_choi_link(p_link uuid,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_item uuid; v_before numeric; v_member uuid;
begin
 select l.task_id,t.project_id,l.muc_id into v_task,v_project,v_item from public.task_links l join public.tasks t on t.id=l.task_id where l.id=p_link for update of l,t;
 if not public.la_quan_ly(v_project) or (select trang_thai from public.tasks where id=v_task)<>'cho_duyet' or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Chỉ quản lý được từ chối link khi duyệt; cần ghi lý do'; end if;
 v_before:=public.tien_do_task(v_task);
 update public.task_links set trang_thai_link='bi_tu_choi',ly_do_tu_choi=btrim(p_ly_do) where id=p_link;
 update public.task_checklist set da_xong=false,nguoi_hoan_thanh=null,thoi_gian_hoan_thanh=null where id=v_item;
 update public.tasks set trang_thai='dang_lam',tien_do=public.tien_do_task(v_task),cap_nhat_luc=now() where id=v_task;
 perform public.ghi_log(v_project,v_task,null,'tu_choi_link',v_before,public.tien_do_task(v_task));
 for v_member in select member_id from public.task_assignees where task_id=v_task and trang_thai='dang_lam' loop perform public.gui_thong_bao(v_member,'link_bi_tu_choi',v_task,'Minh chứng bị từ chối: '||left(p_ly_do,800)); end loop;
end; $$;
create or replace function public.doc_thong_bao(p_thong_bao uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.thong_bao b set da_doc=true where b.id=p_thong_bao and exists(select 1 from public.members m where m.id=b.member_id and m.user_id=auth.uid());
 if not found then raise exception 'Không tìm thấy thông báo của bạn'; end if;
end; $$;

create or replace function public.xin_muc_dong_gop(p_task uuid,p_phan_bo jsonb,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_total numeric; v_row jsonb; v_member uuid; v_pct numeric; v_count int; v_unique int;
begin
 select project_id into v_project from public.tasks where id=p_task and tien_do>0 and trang_thai not in('da_huy','cho_duyet','hoan_thanh') for update;
 if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó được điều chỉnh đóng góp task đang mở'; end if;
 if char_length(btrim(coalesce(p_ly_do,''))) not between 10 and 1000 then raise exception 'Lý do cần từ 10 đến 1000 ký tự'; end if;
 if coalesce(jsonb_typeof(p_phan_bo),'')<>'array' then raise exception 'Danh sách tỷ lệ phải là một mảng'; end if;
 if jsonb_array_length(p_phan_bo) not between 1 and 100 then raise exception 'Cần phân bổ cho từ 1 đến 100 người'; end if;
 begin
  select sum((x->>'phan_tram')::numeric),count(*),count(distinct (x->>'member_id')::uuid) into v_total,v_count,v_unique from jsonb_array_elements(p_phan_bo) x;
 exception when others then raise exception 'Danh sách thành viên hoặc tỷ lệ không hợp lệ'; end;
 if v_count<>v_unique then raise exception 'Mỗi thành viên chỉ xuất hiện một lần'; end if;
 if v_total<>100 or exists(select 1 from jsonb_array_elements(p_phan_bo) x where (x->>'phan_tram')::numeric<>round((x->>'phan_tram')::numeric,2)) then raise exception 'Tổng tỷ lệ phải bằng 100.00 và mỗi tỷ lệ tối đa 2 số lẻ'; end if;
 if exists(select 1 from jsonb_array_elements(p_phan_bo) x where not exists(select 1 from public.task_checklist c where c.task_id=p_task and c.da_xong and c.trang_thai_muc='da_duyet' and c.nguoi_hoan_thanh=(x->>'member_id')::uuid))
    or exists(select distinct c.nguoi_hoan_thanh from public.task_checklist c where c.task_id=p_task and c.da_xong and c.trang_thai_muc='da_duyet' and not exists(select 1 from jsonb_array_elements(p_phan_bo) x where (x->>'member_id')::uuid=c.nguoi_hoan_thanh)) then raise exception 'Phải phân bổ đúng cho toàn bộ người có mục đã hoàn thành'; end if;
 for v_row in select value from jsonb_array_elements(p_phan_bo) loop
  v_member:=(v_row->>'member_id')::uuid; v_pct:=(v_row->>'phan_tram')::numeric;
  if v_pct<0 or v_pct>100 then raise exception 'Tỷ lệ phải từ 0 đến 100'; end if;
 end loop;
 delete from public.task_dong_gop_dieu_chinh where task_id=p_task;
 for v_row in select value from jsonb_array_elements(p_phan_bo) loop
  v_member:=(v_row->>'member_id')::uuid; v_pct:=(v_row->>'phan_tram')::numeric;
  insert into public.task_dong_gop_dieu_chinh(task_id,member_id,phan_tram,ly_do,nguoi_dieu_chinh) values(p_task,v_member,v_pct,btrim(p_ly_do),auth.uid());
 end loop;
 perform public.ghi_log(v_project,p_task,null,'dieu_chinh_dong_gop:'||left(p_ly_do,500));
end; $$;

create or replace function public.log_member_account_replacement()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_project uuid;
begin
 if tg_op='INSERT' then
  v_project:=new.project_id;
  perform public.ghi_log(v_project,null,new.id,'thanh_vien_duoc_duyet');
  perform public.gui_thong_bao(new.id,'join_approved',null,'Bạn đã được duyệt vào công việc');
 elsif old.user_id is distinct from new.user_id then
  v_project:=new.project_id;
  perform public.ghi_log(v_project,null,new.id,'thay_the_tai_khoan');
  perform public.gui_thong_bao(new.id,'join_approved',null,'Tài khoản của bạn đã được thay thế vào thành viên cũ');
 end if;
 return new;
end; $$;
drop trigger if exists member_join_activity_notify on public.members;
create trigger member_join_activity_notify after insert or update of user_id on public.members for each row execute function public.log_member_account_replacement();

revoke all on function public.ds_thanh_vien_quan_ly(uuid),public.phong_cho_full(uuid),public.them_binh_luan(uuid,text),public.tu_choi_link(uuid,text),public.doc_thong_bao(uuid),public.xin_muc_dong_gop(uuid,jsonb,text) from public,anon;
grant execute on function public.ds_thanh_vien_quan_ly(uuid),public.phong_cho_full(uuid),public.them_binh_luan(uuid,text),public.tu_choi_link(uuid,text),public.doc_thong_bao(uuid),public.xin_muc_dong_gop(uuid,jsonb,text) to authenticated;
