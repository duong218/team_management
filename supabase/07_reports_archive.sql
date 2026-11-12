-- 07_reports_archive.sql — báo cáo, chốt sổ và mở lại.
-- Chạy sau 06_member_transfer.sql. Snapshot dùng JSON để giữ nguyên cấu trúc báo cáo theo từng lần chốt.
alter table public.chot_so add column if not exists du_lieu jsonb not null default '{}'::jsonb;

create or replace function public.diem_hien_tai(p_project uuid,p_member uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_p numeric; v_plan numeric; v_people int; v_f numeric; v_a numeric; v_bn int; v_bd int; v_cn int; v_cd int; v_b numeric; v_c numeric; v_total numeric; v_w_a numeric; v_w_b numeric; v_w_c numeric; v_den numeric; v_done numeric; v_assigned int;
begin
 if not public.la_quan_ly(p_project) and not exists(select 1 from public.members where id=p_member and user_id=auth.uid()) then raise exception 'Bạn không được xem điểm thành viên này'; end if;
 select coalesce(sum(c.trong_so) filter(where c.da_xong and c.nguoi_hoan_thanh=p_member),0) into v_p
 from public.task_checklist c join public.tasks t on t.id=c.task_id where t.project_id=p_project;
 select coalesce(sum(c.trong_so),0) into v_plan from public.task_checklist c join public.tasks t on t.id=c.task_id where t.project_id=p_project and t.trang_thai<>'da_huy' and c.trang_thai_muc='da_duyet';
 select count(distinct pr.ma_dinh_danh) into v_people from public.members m join public.profile_rieng pr on pr.user_id=m.user_id where m.project_id=p_project and (m.trang_thai='dang_tham_gia' or exists(select 1 from public.task_assignees a where a.member_id=m.id) or exists(select 1 from public.task_checklist c where c.nguoi_hoan_thanh=m.id));
 v_f:=case when v_people>0 then v_plan/v_people else 0 end;
 v_a:=case when v_f>0 then least(1,v_p/v_f) else null end;
 select count(*) filter(where not exists(select 1 from public.task_chuyen_giao x where x.task_id=t.id and x.tu_member=p_member and x.loai_chuyen='khach_quan')),
        count(*) filter(where t.trang_thai='hoan_thanh' and a.trang_thai='dang_lam'),
        count(*) filter(where t.trang_thai='hoan_thanh' and t.han_chot is not null and a.trang_thai='dang_lam'),
        count(*) filter(where t.trang_thai='hoan_thanh' and t.han_chot is not null and a.trang_thai='dang_lam' and coalesce((select max(l.thoi_gian) from public.activity_log l where l.task_id=t.id and l.hanh_dong in('duyet_task','tu_duyet')),now()) < ((t.han_chot+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))
 into v_bd,v_bn,v_cd,v_cn
 from public.task_assignees a join public.tasks t on t.id=a.task_id where t.project_id=p_project and a.member_id=p_member and a.vai_tro_trong_task='chinh' and a.trang_thai<>'da_go' and t.trang_thai<>'da_huy';
 select count(*) into v_assigned from public.task_assignees a join public.tasks t on t.id=a.task_id where t.project_id=p_project and a.member_id=p_member and a.vai_tro_trong_task='chinh' and a.trang_thai<>'da_go' and t.trang_thai<>'da_huy';
 v_b:=case when v_bd>0 then v_bn::numeric/v_bd else null end;
 v_c:=case when v_cd>0 then v_cn::numeric/v_cd else null end;
 if v_assigned=0 then return jsonb_build_object('trang_thai_diem','chua_duoc_giao','a',v_a,'b',v_b,'c',v_c,'diem',null,'phan_da_lam',v_p,'phan_ke_hoach',v_f); end if;
 select (trong_so_diem->>'a')::numeric,(trong_so_diem->>'b')::numeric,(trong_so_diem->>'c')::numeric into v_w_a,v_w_b,v_w_c from public.projects where id=p_project;
 v_den:=case when v_a is not null then v_w_a else 0 end+case when v_b is not null then v_w_b else 0 end+case when v_c is not null then v_w_c else 0 end;
 v_done:=coalesce(v_a*v_w_a,0)+coalesce(v_b*v_w_b,0)+coalesce(v_c*v_w_c,0);
 v_total:=case when v_den>0 then round(10*v_done/v_den,2) else null end;
 return jsonb_build_object('trang_thai_diem',case when v_p=0 and v_assigned>0 then 'duoc_giao_chua_lam' else 'da_lam' end,'a',v_a,'b',v_b,'c',v_c,'diem',v_total,'phan_da_lam',v_p,'phan_ke_hoach',v_f,'so_task_duoc_giao',v_assigned);
end; $$;

create or replace function public.bao_cao_cong_viec(p_project uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_saved jsonb; v_result jsonb;
begin
 if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được xem báo cáo'; end if;
 if (select trang_thai from public.projects where id=p_project)='luu_tru' then
  select du_lieu into v_saved from public.chot_so where project_id=p_project order by lan_chot desc limit 1;
  return coalesce(v_saved,'{}'::jsonb);
 end if;
 select jsonb_build_object(
  'project',jsonb_build_object('id',p.id,'ten',p.ten,'trang_thai',p.trang_thai,'max_members',p.max_members),
  'members',coalesce((select jsonb_agg(jsonb_build_object('member_id',m.id,'user_id',m.user_id,'ho_ten',pr.ho_ten,'ma_dinh_danh',pi.ma_dinh_danh,'don_vi',pr.don_vi,'vai_tro',m.vai_tro,'trang_thai',m.trang_thai,'diem',public.diem_hien_tai(p_project,m.id))) from public.members m join public.profiles pr on pr.user_id=m.user_id join public.profile_rieng pi on pi.user_id=m.user_id where m.project_id=p_project),'[]'::jsonb),
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('task_id',t.id,'tieu_de',d.tieu_de,'mo_ta',d.mo_ta,'trang_thai',t.trang_thai,'han_chot',t.han_chot,'tien_do',t.tien_do,'ly_do_huy',t.ly_do_huy,'assignees',(select coalesce(jsonb_agg(jsonb_build_object('member_id',a.member_id,'ho_ten',p2.ho_ten,'vai_tro',a.vai_tro_trong_task,'trang_thai',a.trang_thai)),'[]'::jsonb) from public.task_assignees a join public.members m2 on m2.id=a.member_id join public.profiles p2 on p2.user_id=m2.user_id where a.task_id=t.id),'checklist',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'noi_dung',c.noi_dung,'trong_so',c.trong_so,'da_xong',c.da_xong,'nguoi_hoan_thanh',c.nguoi_hoan_thanh,'thoi_gian_hoan_thanh',c.thoi_gian_hoan_thanh)),'[]'::jsonb) from public.task_checklist c where c.task_id=t.id))) from public.tasks t join public.task_details d on d.task_id=t.id where t.project_id=p_project order by t.tao_luc),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(jsonb_build_object('thoi_gian',l.thoi_gian,'hanh_dong',l.hanh_dong,'member_id',l.member_id,'task_id',l.task_id,'tien_do_truoc',l.tien_do_truoc,'tien_do_sau',l.tien_do_sau)) from public.activity_log l where l.project_id=p_project),'[]'::jsonb),
  'caveat','Điểm chỉ phản ánh hoạt động được ghi; minh chứng là link người dùng cung cấp, hệ thống không xác thực nội dung.') into v_result from public.projects p where p.id=p_project;
 return coalesce(v_result,'{}'::jsonb);
