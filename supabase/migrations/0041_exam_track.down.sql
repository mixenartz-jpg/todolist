-- 0041 GERİ ALMA — sınav atamaları ve bu dosyanın eklediği LGS konuları silinir.
drop function if exists public.set_student_exam_track(uuid, text);
alter table public.profiles drop constraint if exists profiles_exam_track_check;
alter table public.profiles drop column if exists exam_track;

delete from public.topics t
 using (values
  ('Türkçe', 'LGS', 'Sözcükte Anlam'),
  ('Türkçe', 'LGS', 'Cümlede Anlam'),
  ('Türkçe', 'LGS', 'Paragrafta Anlam'),
  ('Türkçe', 'LGS', 'Söz Sanatları'),
  ('Türkçe', 'LGS', 'Fiilimsiler'),
  ('Türkçe', 'LGS', 'Cümlenin Ögeleri'),
  ('Türkçe', 'LGS', 'Fiilde Çatı'),
  ('Türkçe', 'LGS', 'Cümle Türleri'),
  ('Türkçe', 'LGS', 'Yazım Kuralları'),
  ('Türkçe', 'LGS', 'Noktalama İşaretleri'),
  ('Türkçe', 'LGS', 'Metin Türleri'),
  ('Türkçe', 'LGS', 'Anlatım Bozuklukları'),
  ('Türkçe', 'LGS', 'Sözel Mantık ve Görsel Okuma'),
  ('İnkılap Tarihi', 'LGS', 'Bir Kahraman Doğuyor'),
  ('İnkılap Tarihi', 'LGS', 'Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar'),
  ('İnkılap Tarihi', 'LGS', 'Millî Bir Destan: Ya İstiklal Ya Ölüm'),
  ('İnkılap Tarihi', 'LGS', 'Atatürkçülük ve Çağdaşlaşan Türkiye'),
  ('İnkılap Tarihi', 'LGS', 'Demokratikleşme Çabaları'),
  ('İnkılap Tarihi', 'LGS', 'Atatürk Dönemi Türk Dış Politikası'),
  ('İnkılap Tarihi', 'LGS', 'Atatürk''ün Ölümü ve Sonrası'),
  ('Din Kültürü', 'LGS', 'Kader İnancı'),
  ('Din Kültürü', 'LGS', 'Zekât ve Sadaka'),
  ('Din Kültürü', 'LGS', 'Din ve Hayat'),
  ('Din Kültürü', 'LGS', 'Hz. Muhammed''in Örnekliği'),
  ('Din Kültürü', 'LGS', 'Kur''an-ı Kerim ve Özellikleri'),
  ('İngilizce', 'LGS', 'Friendship'),
  ('İngilizce', 'LGS', 'Teen Life'),
  ('İngilizce', 'LGS', 'In the Kitchen'),
  ('İngilizce', 'LGS', 'On the Phone'),
  ('İngilizce', 'LGS', 'The Internet'),
  ('İngilizce', 'LGS', 'Adventures'),
  ('İngilizce', 'LGS', 'Tourism'),
  ('İngilizce', 'LGS', 'Chores'),
  ('İngilizce', 'LGS', 'Science'),
  ('İngilizce', 'LGS', 'Natural Forces')
 ) as s(subject, exam, name)
 where t.subject = s.subject and t.exam = s.exam and t.name = s.name;
