-- ═══════════════════════════════════════════════════════════════════
-- Öğrenci hesabına girilmiş görevleri KOÇ hesabına taşır.
--
-- Ne zaman: görevler koç/öğrenci ayrımından önce öğrencinin hesabından
-- yazıldıysa. Öğrenci ekranı yalnızca KOÇUN görevlerini gösterir; bu
-- betik o görevleri (ve bağlı kategori/hedefleri) koça devreder.
--
-- Kullanım: aşağıdaki iki e-postayı değiştir, tamamını SQL Editor'de
-- çalıştır. Tek işlem (transaction): hata olursa hiçbir şey değişmez.
-- Tekrar çalıştırmak zararsızdır (taşınacak bir şey kalmamıştır).
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  ogrenci_email text := 'kardesinin@mail.com';   -- ← DEĞİŞTİR
  koc_email     text := 'senin@mail.com';        -- ← DEĞİŞTİR

  s uuid;
  c uuid;
  n_tasks int;
  n_cat int;
  n_goals int;
  n_week int;
  n_nodes int;
  n_merged int;
begin
  select id into s from auth.users where lower(email) = lower(trim(ogrenci_email));
  select id into c from auth.users where lower(email) = lower(trim(koc_email));
  if s is null then raise exception 'Öğrenci hesabı bulunamadı: %', ogrenci_email; end if;
  if c is null then raise exception 'Koç hesabı bulunamadı: %', koc_email; end if;
  if not exists (select 1 from public.profiles where user_id = s and coach_id = c and role = 'student') then
    raise exception 'Önce link_student ile bu iki hesabı bağla (öğrenci → koç)';
  end if;

  -- 1. Aynı isimli kategori iki hesapta da varsa: görevleri koçun
  --    kategorisine yönlendir, öğrencininkini sil (isim benzersiz).
  update public.tasks t
     set category_id = kc.id
    from public.categories sc
    join public.categories kc on kc.user_id = c and lower(kc.name) = lower(sc.name)
   where sc.user_id = s and t.category_id = sc.id;
  update public.routines r
     set category_id = kc.id
    from public.categories sc
    join public.categories kc on kc.user_id = c and lower(kc.name) = lower(sc.name)
   where sc.user_id = s and r.category_id = sc.id;
  delete from public.categories sc
   where sc.user_id = s
     and exists (select 1 from public.categories kc where kc.user_id = c and lower(kc.name) = lower(sc.name));
  get diagnostics n_merged = row_count;

  -- 2. Kalan kategoriler, hedefler, haftalık hedefler, plan düğümleri.
  update public.categories set user_id = c where user_id = s;
  get diagnostics n_cat = row_count;
  update public.plan_goals set user_id = c where user_id = s;
  get diagnostics n_goals = row_count;
  update public.week_goals set user_id = c where user_id = s;
  get diagnostics n_week = row_count;
  update public.goal_nodes set user_id = c where user_id = s;
  get diagnostics n_nodes = row_count;

  -- 3. Görevler. `created_by` da koça geçer: bunlar koçun PLANI,
  --    öğrencinin "ek çalışma"sı değil.
  update public.tasks set user_id = c, created_by = c where user_id = s;
  get diagnostics n_tasks = row_count;

  raise notice 'Taşındı → görev: %, kategori: % (birleşen: %), aylık hedef: %, haftalık hedef: %, düğüm: %',
    n_tasks, n_cat, n_merged, n_goals, n_week, n_nodes;
end $$;

-- Kontrol: hesap başına görev sayısı (öğrencide 0 kalmalı).
select u.email, p.role, count(t.id) as gorev
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.tasks t on t.user_id = u.id
 group by u.email, p.role
 order by p.role;