end; $$;

create or replace function public.ket_thuc_cong_viec(p_project uuid,p_xac_nhan boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text; v_warn jsonb; v_id uuid; v_lane int; v_report jsonb; v_member record; v_score jsonb; v_contrib numeric;
begin
 select vai_tro into v_actor_role from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_actor_role not in('truong_nhom','pho_nhom') or (select trang_thai from public.projects where id=p_project for update)<>'dang_hoat_dong' then raise exception 'Không có quyền hoặc công việc đã kết thúc'; end if;
 select coalesce(jsonb_agg(item),'[]'::jsonb) into v_warn from (
  select jsonb_build_object('loai','task_chua_xong','task_id',t.id,'tieu_de',d.tieu_de,'trang_thai',t.trang_thai,'tien_do',t.tien_do) item from public.tasks t join public.task_details d on d.task_id=t.id where t.project_id=p_project and t.trang_thai not in('hoan_thanh','da_huy')
  union all
  select jsonb_build_object('loai','link_bi_tu_choi','task_id',l.task_id,'link_id',l.id,'ly_do',l.ly_do_tu_choi) from public.task_links l join public.tasks t on t.id=l.task_id where t.project_id=p_project and l.trang_thai_link='bi_tu_choi'
  union all
  select jsonb_build_object('loai','task_nguoi_roi','task_id',t.id,'member_id',m.id,'ho_ten',pr.ho_ten) from public.task_assignees a join public.tasks t on t.id=a.task_id join public.members m on m.id=a.member_id join public.profiles pr on pr.user_id=m.user_id where t.project_id=p_project and t.trang_thai in('can_lam','dang_lam','cho_duyet') and m.trang_thai='da_roi' and a.trang_thai='dang_lam'
  union all
  select jsonb_build_object('loai','yeu_cau_chuyen_giao','task_id',r.task_id,'request_id',r.id,'member_id',r.member_id) from public.task_yeu_cau r join public.tasks t on t.id=r.task_id where t.project_id=p_project and r.trang_thai='dang_cho'
 ) warnings(item);
 if jsonb_array_length(v_warn)>0 and not p_xac_nhan then return jsonb_build_object('canh_bao',v_warn,'can_xac_nhan',true); end if;
 select coalesce(max(lan_chot),0)+1 into v_lane from public.chot_so where project_id=p_project;
 insert into public.chot_so(project_id,lan_chot,nguoi_chot) values(p_project,v_lane,auth.uid()) returning id into v_id;
 v_report:=public.bao_cao_cong_viec(p_project);
 update public.chot_so set du_lieu=v_report where id=v_id;
 for v_member in select id from public.members where project_id=p_project and (trang_thai='dang_tham_gia' or exists(select 1 from public.task_assignees a where a.member_id=id) or exists(select 1 from public.task_checklist c where c.nguoi_hoan_thanh=id)) loop
  v_score:=public.diem_hien_tai(p_project,v_member.id);
  select coalesce(round(100*sum(c.trong_so) filter(where c.da_xong and c.nguoi_hoan_thanh=v_member.id)/nullif(sum(c.trong_so) filter(where c.da_xong),0),4),null) into v_contrib from public.task_checklist c join public.tasks t on t.id=c.task_id where t.project_id=p_project;
  insert into public.chot_so_chi_tiet(chot_so_id,member_id,phan_tram_dong_gop,du_lieu) values(v_id,v_member.id,v_contrib,v_score);
  insert into public.diem_thanh_vien(chot_so_id,member_id,diem_cong_thuc,diem_chot) values(v_id,v_member.id,(v_score->>'diem')::numeric,(v_score->>'diem')::numeric);
 end loop;
 update public.projects set trang_thai='luu_tru',join_code=null where id=p_project;
 update public.join_requests set trang_thai='het_han',xu_ly_boi=auth.uid(),xu_ly_luc=now() where project_id=p_project and trang_thai='cho_duyet';
 perform public.ghi_log(p_project,null,null,'ket_thuc_cong_viec');
 for v_member in select id from public.members where project_id=p_project and trang_thai='dang_tham_gia' loop perform public.gui_thong_bao(v_member.id,'cong_viec_ket_thuc',null,'Công việc đã kết thúc và được chốt sổ'); end loop;
 return jsonb_build_object('chot_so_id',v_id,'canh_bao',v_warn,'can_xac_nhan',false);
end; $$;

create or replace function public.mo_lai_cong_viec(p_project uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_num int;
begin
 if not exists(select 1 from public.members where project_id=p_project and user_id=v_uid and trang_thai='dang_tham_gia' and vai_tro='truong_nhom') then raise exception 'Chỉ nhóm trưởng được mở lại công việc'; end if;
 perform 1 from public.profiles where user_id=v_uid for update;
 select count(*) into v_num from public.projects p join public.members m on m.project_id=p.id and m.user_id=v_uid and m.vai_tro='truong_nhom' and m.trang_thai='dang_tham_gia' where p.trang_thai='dang_hoat_dong';
 if v_num>=10 then raise exception 'Bạn đã có 10 công việc hoạt động; hãy lưu trữ công việc khác'; end if;
 update public.projects set trang_thai='dang_hoat_dong' where id=p_project and trang_thai='luu_tru';
 if not found then raise exception 'Công việc chưa lưu trữ'; end if;
 perform public.ghi_log(p_project,null,null,'mo_lai_cong_viec');
end; $$;

create or replace function public.dieu_chinh_diem(p_project uuid,p_member uuid,p_diem numeric,p_ly_do text)
returns void language plpgsql security definer set search_path='' as $$
declare v_chot uuid; v_actor uuid; v_actor_role text; v_target_role text;
begin
 if not public.la_quan_ly(p_project) or p_diem not between 0 and 10 or char_length(btrim(coalesce(p_ly_do,'')))<10 then raise exception 'Không có quyền hoặc điểm/lý do không hợp lệ'; end if;
 select id,vai_tro into v_actor,v_actor_role from public.members where project_id=p_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 select vai_tro into v_target_role from public.members where id=p_member and project_id=p_project;
 if p_member=v_actor then raise exception 'Không được tự điều chỉnh điểm'; end if;
 if v_target_role='truong_nhom' and v_actor_role<>'pho_nhom' then raise exception 'Chỉ phó nhóm được điều chỉnh điểm nhóm trưởng'; end if;
 select id into v_chot from public.chot_so where project_id=p_project order by lan_chot desc limit 1;
 if v_chot is null then raise exception 'Chưa có lần chốt sổ'; end if;
 update public.diem_thanh_vien set diem_chot=p_diem,ly_do_dieu_chinh=btrim(p_ly_do),nguoi_dieu_chinh=auth.uid() where chot_so_id=v_chot and member_id=p_member;
 if not found then raise exception 'Không tìm thấy dòng điểm'; end if;
 perform public.ghi_log(p_project,null,p_member,'dieu_chinh_diem:'||p_diem||':'||left(p_ly_do,500));
end; $$;

revoke all on function public.diem_hien_tai(uuid,uuid),public.bao_cao_cong_viec(uuid),public.ket_thuc_cong_viec(uuid,boolean),public.mo_lai_cong_viec(uuid),public.dieu_chinh_diem(uuid,uuid,numeric,text) from public,anon;
grant execute on function public.diem_hien_tai(uuid,uuid),public.bao_cao_cong_viec(uuid),public.ket_thuc_cong_viec(uuid,boolean),public.mo_lai_cong_viec(uuid),public.dieu_chinh_diem(uuid,uuid,numeric,text) to authenticated;
