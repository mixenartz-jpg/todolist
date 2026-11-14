-- ═══════════════════════════════════════════════════════════════════
-- 0031 — Öğrenci denemeleri: öğrenci yazar, koç OKUR
--
-- YALNIZCA EKLEME. Geri alma: 0031_student_denemeler.down.sql
--
-- Yeni tablo YOK: `denemeler` + `deneme_dersleri` (ders bazında D/Y/B)
-- zaten var. Öğrenci kendi hesabıyla girer (mevcut politikalar ve
-- damga trigger'ı öğrenci için de doğru çalışır); burada yalnızca
-- koçun öğrencisininkileri OKUMASI açılır.
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists denemeler_coach_select on public.denemeler;
create policy denemeler_coach_select on public.denemeler
  for select to authenticated
  using ((select public.is_my_student(user_id)));

drop policy if exists deneme_dersleri_coach_select on public.deneme_dersleri;
create policy deneme_dersleri_coach_select on public.deneme_dersleri
  for select to authenticated
  using ((select public.is_my_student(user_id)));

drop policy if exists deneme_yanlislari_coach_select on public.deneme_yanlislari;
create policy deneme_yanlislari_coach_select on public.deneme_yanlislari
  for select to authenticated
  using ((select public.is_my_student(user_id)));

-- Yanlış görselleri: koç öğrencisinin klasörünü okur; öğrenci,
-- koçundan devralınan eski denemelerin görsellerini (koçun klasörü)
-- okur.
drop policy if exists deneme_gorsel_coach_select on storage.objects;
create policy deneme_gorsel_coach_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deneme-gorselleri'
    and exists (
      select 1 from public.profiles p
      where (
        p.user_id::text = (storage.foldername(name))[1]
        and p.coach_id = (select auth.uid())
      ) or (
        p.user_id = (select auth.uid())
        and p.coach_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- ── Mevcut denemeleri öğrenciye aktar (İSTEĞE BAĞLI, SQL Editor) ──
-- Bugüne kadar koç hesabına girilmiş denemeler öğrencinin ise:
--   select public.move_denemeler_to_student('ogrenci@mail', 'koc@mail');
-- Geri almak için:
--   select public.move_denemeler_to_student('koc@mail', 'ogrenci@mail');
-- (Fonksiyon yönden bağımsız: "from" hesabının tüm denemelerini "to"ya
-- taşır. Görseller koçun klasöründe kalır; yukarıdaki politika
-- öğrencinin onları okumasını sağlar.)
create or replace function public.move_denemeler_to_student(to_email text, from_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  to_id uuid;
  from_id uuid;
  n integer;
begin
  select id into to_id from auth.users where lower(email) = lower(trim(to_email));
  select id into from_id from auth.users where lower(email) = lower(trim(from_email));
  if to_id is null or from_id is null then raise exception 'Hesap bulunamadı'; end if;
  if not exists (
    select 1 from public.profiles p
    where (p.user_id = to_id and p.coach_id = from_id)
       or (p.user_id = from_id and p.coach_id = to_id)
  ) then
    raise exception 'Bu iki hesap koç-öğrenci olarak bağlı değil';
  end if;

  update public.denemeler set user_id = to_id where user_id = from_id;
  get diagnostics n = row_count;
  update public.deneme_dersleri set user_id = to_id where user_id = from_id;
  update public.deneme_yanlislari set user_id = to_id where user_id = from_id;
  return n || ' deneme taşındı';
end;
$$;

revoke all on function public.move_denemeler_to_student(text, text) from public, anon, authenticated;
