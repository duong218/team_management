-- 11_han_chot_theo_gio_gui_duyet.sql : chấm "đúng hạn" theo GIỜ THÀNH VIÊN GỬI DUYỆT (lần gửi cuối), không theo giờ nhóm trưởng bấm duyệt.
-- Chạy trong Supabase SQL Editor sau 01..10. Chạy lại nhiều lần vẫn an toàn.
-- Quy tắc:
--  * Gửi duyệt trước/đúng hạn chót => đúng hạn, dù nhóm trưởng duyệt muộn.
--  * Điểm chỉ tính khi task đang ở trạng thái Hoàn thành (nhóm trưởng đã duyệt). Chờ duyệt thì chưa cộng điểm.
--  * Trả lại / mở lại task => về Đang làm => chưa tính; khi hoàn thành lại thì lấy lần gửi duyệt CUỐI CÙNG để so với hạn.
--  * Task đang Chờ duyệt không bị báo quá hạn nếu đã gửi kịp hạn.
begin;

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
   coalesce((select max(l.thoi_gian) from public.activity_log l where l.task_id=by_task.id and l.hanh_dong='gui_duyet'),
    (select max(l.thoi_gian) from public.activity_log l where l.task_id=by_task.id and l.hanh_dong in('duyet_task','tu_duyet')),
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
    where t.project_id=p_project and a.member_id=any(g.member_ids) and a.vai_tro_trong_task='chinh' and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet') and t.han_chot<case when t.trang_thai='cho_duyet' then coalesce((select max(l.thoi_gian) from public.activity_log l where l.task_id=t.id and l.hanh_dong='gui_duyet'),now()) else now() end),0),
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
