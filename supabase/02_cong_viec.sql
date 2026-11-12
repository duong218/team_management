-- 02_cong_viec.sql : công việc, thành viên, mã tham gia, giới hạn 10 công việc (mục 5, 6.2, 9, 11.1)
-- Chạy SAU 01_ho_so.sql. Supabase web: SQL Editor -> New query -> dán -> Run. Chạy lại nhiều lần vẫn an toàn.
-- Chưa có: yêu cầu tham gia / nhập mã (file 03), nhật ký activity_log (file 04).

-- 1. Bảng ---------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  ten           text not null check (char_length(ten) between 2 and 100),
  join_code     text unique check (join_code ~ '^[A-Z2-9]{8}$'),  -- NULL = mã đang tắt
  max_members   int  not null default 20 check (max_members between 1 and 100),
  trang_thai    text not null default 'dang_hoat_dong' check (trang_thai in ('dang_hoat_dong','luu_tru')),
  tao_boi       uuid not null references auth.users(id) on delete restrict,
  bat_binh_chon boolean not null default false,
  trong_so_diem jsonb not null default '{"a":0.5,"b":0.3,"c":0.2}'
    check (
      jsonb_typeof(trong_so_diem) = 'object'
      and (trong_so_diem ?& array['a','b','c'])
      and trong_so_diem - 'a' - 'b' - 'c' = '{}'::jsonb
      and (trong_so_diem->>'a') is not null and (trong_so_diem->>'b') is not null and (trong_so_diem->>'c') is not null
      and (trong_so_diem->>'a')::numeric >= 0 and (trong_so_diem->>'b')::numeric >= 0 and (trong_so_diem->>'c')::numeric >= 0
      and abs((trong_so_diem->>'a')::numeric + (trong_so_diem->>'b')::numeric + (trong_so_diem->>'c')::numeric - 1) <= 0.000001
    ),
  tao_luc       timestamptz not null default now()
);

create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete restrict,
  user_id     uuid not null references auth.users(id) on delete restrict,
  vai_tro     text not null check (vai_tro in ('truong_nhom','pho_nhom','thanh_vien')),
  trang_thai  text not null default 'dang_tham_gia' check (trang_thai in ('dang_tham_gia','da_roi')),
  ly_do_roi   text check (ly_do_roi in ('tu_roi','bi_loai')),
  tao_luc     timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists members_user_idx on public.members(user_id);

