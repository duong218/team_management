-- 03_tham_gia.sql : nhập mã, phòng chờ, duyệt, thay thế, từ chối (mục 7, 7.1, 11.1-F)
-- Chạy SAU 02_cong_viec.sql. Supabase web: SQL Editor -> New query -> dán -> Run. Chạy lại nhiều lần vẫn an toàn.
-- Chưa có (làm sau, cần bảng task): loại thành viên, rời nhóm, mời lại, thông báo, nhật ký.

-- 1. Bảng ---------------------------------------------------------------
create table if not exists public.join_requests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete restrict,
  user_id     uuid not null references auth.users(id) on delete restrict,
  trang_thai  text not null default 'cho_duyet'
              check (trang_thai in ('cho_duyet','da_duyet','tu_choi','da_thay_the','het_han')),
  tao_luc     timestamptz not null default now(),
  xu_ly_boi   uuid references auth.users(id) on delete restrict,
  xu_ly_luc   timestamptz
);
-- một người chỉ có MỘT yêu cầu đang chờ mỗi công việc (chống bấm đúp)
create unique index if not exists join_requests_mot_cho
  on public.join_requests (project_id, user_id) where trang_thai = 'cho_duyet';
create index if not exists join_requests_project_idx on public.join_requests (project_id, trang_thai);

-- nhật ký nhập sai mã, để khóa tạm (5 lần / 10 phút / tài khoản)
create table if not exists public.join_ma_sai (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  thoi_gian timestamptz not null default now()
);
create index if not exists join_ma_sai_idx on public.join_ma_sai (user_id, thoi_gian);

-- 2. RLS bật, KHÔNG có policy: client không đọc/ghi thẳng, chỉ qua hàm -------
alter table public.join_requests enable row level security;
alter table public.join_ma_sai   enable row level security;
revoke all on public.join_requests, public.join_ma_sai from anon, authenticated;

