-- 10_han_chot_gio.sql : hạn chót có cả GIỜ (đổi cột han_chot từ date sang timestamptz) và chấm điểm theo giờ
-- Chạy trong Supabase web: SQL Editor -> New query -> dán -> Run. Chạy sau 01..09. NÊN SAO LƯU / thử trên công việc test trước.
-- Nội dung: (1) đổi kiểu cột, hạn cũ thành 23:59:59 giờ Việt Nam của ngày đó  (2) xoá các hàm bản cũ nhận kiểu date
--           (3) tạo lại 5 hàm nhận hạn kiểu giờ  (4) sửa 2 hàm điểm/báo cáo: đúng hạn = được duyệt trước hoặc đúng giờ hạn chót,
--               quá hạn = hạn chót < giờ hiện tại.  Chạy lại lần 2 vẫn an toàn.
begin;

-- 1. Cột -----------------------------------------------------------------
do $$
begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='han_chot') = 'date' then
    alter table public.tasks
      alter column han_chot type timestamptz
      using ((han_chot + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh' - interval '1 second');
  end if;
end $$;

-- 2. Xoá bản cũ nhận date (nếu không xoá sẽ thành 2 hàm trùng tên, gọi bị nhập nhằng) ------
drop function if exists public.tao_task(uuid,text,text,date,jsonb);
drop function if exists public.cap_nhat_task(uuid,text,text,date);
drop function if exists public.cap_nhat_task(uuid,text,text,date,text,timestamptz);
drop function if exists public.tao_task_giao(uuid,text,text,date,jsonb,uuid);
drop function if exists public.chuyen_giao_task(uuid,uuid,uuid,text,text,date);
drop function if exists public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,date);

-- 3. Tạo lại (lấy nguyên từ file 08, chỉ đổi kiểu tham số date -> timestamptz) --------------
create or replace function public.tao_task(p_project uuid,p_tieu_de text,p_mo_ta text,p_han_chot timestamptz,p_checklist jsonb)
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

create or replace function public.cap_nhat_task(p_task uuid,p_tieu_de text,p_mo_ta text,p_han_chot timestamptz,p_ly_do_han text,p_cap_nhat_luc timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_old_due timestamptz; v_current timestamptz;
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

create or replace function public.chuyen_giao_task(p_task uuid,p_tu_member uuid,p_den_member uuid,p_loai text,p_ly_do text,p_han_moi timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_progress numeric; v_new uuid; v_vai text; v_old_user uuid; v_new_user uuid; v_old_due timestamptz;
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

create or replace function public.xu_ly_yeu_cau_chuyen_giao(p_yeu_cau uuid,p_quyet_dinh text,p_den_member uuid,p_loai text,p_ly_do_xu_ly text,p_han_moi timestamptz default null)
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

create or replace function public.tao_task_giao(p_project uuid,p_tieu_de text,p_mo_ta text,p_han_chot timestamptz,p_checklist jsonb,p_member uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task uuid;
begin
 if p_member is null then raise exception 'Chọn người được giao'; end if;
 v_task:=public.tao_task(p_project,p_tieu_de,p_mo_ta,p_han_chot,p_checklist);
 perform public.gan_task(v_task,p_member,'chinh');
 return v_task;
end; $$;

revoke all on function public.tao_task(uuid,text,text,timestamptz,jsonb) from public,anon;
grant execute on function public.tao_task(uuid,text,text,timestamptz,jsonb) to authenticated;
revoke all on function public.cap_nhat_task(uuid,text,text,timestamptz,text,timestamptz) from public,anon;
grant execute on function public.cap_nhat_task(uuid,text,text,timestamptz,text,timestamptz) to authenticated;
revoke all on function public.chuyen_giao_task(uuid,uuid,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.chuyen_giao_task(uuid,uuid,uuid,text,text,timestamptz) to authenticated;
revoke all on function public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.xu_ly_yeu_cau_chuyen_giao(uuid,text,uuid,text,text,timestamptz) to authenticated;
revoke all on function public.tao_task_giao(uuid,text,text,timestamptz,jsonb,uuid) from public,anon;
grant execute on function public.tao_task_giao(uuid,text,text,timestamptz,jsonb,uuid) to authenticated;

-- 4. Hàm điểm và báo cáo (cùng chữ ký, create or replace giữ nguyên quyền cũ) ----------------
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
    now()) <= han_chot)
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
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet') and t.han_chot<now()),0),
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

commit;
