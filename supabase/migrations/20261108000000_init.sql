-- AstraBite by Astratech: skema awal
-- Model akses MVP: satu toko. Semua user yang login (owner/kasir) boleh baca-tulis data toko.
-- Layar TV publik membaca data lewat fungsi tv_feed(token) tanpa login.

create extension if not exists pgcrypto;

-- ---------- tabel ----------
create table public.settings (
  id int primary key default 1 check (id = 1),
  nama_toko text not null default 'AstraBite',
  target_harian int not null default 1500000,
  instagram text not null default '',
  tiktok text not null default '',
  whatsapp text not null default '',
  tv_playlist jsonb not null default '{"menu":true,"promo":true,"best":true,"queue":true,"social":true,"testi":true}',
  tv_durasi int not null default 8 check (tv_durasi between 3 and 60),
  tv_ticker text not null default 'Buka setiap hari 08.00-21.00  •  Bayar pakai QRIS  •  Bisa pesan lewat GoFood & GrabFood',
  tv_sembunyikan_habis boolean not null default false,
  tv_testimoni text[] not null default '{}'
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  satuan text not null,
  stok numeric not null default 0,
  stok_min numeric not null default 0,
  harga_per_satuan numeric not null default 0,
  langkah numeric not null default 1,
  emoji text not null default '📦',
  created_at timestamptz not null default now()
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null default 'Makanan' check (kategori in ('Makanan','Minuman','Snack')),
  harga int not null check (harga >= 0),
  emoji text not null default '🍽️',
  warna text not null default 'pink' check (warna in ('pink','sun','sky','lime','violet')),
  panas boolean not null default false,
  foto_url text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.recipes (
  menu_id uuid not null references public.menus(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  qty numeric not null check (qty > 0),
  primary key (menu_id, ingredient_id)
);

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  diskon int not null check (diskon between 1 and 90),
  kode text not null unique,
  aktif boolean not null default true,
  dipakai int not null default 0,
  created_at timestamptz not null default now()
);
create unique index promos_satu_aktif_per_menu on public.promos(menu_id) where aktif;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  nomor int generated always as identity (start with 1001),
  total int not null default 0,
  metode_bayar text not null check (metode_bayar in ('QRIS','Cash','Transfer')),
  status text not null default 'disiapkan' check (status in ('disiapkan','siap','selesai')),
  kasir_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index orders_created_at on public.orders(created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete restrict,
  qty int not null check (qty > 0),
  harga int not null,
  hpp int not null default 0,
  promo_id uuid references public.promos(id) on delete set null
);
create index order_items_order on public.order_items(order_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  kategori text not null default 'Bahan baku',
  keterangan text not null,
  nominal int not null check (nominal >= 0),
  nota_path text,
  via_scan boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  qty numeric not null,
  tipe text not null check (tipe in ('jual','beli','koreksi')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_ing on public.stock_movements(ingredient_id, created_at desc);

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references public.menus(id) on delete set null,
  platform text not null,
  tujuan text not null,
  hook text not null,
  caption text not null,
  status text not null default 'terjadwal' check (status in ('draft','terjadwal','diposting')),
  jadwal timestamptz,
  created_at timestamptz not null default now()
);

create table public.tv_screens (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  lokasi text not null default '',
  token uuid not null unique default gen_random_uuid(),
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_summaries (
  tanggal date primary key,
  isi text not null,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['settings','ingredients','menus','recipes','promos','orders','order_items',
                           'expenses','stock_movements','content_posts','tv_screens','ai_summaries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- fungsi bantu ----------
create or replace function public.hari_ini() returns date
language sql stable as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

create or replace function public.menu_hpp(p_menu uuid) returns int
language sql stable set search_path = public as $$
  select coalesce(round(sum(r.qty * i.harga_per_satuan)), 0)::int
  from recipes r join ingredients i on i.id = r.ingredient_id
  where r.menu_id = p_menu
$$;

create or replace function public.harga_jual(p_menu uuid) returns int
language sql stable set search_path = public as $$
  select case when p.id is null then m.harga
              else (round(m.harga * (100 - p.diskon) / 10000.0) * 100)::int end
  from menus m left join promos p on p.menu_id = m.id and p.aktif
  where m.id = p_menu
$$;

-- Kasir: bikin pesanan + potong stok + catat pemakaian promo, semuanya dalam satu transaksi
create or replace function public.create_order(p_items jsonb, p_metode text)
returns public.orders
language plpgsql security invoker set search_path = public as $$
declare
  v_order orders;
  v_item jsonb;
  v_menu menus;
  v_promo_id uuid;
  v_qty int;
  v_harga int;
  v_total int := 0;
  r record;
  v_sisa numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pesanan masih kosong';
  end if;

  insert into orders (metode_bayar, kasir_id) values (p_metode, auth.uid()) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Jumlah pesanan tidak valid'; end if;

    select * into v_menu from menus where id = (v_item->>'menu_id')::uuid and aktif;
    if not found then raise exception 'Menu tidak ditemukan atau sudah nonaktif'; end if;

    select id into v_promo_id from promos where menu_id = v_menu.id and aktif;
    v_harga := harga_jual(v_menu.id);

    insert into order_items (order_id, menu_id, qty, harga, hpp, promo_id)
    values (v_order.id, v_menu.id, v_qty, v_harga, menu_hpp(v_menu.id), v_promo_id);
    v_total := v_total + v_harga * v_qty;

    if v_promo_id is not null then
      update promos set dipakai = dipakai + v_qty where id = v_promo_id;
    end if;

    for r in select rc.ingredient_id, rc.qty, i.nama from recipes rc join ingredients i on i.id = rc.ingredient_id
             where rc.menu_id = v_menu.id loop
      update ingredients set stok = stok - r.qty * v_qty where id = r.ingredient_id returning stok into v_sisa;
      if v_sisa < 0 then
        raise exception 'Stok % nggak cukup buat pesanan ini', r.nama;
      end if;
      insert into stock_movements (ingredient_id, qty, tipe, ref_id)
      values (r.ingredient_id, -r.qty * v_qty, 'jual', v_order.id);
    end loop;
  end loop;

  update orders set total = v_total where id = v_order.id returning * into v_order;
  return v_order;
end $$;

-- Belanja bahan (dari Astro Scan atau manual): catat pengeluaran + tambah stok
create or replace function public.add_purchase(p_items jsonb, p_nominal int, p_keterangan text, p_nota_path text, p_via_scan boolean)
returns public.expenses
language plpgsql security invoker set search_path = public as $$
declare
  v_exp expenses;
  v_item jsonb;
begin
  insert into expenses (kategori, keterangan, nominal, nota_path, via_scan, created_by)
  values ('Bahan baku', p_keterangan, p_nominal, p_nota_path, coalesce(p_via_scan, false), auth.uid())
  returning * into v_exp;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if (v_item->>'ingredient_id') is not null and coalesce((v_item->>'qty')::numeric, 0) > 0 then
      update ingredients set stok = stok + (v_item->>'qty')::numeric where id = (v_item->>'ingredient_id')::uuid;
      insert into stock_movements (ingredient_id, qty, tipe, ref_id)
      values ((v_item->>'ingredient_id')::uuid, (v_item->>'qty')::numeric, 'beli', v_exp.id);
    end if;
  end loop;
  return v_exp;
end $$;

create or replace function public.adjust_stock(p_ingredient uuid, p_delta numeric)
returns public.ingredients
language plpgsql security invoker set search_path = public as $$
declare v ingredients;
begin
  update ingredients set stok = greatest(0, stok + p_delta) where id = p_ingredient returning * into v;
  insert into stock_movements (ingredient_id, qty, tipe) values (p_ingredient, p_delta, 'koreksi');
  return v;
end $$;

-- Omzet per hari (zona waktu WIB)
create or replace function public.sales_daily(p_days int default 7)
returns table (tanggal date, omzet bigint, trx bigint, modal bigint)
language sql stable security invoker set search_path = public as $$
  with hari as (
    select generate_series(hari_ini() - (p_days - 1), hari_ini(), interval '1 day')::date as tanggal
  ), o as (
    select (o.created_at at time zone 'Asia/Jakarta')::date as tanggal, o.id, o.total
    from orders o
    where o.created_at >= ((hari_ini() - (p_days - 1))::timestamp at time zone 'Asia/Jakarta')
  )
  select h.tanggal,
         coalesce(sum(o.total), 0)::bigint,
         count(o.id)::bigint,
         coalesce((select sum(oi.qty * oi.hpp) from order_items oi join o o2 on o2.id = oi.order_id where o2.tanggal = h.tanggal), 0)::bigint
  from hari h left join o on o.tanggal = h.tanggal
  group by h.tanggal
  order by h.tanggal
$$;

-- ---------- layar TV publik ----------
create or replace function public.tv_feed(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_screen tv_screens;
  v_hasil jsonb;
begin
  select * into v_screen from tv_screens where token = p_token;
  if not found then return null; end if;
  update tv_screens set last_seen = now() where id = v_screen.id;

  select jsonb_build_object(
    'layar', v_screen.nama,
    'settings', (select to_jsonb(s) - 'target_harian' from settings s where id = 1),
    'menus', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nama', m.nama, 'kategori', m.kategori, 'harga', m.harga,
        'harga_jual', harga_jual(m.id), 'emoji', m.emoji, 'warna', m.warna, 'panas', m.panas,
        'foto_url', m.foto_url,
        'habis', exists (select 1 from recipes r join ingredients i on i.id = r.ingredient_id
                         where r.menu_id = m.id and i.stok < r.qty)
      ) order by m.kategori, m.nama)
      from menus m where m.aktif), '[]'::jsonb),
    'promos', coalesce((
      select jsonb_agg(jsonb_build_object('menu_id', p.menu_id, 'diskon', p.diskon, 'kode', p.kode))
      from promos p join menus m on m.id = p.menu_id where p.aktif and m.aktif), '[]'::jsonb),
    'terlaris', coalesce((
      select jsonb_agg(t) from (
        select oi.menu_id, sum(oi.qty)::int as qty
        from order_items oi join orders o on o.id = oi.order_id
        where (o.created_at at time zone 'Asia/Jakarta')::date = hari_ini()
        group by oi.menu_id order by sum(oi.qty) desc limit 3) t), '[]'::jsonb),
    'antrian', jsonb_build_object(
      'disiapkan', coalesce((select jsonb_agg(nomor order by created_at) from (
          select nomor, created_at from orders where status = 'disiapkan'
          and created_at > now() - interval '12 hours' order by created_at desc limit 6) a), '[]'::jsonb),
      'siap', coalesce((select jsonb_agg(nomor order by created_at desc) from (
          select nomor, created_at from orders where status = 'siap'
          and created_at > now() - interval '12 hours' order by created_at desc limit 6) b), '[]'::jsonb)
    )
  ) into v_hasil;
  return v_hasil;
end $$;

revoke all on function public.tv_feed(uuid) from public;
grant execute on function public.tv_feed(uuid) to anon, authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('menu', 'menu', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('nota', 'nota', false) on conflict (id) do nothing;

create policy "staff_upload_menu" on storage.objects for insert to authenticated with check (bucket_id = 'menu');
create policy "staff_update_menu" on storage.objects for update to authenticated using (bucket_id = 'menu');
create policy "staff_nota_insert" on storage.objects for insert to authenticated with check (bucket_id = 'nota');
create policy "staff_nota_read" on storage.objects for select to authenticated using (bucket_id = 'nota');

-- Fungsi transaksi hanya untuk user yang login
revoke execute on function public.create_order(jsonb, text) from public, anon;
revoke execute on function public.add_purchase(jsonb, int, text, text, boolean) from public, anon;
revoke execute on function public.adjust_stock(uuid, numeric) from public, anon;
revoke execute on function public.sales_daily(int) from public, anon;
grant execute on function public.create_order(jsonb, text) to authenticated;
grant execute on function public.add_purchase(jsonb, int, text, text, boolean) to authenticated;
grant execute on function public.adjust_stock(uuid, numeric) to authenticated;
grant execute on function public.sales_daily(int) to authenticated;
