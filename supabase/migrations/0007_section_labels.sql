-- ═══════════════════════════════════════════════════════════════════
-- 0007 — Bölüm başlıkları
--
-- Ekran içi bölüm başlıklarının ("Görevler", "Bir ara", "Tekrar",
-- "Günlük"…) kullanıcıya özel adları. Uygulama tarafında her başlığın
-- sabit bir VARSAYILANI vardır; bu tablo yalnızca kullanıcının
-- DEĞİŞTİRDİKLERİNİ tutar.
--
-- ── Neden yalnızca sapmalar saklanır? ──
-- Her başlık için bir satır yazmak (kayıt anında ya da ilk açılışta
-- doldurmak) iki doğruluk kaynağı üretirdi: koddaki varsayılan ile
-- satırdaki kopyası. Varsayılan bir gün değişirse, "Görevler"i hiç
-- düzenlememiş kullanıcı eski metinde çakılı kalırdı. Yazılmamış
-- anahtar = varsayılan; bu kural tek yönlüdür ve geri alınabilir —
-- "varsayılana dön" satırı SİLMEK demektir, ayrı bir bayrak değil.
--
-- ── Neden anahtar enum ya da FK değil, serbest metin? ──
-- Anahtar kümesi KODDA yaşıyor (src/lib/ui/sections.ts). Enum'a
-- çevirmek her yeni bölüm için bir migration gerektirirdi; oysa bölüm
-- eklemek bir arayüz kararıdır, şema kararı değil. Kodda karşılığı
-- kalmayan bir anahtar zararsızdır: hiçbir yerde okunmaz. Uzunluk
-- kısıtı, yazım hatasıyla dev bir anahtar yazılmasını engeller.
--
-- ── Neden GEZİNME sekmeleri dahil DEĞİL? ──
-- Sekme adları uygulamanın haritasıdır; "Takvim"i "Şeyler" yapmak
-- ekran adıyla URL'i ve alışkanlığı birbirinden ayırır. Yeniden
-- adlandırma EKRANIN İÇİNDEKİ bölümlerle sınırlıdır — orada etiket
-- kullanıcının kendi çalışma diline aittir ("Görevler" yerine
-- "Sorular" gibi).
--
-- ── Neden ayrı tablo, day_notes gibi tek satırlık bir jsonb değil? ──
-- Tüm etiketler tek bir jsonb sütununda tutulsaydı, iki başlığı ard
-- arda düzenlemek son yazanın kazandığı bir yarış olurdu (her yazma
-- nesnenin tamamını gönderir). Anahtar başına satır, düzenlemeleri
-- birbirinden bağımsız kılar.
-- ═══════════════════════════════════════════════════════════════════

create table public.section_labels (
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Kodda tanımlı bölüm anahtarı (ör. 'today.tasks'). `ekran.bölüm`
  -- biçiminde yazılır: aynı adlı bölüm farklı ekranlarda geçebilir ve
  -- ayrı ayrı adlandırılabilmelidir. Düz 'tasks' anahtarı Bugün
  -- ekranıyla haftalık planı birbirine bağlardı.
  key   text not null check (length(trim(key)) between 1 and 60),

  -- Kullanıcının verdiği ad. Boş bırakılamaz: boş bir başlık
  -- "varsayılana dön" demektir ve bu, SATIRIN SİLİNMESİYLE ifade
  -- edilir. Boş string'i ayrı bir durum olarak taşımak, okuma
  -- tarafında "boş mu, yoksa hiç yok mu" ayrımını her kullanım yerine
  -- yayardı.
  --
  -- 40 karakter: başlıklar bir satırda durmalı. Sınır istemcide
  -- `maxLength` olarak da uygulanır ki kullanıcı sunucudan hata
  -- almadan önce sınırı görsün (mistakes'teki DERS_MAX ile aynı
  -- gerekçe).
  label text not null check (length(trim(label)) between 1 and 40),

  updated_at timestamptz not null default now(),

  -- Kullanıcı + anahtar tekildir; upsert'in çakışma hedefi budur.
  primary key (user_id, key)
);

comment on table public.section_labels is
  'Ekran içi bölüm başlıklarının kullanıcıya özel adları. Yalnızca varsayılandan SAPAN anahtarlar için satır bulunur.';
comment on column public.section_labels.key is
  'Kodda tanımlı bölüm anahtarı (src/lib/ui/sections.ts).';
comment on column public.section_labels.label is
  'Kullanıcının verdiği ad. Varsayılana dönüş = satırın silinmesi.';

-- Ek index YOK: birincil anahtar (user_id, key) tek sorgu şeklini
-- ("bu kullanıcının tüm etiketleri") öneğiyle zaten karşılıyor. Tablo
-- kullanıcı başına bir avuç satır tutar.

-- ─────────────────────────────── RLS ────────────────────────────────
alter table public.section_labels enable row level security;

create policy section_labels_select on public.section_labels
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy section_labels_insert on public.section_labels
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy section_labels_update on public.section_labels
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy section_labels_delete on public.section_labels
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── Trigger'lar ──────────────────────────
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır
-- (0003). UPSERT'te de doğru çalışır: çakışma yoksa INSERT yolundan
-- geçilir ve trigger damgalar; çakışma varsa hedef satır zaten bu
-- kullanıcınındır, çünkü çakışma anahtarı user_id'yi içerir.
-- `day_notes` aynı üçlüyü (bileşik PK + stamp_user_id + upsert)
-- 0004'ten beri kullanıyor.
create trigger section_labels_stamp_user_id
  before insert on public.section_labels
  for each row execute function public.stamp_user_id();

create trigger section_labels_touch_updated_at
  before update on public.section_labels
  for each row execute function public.touch_updated_at();
