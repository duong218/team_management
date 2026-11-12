-- 04_task_schema.sql — schema còn thiếu cho task, minh chứng, chuyển giao và nhật ký.
-- Chạy sau 01_ho_so.sql, 02_cong_viec.sql, 03_tham_gia.sql.
-- Không cho client ghi trực tiếp; mọi ghi nghiệp vụ ở RPC các file tiếp theo.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  trang_thai text not null default 'can_lam' check (trang_thai in ('can_lam','dang_lam','cho_duyet','hoan_thanh','da_huy')),
  trang_thai_truoc_huy text check (trang_thai_truoc_huy in ('can_lam','dang_lam','cho_duyet','hoan_thanh')),
  tien_do numeric(5,2) not null default 0 check (tien_do between 0 and 100),
  han_chot date,
  ly_do_huy text,
  cap_nhat_luc timestamptz not null default now(),
  tao_luc timestamptz not null default now()
);
create index if not exists tasks_project_state_idx on public.tasks(project_id,trang_thai);

create table if not exists public.task_details (
  task_id uuid primary key references public.tasks(id) on delete restrict,
  tieu_de text not null check (char_length(tieu_de) between 1 and 200),
  mo_ta text not null default '', tep_dinh_kem text, binh_luan text not null default ''
);
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  vai_tro_trong_task text not null check (vai_tro_trong_task in ('chinh','ho_tro')),
  trang_thai text not null default 'dang_lam' check (trang_thai in ('dang_lam','da_go','da_chuyen')),
  giao_boi uuid references auth.users(id) on delete restrict,
  thoi_gian_giao timestamptz not null default now(),
  primary key(task_id,member_id)
);
create index if not exists task_assignees_member_idx on public.task_assignees(member_id,trang_thai);

create table if not exists public.task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  noi_dung text not null check (char_length(noi_dung) between 1 and 500),
  trong_so numeric(4,2) not null default 1 check (trong_so > 0 and trong_so <= 10),
  da_xong boolean not null default false,
  trang_thai_muc text not null default 'da_duyet' check (trang_thai_muc in ('cho_duyet','da_duyet','tu_choi')),
  de_xuat_boi uuid references public.members(id) on delete restrict,
  nguoi_hoan_thanh uuid references public.members(id) on delete restrict,
  thoi_gian_hoan_thanh timestamptz,
  tao_luc timestamptz not null default now()
);
create index if not exists task_checklist_task_idx on public.task_checklist(task_id);

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  muc_id uuid not null references public.task_checklist(id) on delete restrict,
  url text not null check (char_length(url) <= 2000),
  url_chuan_hoa text not null,
  ghi_chu text not null default '',
  nguoi_them uuid not null references public.members(id) on delete restrict,
  thoi_gian timestamptz not null default now(),
  trang_thai_link text not null default 'hop_le' check (trang_thai_link in ('hop_le','bi_tu_choi')),
  ly_do_tu_choi text,
  unique(muc_id,url_chuan_hoa)
);
create index if not exists task_links_muc_idx on public.task_links(muc_id);

create table if not exists public.task_votes (
  task_id uuid not null references public.tasks(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  thoi_gian timestamptz not null default now(),
  primary key(task_id,member_id)
);

create table if not exists public.task_chuyen_giao (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  tu_member uuid not null references public.members(id) on delete restrict,
  den_member uuid not null references public.members(id) on delete restrict,
  nguoi_chuyen uuid not null references auth.users(id) on delete restrict,
  tien_do_luc_chuyen numeric(5,2) not null check(tien_do_luc_chuyen between 0 and 100),
  loai_chuyen text not null check(loai_chuyen in ('khach_quan','chua_kip')),
  ly_do text not null check(char_length(btrim(ly_do)) >= 10),
  da_sua_loai boolean not null default false,
  thoi_gian timestamptz not null default now()
);
create index if not exists task_chuyen_giao_task_idx on public.task_chuyen_giao(task_id,thoi_gian);

create table if not exists public.task_yeu_cau (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  ly_do text not null check(char_length(btrim(ly_do)) >= 10),
  trang_thai text not null default 'dang_cho' check(trang_thai in ('dang_cho','da_chuyen','bi_tu_choi','da_rut')),
  thoi_gian timestamptz not null default now(),
  xu_ly_boi uuid references auth.users(id) on delete restrict,
  ly_do_xu_ly text,
  thoi_gian_xu_ly timestamptz
);
create unique index if not exists task_yeu_cau_mot_cho on public.task_yeu_cau(task_id,member_id) where trang_thai='dang_cho';

create table if not exists public.loai_nguoi (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  xu_ly_tien_do text not null check(xu_ly_tien_do in ('giu','xoa','khong_co')),
  ly_do text not null check(char_length(btrim(ly_do)) >= 10),
  nguoi_loai uuid not null references auth.users(id) on delete restrict,
  thoi_gian timestamptz not null default now()
);

create table if not exists public.thong_bao (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete restrict,
  loai text not null, task_id uuid references public.tasks(id) on delete restrict,
  noi_dung text not null, da_doc boolean not null default false, thoi_gian timestamptz not null default now()
);
create index if not exists thong_bao_member_time_idx on public.thong_bao(member_id,thoi_gian desc);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete restrict,
  member_id uuid references public.members(id) on delete restrict,
  hanh_dong text not null,
  tien_do_truoc numeric(5,2), tien_do_sau numeric(5,2), thoi_gian timestamptz not null default now()
);
create index if not exists activity_log_project_time_idx on public.activity_log(project_id,thoi_gian desc);
create index if not exists activity_log_task_time_idx on public.activity_log(task_id,thoi_gian desc);

