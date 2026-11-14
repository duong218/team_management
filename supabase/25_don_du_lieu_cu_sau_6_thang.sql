-- Don du lieu lich su da het han sau 6 thang.
-- Chay sau file 24. Khong xoa du lieu cua cong viec dang hoat dong.
begin;

alter table public.projects add column if not exists luu_tru_luc timestamptz;

-- Backfill cong viec da luu tru truoc khi co cot thoi gian luu tru.
update public.projects p
set luu_tru_luc = coalesce(
  (select max(a.thoi_gian) from public.activity_log a
   where a.project_id = p.id and a.hanh_dong = 'ket_thuc_cong_viec'),
  (select max(c.thoi_gian) from public.chot_so c where c.project_id = p.id),
  p.tao_luc
)
where p.trang_thai = 'luu_tru' and p.luu_tru_luc is null;

create index if not exists projects_luu_tru_luc_idx
  on public.projects (luu_tru_luc) where trang_thai = 'luu_tru';

create or replace function public.cap_nhat_thoi_gian_luu_tru()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.trang_thai = 'luu_tru' and old.trang_thai <> 'luu_tru' then
    new.luu_tru_luc := pg_catalog.now();
  elsif new.trang_thai = 'dang_hoat_dong' and old.trang_thai = 'luu_tru' then
    new.luu_tru_luc := null;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_cap_nhat_thoi_gian_luu_tru on public.projects;
create trigger projects_cap_nhat_thoi_gian_luu_tru
before update of trang_thai on public.projects
for each row execute function public.cap_nhat_thoi_gian_luu_tru();

revoke all on function public.cap_nhat_thoi_gian_luu_tru() from public, anon, authenticated;

create or replace function public.don_du_lieu_cu()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_project uuid;
  v_job_id bigint;
begin
  -- Xoa tron goi cac cong viec da luu tru hon 6 thang, theo dung thu tu khoa ngoai.
  for v_project in
    select p.id from public.projects p
    where p.trang_thai = 'luu_tru'
      and p.luu_tru_luc < pg_catalog.now() - interval '6 months'
    order by p.luu_tru_luc
    for update skip locked
  loop
    -- Mo khoa tam trigger cong viec luu tru; thay doi nay khong commit rieng.
    update public.projects set trang_thai = 'dang_hoat_dong' where id = v_project;

    delete from public.thong_bao b using public.members m
      where b.member_id = m.id and m.project_id = v_project;
    delete from public.activity_log where project_id = v_project;
    delete from public.loai_nguoi where project_id = v_project;
    delete from public.chot_so_chi_tiet d using public.chot_so c
      where d.chot_so_id = c.id and c.project_id = v_project;
    delete from public.diem_thanh_vien d using public.chot_so c
      where d.chot_so_id = c.id and c.project_id = v_project;
    delete from public.chot_so where project_id = v_project;
    delete from public.task_links l using public.tasks t
      where l.task_id = t.id and t.project_id = v_project;
    delete from public.task_assignees a using public.tasks t
      where a.task_id = t.id and t.project_id = v_project;
    delete from public.task_votes v using public.tasks t
      where v.task_id = t.id and t.project_id = v_project;
    delete from public.task_chuyen_giao x using public.tasks t
      where x.task_id = t.id and t.project_id = v_project;
    delete from public.task_yeu_cau r using public.tasks t
      where r.task_id = t.id and t.project_id = v_project;
    delete from public.task_dong_gop_dieu_chinh d using public.tasks t
      where d.task_id = t.id and t.project_id = v_project;
    delete from public.task_comments c using public.tasks t
      where c.task_id = t.id and t.project_id = v_project;
    delete from public.task_checklist c using public.tasks t
      where c.task_id = t.id and t.project_id = v_project;
    delete from public.task_details d using public.tasks t
      where d.task_id = t.id and t.project_id = v_project;
    delete from public.tasks where project_id = v_project;
    delete from public.join_requests where project_id = v_project;
    delete from public.members where project_id = v_project;
    delete from public.projects where id = v_project;
  end loop;

  -- Giu yeu cau dang cho; xoa yeu cau da xu ly cu, bao gom tu choi sau 6 thang.
  delete from public.join_requests
  where trang_thai <> 'cho_duyet'
    and coalesce(xu_ly_luc, tao_luc) < pg_catalog.now() - interval '6 months';

  -- Chi xoa yeu cau chuyen giao da dong; khong dong den yeu cau dang cho.
  delete from public.task_yeu_cau
  where trang_thai <> 'dang_cho'
    and coalesce(thoi_gian_xu_ly, thoi_gian) < pg_catalog.now() - interval '6 months';

  -- Nhat ky ma nhap sai chi can phuc vu gioi han tan suat trong 10 phut.
  delete from public.join_ma_sai
  where thoi_gian < pg_catalog.now() - interval '1 day';

  -- Chi don lich su chay cua job nay, khong xoa lich su cron khac.
  select jobid into v_job_id from cron.job
  where jobname = 'don-du-lieu-cu-sau-6-thang' limit 1;
  if v_job_id is not null then
    delete from cron.job_run_details
    where jobid = v_job_id
      and coalesce(end_time, start_time) < pg_catalog.now() - interval '6 months';
  end if;
end;
$$;

revoke all on function public.don_du_lieu_cu() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'don-du-lieu-cu-sau-6-thang';
select cron.schedule(
  'don-du-lieu-cu-sau-6-thang',
  '17 3 * * *',
  'select public.don_du_lieu_cu()'
);

commit;
