-- Data contoh AstraBite. Ganti dengan menu & bahan asli usaha lo.
insert into public.settings (id, nama_toko, target_harian, instagram, tiktok, whatsapp, tv_testimoni)
values (1, 'AstraBite', 1500000, 'astrabite.id', 'astrabite', '0812-0000-0000',
  array['Pedesnya nampol tapi tetep pengen nambah', 'Mayonya lumer, sekali beli langsung 5', 'Kopsu aren paling enak di sekitar sini'])
on conflict (id) do nothing;

insert into public.ingredients (nama, satuan, stok, stok_min, harga_per_satuan, langkah, emoji) values
  ('Telur',          'butir', 42,   15,   2200, 10,   '🥚'),
  ('Ayam fillet',    'gr',    3200, 1000, 45,   1000, '🍗'),
  ('Mie telur',      'bks',   28,   10,   3500, 10,   '🍜'),
  ('Kerupuk seblak', 'gr',    1400, 400,  30,   500,  '🍘'),
  ('Cabai rawit',    'gr',    330,  250,  64,   250,  '🌶️'),
  ('Beras',          'gr',    7500, 2000, 14,   5000, '🍚'),
  ('Gula aren cair', 'ml',    850,  300,  40,   500,  '🍯'),
  ('Susu UHT',       'ml',    1800, 1000, 19,   1000, '🥛'),
  ('Biji kopi',      'gr',    420,  150,  260,  250,  '☕'),
  ('Teh celup',      'pcs',   46,   20,   450,  25,   '🫖'),
  ('Kulit risol',    'lbr',   14,   20,   700,  50,   '🌯'),
  ('Mayones',        'gr',    520,  200,  42,   500,  '🥫');

insert into public.menus (nama, kategori, harga, emoji, warna, panas) values
  ('Seblak Level Galaxy', 'Makanan', 18000, '🍲', 'pink',   true),
  ('Ayam Geprek Orbit',   'Makanan', 22000, '🍗', 'sun',    false),
  ('Mie Nyemek Meteor',   'Makanan', 17000, '🍜', 'sky',    true),
  ('Risol Mayo Planet',   'Snack',   6000,  '🌯', 'lime',   false),
  ('Kopsu Aren Nebula',   'Minuman', 15000, '☕', 'violet', true),
  ('Es Teh Jumbo Komet',  'Minuman', 5000,  '🧋', 'sky',    false);

insert into public.recipes (menu_id, ingredient_id, qty)
select m.id, i.id, r.qty
from (values
  ('Seblak Level Galaxy', 'Kerupuk seblak', 60), ('Seblak Level Galaxy', 'Telur', 1), ('Seblak Level Galaxy', 'Cabai rawit', 25),
  ('Ayam Geprek Orbit', 'Ayam fillet', 150), ('Ayam Geprek Orbit', 'Cabai rawit', 20), ('Ayam Geprek Orbit', 'Beras', 150),
  ('Mie Nyemek Meteor', 'Mie telur', 1), ('Mie Nyemek Meteor', 'Telur', 1), ('Mie Nyemek Meteor', 'Cabai rawit', 10),
  ('Risol Mayo Planet', 'Kulit risol', 1), ('Risol Mayo Planet', 'Mayones', 15), ('Risol Mayo Planet', 'Telur', 0.5),
  ('Kopsu Aren Nebula', 'Biji kopi', 18), ('Kopsu Aren Nebula', 'Susu UHT', 150), ('Kopsu Aren Nebula', 'Gula aren cair', 30),
  ('Es Teh Jumbo Komet', 'Teh celup', 1), ('Es Teh Jumbo Komet', 'Gula aren cair', 15)
) as r(menu, bahan, qty)
join public.menus m on m.nama = r.menu
join public.ingredients i on i.nama = r.bahan;

insert into public.promos (menu_id, diskon, kode)
select id, 15, 'RISOL15' from public.menus where nama = 'Risol Mayo Planet';

insert into public.tv_screens (nama, lokasi) values ('TV Kasir depan', '43 inci · Android TV');