-- 2. Hàm kiểm tra quyền (dùng trong RLS; security definer để không bị lặp vô hạn) ----
create or replace function public.la_thanh_vien(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where project_id = p_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia');
$$;

create or replace function public.la_quan_ly(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where project_id = p_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia'
      and vai_tro in ('truong_nhom','pho_nhom'));
$$;

-- hai người cùng ở một công việc (để xem tên nhau)
create or replace function public.cung_cong_viec(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members a join public.members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and a.trang_thai = 'dang_tham_gia'
      and b.user_id = p_uid     and b.trang_thai = 'dang_tham_gia');
$$;

-- nhóm trưởng/phó xem được mã định danh của người thuộc công việc mình quản lý
create or replace function public.quan_ly_cua(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members a join public.members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and a.trang_thai = 'dang_tham_gia' and a.vai_tro in ('truong_nhom','pho_nhom')
      and b.user_id = p_uid);
$$;

-- 3. RLS: bật, mặc định từ chối ------------------------------------------
alter table public.projects enable row level security;
alter table public.members  enable row level security;

drop policy if exists projects_doc on public.projects;
create policy projects_doc on public.projects
  for select to authenticated using (public.la_thanh_vien(id));

drop policy if exists members_doc on public.members;
create policy members_doc on public.members
  for select to authenticated using (public.la_thanh_vien(project_id));

-- mở rộng hồ sơ (file 01 chỉ cho đọc của chính mình)
drop policy if exists profiles_cung_cong_viec on public.profiles;
create policy profiles_cung_cong_viec on public.profiles
  for select to authenticated using (public.cung_cong_viec(user_id));

drop policy if exists profile_rieng_quan_ly on public.profile_rieng;
create policy profile_rieng_quan_ly on public.profile_rieng
  for select to authenticated using (public.quan_ly_cua(user_id));
-- Không có policy insert/update/delete: chỉ ghi qua hàm bên dưới.

-- 4. Quyền (đã tắt "tự hiển thị bảng mới") --------------------------------
revoke all on public.projects, public.members from anon, authenticated;
-- KHÔNG cấp cột join_code: thành viên thường không đọc được mã (RLS không giấu theo cột, grant theo cột thì được).
-- Nhóm trưởng/phó lấy mã bằng hàm lay_ma(). Vì vậy giao diện phải liệt kê cột, không dùng select('*').
grant select (id, ten, max_members, trang_thai, tao_boi, bat_binh_chon, trong_so_diem, tao_luc)
  on public.projects to authenticated;
grant select on public.members to authenticated;

revoke all on function public.la_thanh_vien(uuid), public.la_quan_ly(uuid),
                       public.cung_cong_viec(uuid), public.quan_ly_cua(uuid) from public, anon;
grant execute on function public.la_thanh_vien(uuid), public.la_quan_ly(uuid),
                          public.cung_cong_viec(uuid), public.quan_ly_cua(uuid) to authenticated;

-- 5. Sinh mã tham gia: 8 ký tự, bỏ I/O/0/1, duy nhất (chỉ dùng nội bộ) ------
create or replace function public.tao_ma_ngau_nhien()
returns text language plpgsql volatile set search_path = '' as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- đúng 32 ký tự
  b bytea; r text; i int;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    r := '';
    for i in 0..7 loop
      r := r || substr(chars, (get_byte(b, i) & 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.projects where join_code = r);
  end loop;
  return r;
end;
$$;
revoke all on function public.tao_ma_ngau_nhien() from public, anon, authenticated;

-- 6. Tạo công việc (tối đa 10 đang hoạt động / nhóm trưởng) ---------------
create or replace function public.tao_cong_viec(p_ten text, p_max_members int default 20)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ten text := btrim(coalesce(p_ten, ''));
  v_duoc boolean;
  v_dem int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập'; end if;
  if char_length(v_ten) not between 2 and 100 then
    raise exception 'Tên công việc phải từ 2 đến 100 ký tự';
  end if;
  if p_max_members is null or p_max_members not between 1 and 100 then
    raise exception 'Số thành viên tối đa phải từ 1 đến 100';
  end if;

  -- khóa dòng hồ sơ: hai lần tạo cùng lúc của một người phải xếp hàng, không vượt 10
  select duoc_tao_cong_viec into v_duoc from public.profiles where user_id = v_uid for update;
  if v_duoc is null then raise exception 'Bạn cần điền hồ sơ trước'; end if;
  if not v_duoc then raise exception 'Bạn chưa có quyền tạo công việc'; end if;

  select count(*) into v_dem from public.projects p
   join public.members m on m.project_id=p.id and m.user_id=v_uid
   where p.trang_thai='dang_hoat_dong' and m.trang_thai='dang_tham_gia' and m.vai_tro='truong_nhom';
  if v_dem >= 10 then
    raise exception 'Bạn đã có 10 công việc đang hoạt động. Hãy lưu trữ bớt một công việc';
  end if;

  insert into public.projects (ten, max_members, tao_boi, join_code)
  values (v_ten, p_max_members, v_uid, public.tao_ma_ngau_nhien())
  returning id into v_id;

  insert into public.members (project_id, user_id, vai_tro)
  values (v_id, v_uid, 'truong_nhom');
  perform public.ghi_log(v_id, null, null, 'tao_cong_viec');
  return v_id;
end;
$$;

-- 7. Xem / đổi / tắt mã (nhóm trưởng và phó) ------------------------------
create or replace function public.lay_ma(p_project uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_ma text;
begin
  if not public.la_quan_ly(p_project) then raise exception 'Bạn không có quyền'; end if;
  select join_code into v_ma from public.projects where id = p_project;
  return v_ma;  -- NULL nghĩa là mã đang tắt
end;
$$;

create or replace function public.doi_ma(p_project uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_ma text; v_tt text;
begin
  if not public.la_quan_ly(p_project) then raise exception 'Bạn không có quyền'; end if;
  select trang_thai into v_tt from public.projects where id = p_project for update;
  if v_tt <> 'dang_hoat_dong' then raise exception 'Công việc đã lưu trữ, không đổi được mã'; end if;
  v_ma := public.tao_ma_ngau_nhien();
  update public.projects set join_code = v_ma where id = p_project;
  perform public.ghi_log(p_project, null, null, 'doi_ma_tham_gia');
  return v_ma;
end;
$$;

create or replace function public.tat_ma(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.la_quan_ly(p_project) then raise exception 'Bạn không có quyền'; end if;
  update public.projects set join_code = null
   where id = p_project and trang_thai = 'dang_hoat_dong';
  if not found then raise exception 'Công việc đã lưu trữ'; end if;
  perform public.ghi_log(p_project, null, null, 'tat_ma_tham_gia');
end;
$$;

create or replace function public.cap_nhat_cong_viec(p_project uuid,p_ten text,p_max_members integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old_ten text; v_old_max integer; v_count integer; v_ten text:=btrim(coalesce(p_ten,''));
begin
  if not public.la_quan_ly(p_project) then raise exception 'Chỉ nhóm trưởng/phó được sửa cài đặt'; end if;
  select ten,max_members into v_old_ten,v_old_max from public.projects
   where id=p_project and trang_thai='dang_hoat_dong' for update;
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

revoke all on function public.tao_cong_viec(text, int), public.lay_ma(uuid),
                       public.doi_ma(uuid), public.tat_ma(uuid),public.cap_nhat_cong_viec(uuid,text,integer) from public, anon;
grant execute on function public.tao_cong_viec(text, int), public.lay_ma(uuid),
                          public.doi_ma(uuid), public.tat_ma(uuid),public.cap_nhat_cong_viec(uuid,text,integer) to authenticated;
