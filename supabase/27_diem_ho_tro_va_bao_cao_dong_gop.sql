-- Cho phép thành viên chỉ làm hỗ trợ có điểm từ checklist/đóng góp đã ghi nhận.
-- Chạy sau 26_fix_workflow_edge_cases.sql. Chạy lại an toàn.
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
 if v_b_den=0 and v_p=0 then return jsonb_build_object('trang_thai_diem','chua_duoc_giao','a',v_a,'b',v_b,'c',v_c,'diem',null,'phan_da_lam',v_p,'phan_ke_hoach',v_f); end if;
 select (trong_so_diem->>'a')::numeric,(trong_so_diem->>'b')::numeric,(trong_so_diem->>'c')::numeric into v_wa,v_wb,v_wc from public.projects where id=p_project;
 v_den:=case when v_a is not null then v_wa else 0 end+case when v_b is not null then v_wb else 0 end+case when v_c is not null then v_wc else 0 end;
 v_score:=case when v_den>0 then round(10*(coalesce(v_a*v_wa,0)+coalesce(v_b*v_wb,0)+coalesce(v_c*v_wc,0))/v_den,2) else null end;
 return jsonb_build_object('trang_thai_diem',case when v_p=0 then 'duoc_giao_chua_lam' else 'da_lam' end,
  'a',v_a,'b',v_b,'c',v_c,'diem',v_score,'phan_da_lam',v_p,'phan_ke_hoach',v_f,'so_task_duoc_giao',v_b_den);
end; $$;

revoke all on function public.diem_hien_tai(uuid,uuid) from public,anon;
grant execute on function public.diem_hien_tai(uuid,uuid) to authenticated;

commit;