-- 3. Nhập mã (người xin vào) ----------------------------------------------
-- Lỗi "dự kiến" trả về bằng mã chữ (không raise) để việc ghi nhật ký nhập sai không bị hủy.
-- Mã trả về: da_gui | dang_cho | da_o_trong_nhom | ma_sai | tam_khoa | bi_chan | nhom_day
create or replace function public.nhap_ma(p_ma text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ma  text := upper(btrim(coalesce(p_ma, '')));
  v_pj  record;
  v_dem int;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập'; end if;
  perform 1 from public.profiles where user_id = v_uid for update;
  if not found or not exists (select 1 from public.profile_rieng where user_id = v_uid) then
    raise exception 'Bạn cần điền hồ sơ trước';
  end if;

  delete from public.join_ma_sai where thoi_gian < now() - interval '1 day';
  select count(*) into v_dem from public.join_ma_sai
   where user_id = v_uid and thoi_gian > now() - interval '10 minutes';
  if v_dem >= 5 then return 'tam_khoa'; end if;

  select id, max_members into v_pj from public.projects
   where join_code = v_ma and trang_thai = 'dang_hoat_dong' for update;
  if not found then
    insert into public.join_ma_sai (user_id) values (v_uid);
    return 'ma_sai';  -- chung cho: sai mã, mã đã tắt, công việc đã lưu trữ
  end if;

  if exists (select 1 from public.members
              where project_id = v_pj.id and user_id = v_uid and trang_thai = 'dang_tham_gia') then
    return 'da_o_trong_nhom';
  end if;
  if exists (select 1 from public.join_requests
              where project_id = v_pj.id and user_id = v_uid and trang_thai = 'cho_duyet') then
    return 'dang_cho';
  end if;

  -- bị từ chối từ 3 lần: chặn (TODO file sau: cộng thêm số lần bị loại từ bảng loai_nguoi)
  select count(*) into v_dem from public.join_requests
   where project_id = v_pj.id and user_id = v_uid and trang_thai = 'tu_choi';
  if v_dem >= 3 then return 'bi_chan'; end if;

  select (select count(*) from public.members where project_id = v_pj.id and trang_thai = 'dang_tham_gia')+
         (select count(*) from public.join_requests where project_id = v_pj.id and trang_thai = 'cho_duyet') into v_dem;
  if v_dem >= v_pj.max_members then return 'nhom_day'; end if;

  begin
    insert into public.join_requests (project_id, user_id) values (v_pj.id, v_uid);
  exception when unique_violation then
    return 'dang_cho';
  end;

  -- TODO: thông báo cho nhóm trưởng/phó (bảng thong_bao, file sau)
  return 'da_gui';
end;
$$;

-- 4. Người xin vào xem yêu cầu của mình (để hiện màn "đang chờ duyệt") -------
create or replace function public.yeu_cau_cua_toi()
returns table (request_id uuid, ten_cong_viec text, trang_thai text, tao_luc timestamptz)
language sql stable security definer set search_path = '' as $$
  select jr.id, pj.ten, jr.trang_thai, jr.tao_luc
    from public.join_requests jr
    join public.projects pj on pj.id = jr.project_id
   where jr.user_id = auth.uid() and jr.trang_thai in ('cho_duyet', 'tu_choi')
   order by jr.tao_luc desc
   limit 20;
$$;

-- 5. Phòng chờ cho nhóm trưởng/phó (mục 7.1) -------------------------------
create or replace function public.phong_cho(p_project uuid)
returns table (
  request_id uuid, user_id uuid, ho_ten text, email text, ma_dinh_danh text, don_vi text,
  cho_tu timestamptz, trung_ma_voi text, so_lan_bi_tu_choi bigint, tung_o_nhom boolean)
language sql stable security definer set search_path = '' as $$
  select jr.id, jr.user_id, p.ho_ten, u.email::text, pr.ma_dinh_danh, p.don_vi, jr.tao_luc,
         -- cảnh báo trùng mã: người KHÁC trong công việc này đang dùng cùng mã định danh (mục 4.2)
         (select p2.ho_ten
            from public.profile_rieng pr2
            join public.members m2  on m2.user_id = pr2.user_id and m2.project_id = p_project
            join public.profiles p2 on p2.user_id = pr2.user_id
           where pr2.ma_dinh_danh = pr.ma_dinh_danh and pr2.user_id <> jr.user_id
           limit 1),
         (select count(*) from public.join_requests x
           where x.project_id = p_project and x.user_id = jr.user_id and x.trang_thai = 'tu_choi'),
         exists (select 1 from public.members m
                  where m.project_id = p_project and m.user_id = jr.user_id)
    from public.join_requests jr
    join public.profiles p       on p.user_id = jr.user_id
    join public.profile_rieng pr on pr.user_id = jr.user_id
    join auth.users u            on u.id = jr.user_id
   where jr.project_id = p_project and jr.trang_thai = 'cho_duyet'
     and public.la_quan_ly(p_project)
   order by jr.tao_luc;
$$;

-- 6. Danh sách thành viên cho nhóm trưởng/phó (dùng để chọn "người cũ" khi thay thế; mục 7.3) ----
create or replace function public.ds_thanh_vien(p_project uuid)
returns table (
  member_id uuid, user_id uuid, ho_ten text, don_vi text, ma_dinh_danh text,
  vai_tro text, trang_thai text, ly_do_roi text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id, p.ho_ten, p.don_vi, pr.ma_dinh_danh, m.vai_tro, m.trang_thai, m.ly_do_roi
    from public.members m
    join public.profiles p       on p.user_id = m.user_id
    join public.profile_rieng pr on pr.user_id = m.user_id
   where m.project_id = p_project and public.la_quan_ly(p_project)
   order by (m.trang_thai = 'dang_tham_gia') desc, p.ho_ten;
$$;

-- 7. Cho vào là thành viên mới ---------------------------------------------
create or replace function public.duyet_moi(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_proj uuid; v_user uuid; v_pt text; v_max int; v_dem int;
begin
  if auth.uid() is null then raise exception 'Bạn chưa đăng nhập'; end if;
  select project_id into v_proj from public.join_requests where id = p_request;
  if v_proj is null then raise exception 'Không tìm thấy yêu cầu'; end if;
  if not public.la_quan_ly(v_proj) then raise exception 'Bạn không có quyền'; end if;

  -- khóa dòng công việc: hai người duyệt cùng lúc phải xếp hàng, không vượt max_members
  select trang_thai, max_members into v_pt, v_max
    from public.projects where id = v_proj for update;
  if v_pt <> 'dang_hoat_dong' then raise exception 'Công việc đã lưu trữ'; end if;

  -- nguyên tử: trưởng và phó cùng bấm thì chỉ một bên cập nhật được dòng này
  update public.join_requests
     set trang_thai = 'da_duyet', xu_ly_boi = auth.uid(), xu_ly_luc = now()
   where id = p_request and trang_thai = 'cho_duyet'
   returning user_id into v_user;
  if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;

  -- kiểm tra lại số chỗ ngay lúc duyệt (không chỉ lúc nhập mã)
  select count(*) into v_dem from public.members
   where project_id = v_proj and trang_thai = 'dang_tham_gia';
  if v_dem >= v_max then raise exception 'Công việc đã đủ người'; end if;
  if exists (select 1 from public.members
              where project_id = v_proj and user_id = v_user and trang_thai = 'dang_tham_gia') then
    raise exception 'Người này đã ở trong nhóm';
  end if;

  -- người từng rời nhóm: khôi phục đúng dòng cũ (giữ task và lịch sử), vai trò về thành viên
  update public.members
     set trang_thai = 'dang_tham_gia', ly_do_roi = null, vai_tro = 'thanh_vien'
   where project_id = v_proj and user_id = v_user and trang_thai = 'da_roi';
  if not found then
    insert into public.members (project_id, user_id, vai_tro) values (v_proj, v_user, 'thanh_vien');
  end if;

  -- TODO: activity_log + thong_bao (file sau)
end;
$$;

-- 8. Đây là người cũ, thay thế ----------------------------------------------
-- Chỉ đổi members.user_id của dòng cũ sang tài khoản mới. Không xóa gì (mục 7).
create or replace function public.duyet_thay_the(p_request uuid, p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_proj uuid; v_user uuid; v_pt text; v_max int; v_dem int; v_vt text; v_tt text;
begin
  if auth.uid() is null then raise exception 'Bạn chưa đăng nhập'; end if;
  select project_id into v_proj from public.join_requests where id = p_request;
  if v_proj is null then raise exception 'Không tìm thấy yêu cầu'; end if;
  if not public.la_quan_ly(v_proj) then raise exception 'Bạn không có quyền'; end if;

  select trang_thai, max_members into v_pt, v_max
    from public.projects where id = v_proj for update;
  if v_pt <> 'dang_hoat_dong' then raise exception 'Công việc đã lưu trữ'; end if;

  select vai_tro, trang_thai into v_vt, v_tt
    from public.members where id = p_member and project_id = v_proj for update;
  if not found then raise exception 'Không tìm thấy thành viên cũ trong công việc này'; end if;

  -- phó không được thay thế nhóm trưởng (tránh phó chiếm quyền, mục 11.1-F)
  if v_vt = 'truong_nhom' and not exists (
       select 1 from public.members
        where project_id = v_proj and user_id = auth.uid()
          and trang_thai = 'dang_tham_gia' and vai_tro = 'truong_nhom') then
    raise exception 'Chỉ nhóm trưởng mới thay thế được nhóm trưởng';
  end if;

  update public.join_requests
     set trang_thai = 'da_thay_the', xu_ly_boi = auth.uid(), xu_ly_luc = now()
   where id = p_request and trang_thai = 'cho_duyet'
   returning user_id into v_user;
  if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;

  -- tài khoản mới đã có dòng trong công việc này: chặn (unique project_id + user_id)
  if exists (select 1 from public.members where project_id = v_proj and user_id = v_user) then
    raise exception 'Tài khoản này đã có dòng trong công việc, không thay thế được';
  end if;

  -- dòng cũ đã rời mà được thay thế thì thành đang tham gia: phải còn chỗ
  if v_tt = 'da_roi' then
    select count(*) into v_dem from public.members
     where project_id = v_proj and trang_thai = 'dang_tham_gia';
    if v_dem >= v_max then raise exception 'Công việc đã đủ người'; end if;
  end if;

  update public.members
     set user_id = v_user, trang_thai = 'dang_tham_gia', ly_do_roi = null
   where id = p_member;

  -- TODO: activity_log + thong_bao (file sau)
end;
$$;

-- 9. Từ chối -----------------------------------------------------------------
create or replace function public.tu_choi_yeu_cau(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_proj uuid; v_user uuid; v_state text;
begin
  if auth.uid() is null then raise exception 'Bạn chưa đăng nhập'; end if;
  select project_id into v_proj from public.join_requests where id = p_request;
  if v_proj is null then raise exception 'Không tìm thấy yêu cầu'; end if;
  if not public.la_quan_ly(v_proj) then raise exception 'Bạn không có quyền'; end if;
  select trang_thai into v_state from public.projects where id=v_proj for update;
  if v_state<>'dang_hoat_dong' then raise exception 'Công việc đã lưu trữ'; end if;

  update public.join_requests
     set trang_thai = 'tu_choi', xu_ly_boi = auth.uid(), xu_ly_luc = now()
   where id = p_request and trang_thai = 'cho_duyet'
   returning user_id into v_user;
  if v_user is null then raise exception 'Yêu cầu này đã được xử lý'; end if;
end;
$$;

-- 10. Quyền chạy hàm ------------------------------------------------------------
revoke all on function
  public.nhap_ma(text), public.yeu_cau_cua_toi(), public.phong_cho(uuid), public.ds_thanh_vien(uuid),
  public.duyet_moi(uuid), public.duyet_thay_the(uuid, uuid), public.tu_choi_yeu_cau(uuid)
  from public, anon;
grant execute on function
  public.nhap_ma(text), public.yeu_cau_cua_toi(), public.phong_cho(uuid), public.ds_thanh_vien(uuid),
  public.duyet_moi(uuid), public.duyet_thay_the(uuid, uuid), public.tu_choi_yeu_cau(uuid)
  to authenticated;