create table if not exists public.chot_so (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete restrict,
  lan_chot integer not null check(lan_chot > 0), thoi_gian timestamptz not null default now(),
  nguoi_chot uuid not null references auth.users(id) on delete restrict, unique(project_id,lan_chot)
);
create table if not exists public.chot_so_chi_tiet (
  chot_so_id uuid not null references public.chot_so(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  phan_tram_dong_gop numeric(7,4), du_lieu jsonb not null default '{}'::jsonb,
  primary key(chot_so_id,member_id)
);
create table if not exists public.diem_thanh_vien (
  chot_so_id uuid not null references public.chot_so(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  diem_cong_thuc numeric(4,2), diem_chot numeric(4,2), ly_do_dieu_chinh text,
  nguoi_dieu_chinh uuid references auth.users(id) on delete restrict,
  primary key(chot_so_id,member_id), check(diem_chot is null or diem_chot between 0 and 10)
);

-- RLS mặc định từ chối. Các policy đọc dùng quyền và membership hiện tại.
create or replace function public.co_quyen_task(p_task uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tasks t where t.id=p_task and public.la_quan_ly(t.project_id))
 or exists(select 1 from public.task_assignees a join public.members m on m.id=a.member_id
   where a.task_id=p_task and m.user_id=auth.uid() and m.trang_thai='dang_tham_gia');
$$;
create or replace function public.task_chua_giao(p_task uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.task_assignees a where a.task_id=p_task);
$$;
revoke all on function public.co_quyen_task(uuid),public.task_chua_giao(uuid) from public,anon;
grant execute on function public.co_quyen_task(uuid),public.task_chua_giao(uuid) to authenticated;

alter table public.tasks enable row level security;
alter table public.task_details enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_checklist enable row level security;
alter table public.task_links enable row level security;
alter table public.task_votes enable row level security;
alter table public.task_chuyen_giao enable row level security;
alter table public.task_yeu_cau enable row level security;
alter table public.loai_nguoi enable row level security;
alter table public.thong_bao enable row level security;
alter table public.activity_log enable row level security;
alter table public.chot_so enable row level security;
alter table public.chot_so_chi_tiet enable row level security;
alter table public.diem_thanh_vien enable row level security;

create policy tasks_member_read on public.tasks for select to authenticated using(public.la_thanh_vien(project_id));
create policy task_details_private_read on public.task_details for select to authenticated using(public.co_quyen_task(task_id) or (public.task_chua_giao(task_id) and exists(select 1 from public.tasks t where t.id=task_id and public.la_thanh_vien(t.project_id))));
create policy task_assignees_read on public.task_assignees for select to authenticated using(public.co_quyen_task(task_id) or exists(select 1 from public.tasks t where t.id=task_id and public.la_thanh_vien(t.project_id)));
create policy task_checklist_read on public.task_checklist for select to authenticated using(public.co_quyen_task(task_id) or (public.task_chua_giao(task_id) and exists(select 1 from public.tasks t where t.id=task_id and public.la_thanh_vien(t.project_id))));
create policy task_links_read on public.task_links for select to authenticated using(public.co_quyen_task(task_id));
create policy task_votes_manage_read on public.task_votes for select to authenticated using(exists(select 1 from public.tasks t where t.id=task_id and public.la_quan_ly(t.project_id)));
create policy task_yeu_cau_private_read on public.task_yeu_cau for select to authenticated using(public.co_quyen_task(task_id) and (exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()) or exists(select 1 from public.tasks t where t.id=task_id and public.la_quan_ly(t.project_id))));
create policy thong_bao_member_read on public.thong_bao for select to authenticated using(exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy activity_log_read on public.activity_log for select to authenticated using(public.la_quan_ly(project_id) or (task_id is not null and public.co_quyen_task(task_id)) or (task_id is null and exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid())));
create policy chot_so_manager_read on public.chot_so for select to authenticated using(public.la_quan_ly(project_id));
create policy chot_detail_read on public.chot_so_chi_tiet for select to authenticated using(exists(select 1 from public.chot_so c where c.id=chot_so_id and public.la_quan_ly(c.project_id)) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy diem_read on public.diem_thanh_vien for select to authenticated using(exists(select 1 from public.chot_so c where c.id=chot_so_id and public.la_quan_ly(c.project_id)) or (member_id in(select id from public.members where user_id=auth.uid()) and diem_chot is not null));

revoke all on public.tasks,public.task_details,public.task_assignees,public.task_checklist,public.task_links,public.task_votes,public.task_chuyen_giao,public.task_yeu_cau,public.loai_nguoi,public.thong_bao,public.activity_log,public.chot_so,public.chot_so_chi_tiet,public.diem_thanh_vien from anon,authenticated;
grant select on public.tasks,public.task_details,public.task_assignees,public.task_checklist,public.task_links,public.activity_log,public.thong_bao,public.chot_so,public.chot_so_chi_tiet,public.diem_thanh_vien to authenticated;
grant select on public.task_yeu_cau to authenticated;
-- task_chuyen_giao, task_votes and loai_nguoi are read through filtered RPCs.
create table if not exists public.task_dong_gop_dieu_chinh (
  task_id uuid not null references public.tasks(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  phan_tram numeric(5,2) not null check(phan_tram between 0 and 100),
  ly_do text not null check(char_length(btrim(ly_do)) >= 10),
  nguoi_dieu_chinh uuid not null references auth.users(id) on delete restrict,
  thoi_gian timestamptz not null default now(),
  primary key(task_id,member_id)
);
alter table public.task_dong_gop_dieu_chinh enable row level security;
create policy task_contribution_read on public.task_dong_gop_dieu_chinh for select to authenticated using(public.co_quyen_task(task_id));
revoke all on public.task_dong_gop_dieu_chinh from anon,authenticated;
grant select on public.task_dong_gop_dieu_chinh to authenticated;
