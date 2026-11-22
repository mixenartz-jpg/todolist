-- ═══════════════════════════════════════════════════════════════════
-- 0041 — Öğrencinin sınavı (LGS / YKS) + LGS'nin eksik dersleri
--
-- YALNIZCA EKLEME. Geri alma: 0041_exam_track.down.sql
--
-- profiles.exam_track: öğrenci LGS'ye mi YKS'ye mi hazırlanıyor. Ders
-- takip ekranı derslerini/konularını buna göre süzer (LGS → yalnızca
-- LGS konuları; YKS → TYT + AYT). null = atanmadı, hepsi görünür.
--
-- profiles'a yazma politikası YOK (0028: roller yalnızca SQL'den). Koç
-- sınavı `set_student_exam_track` ile yazar; işlev yalnızca KENDİ
-- öğrencisinin satırına dokunur.
--
-- Konu listesi: 0035'te LGS için yalnızca Matematik ve Fen vardı;
-- Türkçe, İnkılap Tarihi, Din Kültürü, İngilizce eklenir (8. sınıf
-- programı). Düzenleyip yeniden çalıştırılabilir (`on conflict`).
-- ═══════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists exam_track text;

alter table public.profiles drop constraint if exists profiles_exam_track_check;
alter table public.profiles add constraint profiles_exam_track_check
  check (exam_track is null or exam_track in ('LGS', 'YKS'));

create or replace function public.set_student_exam_track(student uuid, track text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if track is not null and track not in ('LGS', 'YKS') then
    raise exception 'Geçersiz sınav: %', track using errcode = '22023';
  end if;
  if not public.is_my_student(student) then
    raise exception 'Bu öğrenci senin öğrencin değil' using errcode = '42501';
  end if;
  update public.profiles set exam_track = track where user_id = student;
end;
$$;

revoke all on function public.set_student_exam_track(uuid, text) from public, anon;
grant execute on function public.set_student_exam_track(uuid, text) to authenticated;

with seed(subject, exam, ord, name, aliases) as (values
  -- Türkçe
  ('Türkçe', 'LGS',  1, 'Sözcükte Anlam', '{Sözcük Anlamı}'),
  ('Türkçe', 'LGS',  2, 'Cümlede Anlam', '{Cümle Anlamı}'),
  ('Türkçe', 'LGS',  3, 'Paragrafta Anlam', '{Paragraf}'),
  ('Türkçe', 'LGS',  4, 'Söz Sanatları', '{}'),
  ('Türkçe', 'LGS',  5, 'Fiilimsiler', '{Eylemsiler}'),
  ('Türkçe', 'LGS',  6, 'Cümlenin Ögeleri', '{Cümle Ögeleri}'),
  ('Türkçe', 'LGS',  7, 'Fiilde Çatı', '{Fiil Çatısı,Eylemde Çatı}'),
  ('Türkçe', 'LGS',  8, 'Cümle Türleri', '{}'),
  ('Türkçe', 'LGS',  9, 'Yazım Kuralları', '{Yazım}'),
  ('Türkçe', 'LGS', 10, 'Noktalama İşaretleri', '{Noktalama}'),
  ('Türkçe', 'LGS', 11, 'Metin Türleri', '{}'),
  ('Türkçe', 'LGS', 12, 'Anlatım Bozuklukları', '{}'),
  ('Türkçe', 'LGS', 13, 'Sözel Mantık ve Görsel Okuma', '{Sözel Mantık,Görsel Okuma}'),
  -- İnkılap Tarihi
  ('İnkılap Tarihi', 'LGS',  1, 'Bir Kahraman Doğuyor', '{}'),
  ('İnkılap Tarihi', 'LGS',  2, 'Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar', '{Milli Uyanış}'),
  ('İnkılap Tarihi', 'LGS',  3, 'Millî Bir Destan: Ya İstiklal Ya Ölüm', '{Milli Bir Destan}'),
  ('İnkılap Tarihi', 'LGS',  4, 'Atatürkçülük ve Çağdaşlaşan Türkiye', '{Atatürkçülük}'),
  ('İnkılap Tarihi', 'LGS',  5, 'Demokratikleşme Çabaları', '{}'),
  ('İnkılap Tarihi', 'LGS',  6, 'Atatürk Dönemi Türk Dış Politikası', '{Türk Dış Politikası}'),
  ('İnkılap Tarihi', 'LGS',  7, 'Atatürk''ün Ölümü ve Sonrası', '{}'),
  -- Din Kültürü
  ('Din Kültürü', 'LGS',  1, 'Kader İnancı', '{Kader}'),
  ('Din Kültürü', 'LGS',  2, 'Zekât ve Sadaka', '{Zekat ve Sadaka}'),
  ('Din Kültürü', 'LGS',  3, 'Din ve Hayat', '{}'),
  ('Din Kültürü', 'LGS',  4, 'Hz. Muhammed''in Örnekliği', '{}'),
  ('Din Kültürü', 'LGS',  5, 'Kur''an-ı Kerim ve Özellikleri', '{}'),
  -- İngilizce
  ('İngilizce', 'LGS',  1, 'Friendship', '{}'),
  ('İngilizce', 'LGS',  2, 'Teen Life', '{}'),
  ('İngilizce', 'LGS',  3, 'In the Kitchen', '{}'),
  ('İngilizce', 'LGS',  4, 'On the Phone', '{}'),
  ('İngilizce', 'LGS',  5, 'The Internet', '{}'),
  ('İngilizce', 'LGS',  6, 'Adventures', '{}'),
  ('İngilizce', 'LGS',  7, 'Tourism', '{}'),
  ('İngilizce', 'LGS',  8, 'Chores', '{}'),
  ('İngilizce', 'LGS',  9, 'Science', '{}'),
  ('İngilizce', 'LGS', 10, 'Natural Forces', '{}')
)
insert into public.topics (subject, exam, name, aliases, sort_order)
select subject, exam, name, aliases::text[], ord from seed
on conflict (subject, exam, name) do update
  set aliases = excluded.aliases,
      sort_order = excluded.sort_order;
