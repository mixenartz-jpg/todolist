-- ═══════════════════════════════════════════════════════════════════
-- 0008 — Planlama bölümü
--
-- BİR KEZ ÇALIŞTIRIN. `create table` ve `add column` kullanır; ikinci
-- çalıştırma "already exists" hatası verir (0001–0007 de böyledir).
--
-- Dört parça tek dosyada: `categories`, `plan_goals`, `tasks` ALTER ve
-- `day_notes` ALTER. Ayrı dosyalara bölünmedi çünkü bunlar TEK bir
-- özelliğin şemasıdır ve SQL Supabase editörüne elle yapıştırılıyor —
-- dört dosya, arada birini atlama riski demektir. Yarım uygulanmış bir
-- şema (kategoriler var ama tasks.category_id yok) uygulamayı sessizce
-- bozardı.
--
-- ── Neden ÇOKLU ETİKET değil, tek FK? ──
-- Bir görev iki kategoriye birden aitse, ay dağılımında iki dilime
-- birden sayılır ve dilimlerin toplamı görev sayısını aşar — grafik
-- yalan söyler. Görev başına EN FAZLA BİR kategori ve EN FAZLA BİR
-- hedef, "dilimlerin toplamı = %100" garantisini ŞEMADAN alır. Ara
-- tablo bu garantiyi her sorguda elle korumayı gerektirirdi.
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- 1. categories — kullanıcının kendi kategorileri
-- ═══════════════════════════════════════════════════════════════════

create table public.categories (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 40 karakter: kategori adı bir çipe sığmalı ve ızgara hücresinde
  -- kırpılmadan durmalı. Sınır istemcide `maxLength` olarak da
  -- uygulanır ki kullanıcı sunucudan hata almadan önce sınırı görsün
  -- (section_labels ile aynı gerekçe).
  name    text not null check (length(trim(name)) between 1 and 40),

  -- Kimlik rengi: rutinlerle AYNI 8 slotluk doğrulanmış palet
  -- (src/lib/ui/colors.ts). Serbest hex DEĞİL — o dosyanın kendi
  -- yorumu şunu söylüyor: "Slot SIRASI renk körlüğü güvenliğinin
  -- mekanizmasıdır, kozmetik değildir". Serbest hex, koyu zeminde
  -- (#111318) 1.2:1 kontrastlı okunmaz bir renk seçilmesine izin
  -- verir ve tüm garantiyi çöpe atar.
  --
  -- Sekizden fazla kategoride renkler TEKRARLANIR. Kabul: kategori adı
  -- zaten yazıyla görünür, renk ikincil bir işarettir ve tek başına
  -- bilgi taşımaz (erişilebilirlik kuralı).
  color_slot smallint not null default 0 check (color_slot between 0 and 7),

  sort_order integer not null default 0,

  -- Arşiv, silme DEĞİL. Kategoriyi silmek geçmiş görevlerin
  -- category_id'sini null'a düşürür ve GEÇMİŞ AY DAĞILIMLARI geriye
  -- dönük değişir — Mart'ın özeti bugün baktığında başka görünürdü.
  -- Arşivlemek geçmişi korur, kategoriyi yalnızca SEÇİM listesinden
  -- çıkarır.
  archived_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Aynı adda iki kategori, dağılım grafiğinde ayırt edilemeyen iki
  -- dilim demektir. Arşivlenmişler HARİÇ TUTULMAZ: arşivden geri
  -- döndürmek çakışma yaratmasın diye kısıt tüm satırları kapsar.
  --
  -- DİKKAT — Türkçe: bu kısıt büyük/küçük harf DUYARLIDIR, yani
  -- "Matematik" ve "matematik" iki ayrı satır olur. `lower()` üzerinde
  -- functional unique index KULLANILMADI: Türkçe'de `I → ı` beklenir
  -- ama Postgres'in varsayılan collation'ı `I → i` yapar ve sonuç
  -- kullanıcının beklentisiyle çelişir. Asıl deneyim istemcide
  -- `isDuplicateCategoryName` (localeCompare + "tr" + sensitivity
  -- "base") ile uyarı göstermektir; bu kısıt son savunma hattıdır.
  unique (user_id, name)
);

comment on table public.categories is
  'Kullanıcının kendi oluşturduğu görev kategorileri. Renk, rutinlerle aynı 8 slotluk paletten seçilir.';
comment on column public.categories.color_slot is
  'src/lib/ui/colors.ts paletindeki slot (0..7). Serbest hex değil — kontrast garantisi korunsun diye.';
comment on column public.categories.archived_at is
  'Arşivlenme anı. Silme yerine arşiv: silmek geçmiş ay dağılımlarını geriye dönük değiştirirdi.';

-- `routines_user_sort_idx` ile birebir aynı desen: arşivlenmemişler
-- önce, sonra kullanıcının verdiği sıra. Ekranın tek sorgu şekli
-- ("bu kullanıcının kategorileri, kendi sırasıyla") bununla karşılanır.
create index categories_user_sort_idx
  on public.categories (user_id, archived_at nulls first, sort_order);


-- ═══════════════════════════════════════════════════════════════════
-- 2. plan_goals — aylık hedefler
-- ═══════════════════════════════════════════════════════════════════
--
-- ── Ay nasıl temsil edilir? ──
-- Üç aday vardı ve `date` seçildi:
--
--   text 'YYYY-MM'   ❌ Sözlük sıralaması doğru çalışır ama
--                       `month + interval '1 month'` çalışmaz;
--                       "önceki ay / sonraki ay" uygulamada string
--                       aritmetiğine düşer. Daha kötüsü: projenin
--                       DateStr disiplini 'YYYY-MM-DD' üzerine kurulu
--                       ve ikinci bir tarih-benzeri string biçimi,
--                       isDateStr guard'ının kapsamadığı bir "sanki
--                       tarih" tipi doğururdu.
--
--   year + month     ❌ İki smallint sütun: karşılaştırma bileşik olur
--                       ((year, month) > (2026, 8)), index bileşik
--                       olur ve uygulamada her yerde {year, month}
--                       nesnesi taşınır. DateStr zaten var olan TEK
--                       bir skalerdir.
--
--   date (ayın 1'i)  ✅ startOfMonth, endOfMonth, compareDates,
--                       toParts helper'larının HEPSİ hiç yazılmadan
--                       çalışır. supabase-js `date`'i 'YYYY-MM-DD'
--                       string döndürdüğü için asDateStr() doğrudan
--                       geçer ve src/lib/date/types.ts'in "sınırdan
--                       Date nesnesi geçmez" kuralı korunur.
-- ═══════════════════════════════════════════════════════════════════

create table public.plan_goals (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Hedefin ait olduğu ay, AYIN 1'İNE sabitlenmiş bir `date`.
  --
  -- `check` neden gerekli? `date` tipi tek başına '2026-08-17' kabul
  -- eder ve o zaman aynı ay için iki farklı anahtar doğar
  -- ('2026-08-01' ve '2026-08-17'); "bu ayın hedefleri" sorgusu
  -- ikisini farklı aylar sanardı. Kısıt, ayın kanonik temsilini
  -- VERİTABANI seviyesinde tekilleştirir. Uygulama zaten
  -- startOfMonth() üretiyor — kısıt hiç tetiklenmemeli, son savunma
  -- hattıdır.
  month   date not null check (extract(day from month) = 1),

  title   text not null check (length(trim(title)) between 1 and 120),

  -- Ayrıntı zorunlu DEĞİL: bazı hedeflerin başlığı zaten tam
  -- cümledir ("Her gün 20 soru") ve açıklama istemek yazma
  -- sürtünmesidir (notes.title ile aynı gerekçe).
  note    text check (note is null or length(note) <= 2000),

  -- Sayısal hedef ("30 deneme"), İSTEĞE BAĞLI.
  --   null  → ilerleme BAĞLI GÖREVLERDEN okunur (kaçı bitti).
  --   dolu  → ilerleme done_count / target_count oranıdır.
  --
  -- `routines.target` gibi `numeric` DEĞİL, `integer`: aylık hedefler
  -- sayılabilir işlerdir ("20 deneme", "12 bölüm") ve kesirli birim
  -- taşımazlar. Bu aynı zamanda 0001'deki "numeric supabase-js'e
  -- STRING gelir" tuzağından da kaçınır.
  target_count integer check (target_count is null or target_count between 1 and 9999),

  -- Kullanıcının elle işaretlediği ilerleme. Yalnızca `target_count`
  -- doluyken anlamlıdır.
  --
  -- Görevlerden TÜRETİLMEZ çünkü her hedef göreve bağlanmaz: "kitabı
  -- bitir — 12 bölüm" hedefinde on iki ayrı görev açmak kullanıcıya
  -- yüklenen gereksiz bir iştir. Elle sayaç, göreve bağlanmayan
  -- hedefleri de ölçülebilir kılar.
  done_count   integer not null default 0 check (done_count >= 0),

  -- Hedefin kimlik rengi: categories.color_slot ile AYNI palet. Ay
  -- özetinde hedef çubukları ve kategori dilimleri yan yana durur;
  -- iki ayrı palet, aynı ekranda iki ayrı renk dili demek olurdu.
  color_slot smallint not null default 0 check (color_slot between 0 and 7),

  sort_order integer not null default 0,

  -- Hedef ay bitmeden de kapatılabilir ("bunu artık takip
  -- etmiyorum"). Silmek DEĞİL: bağlı görevlerin goal_id'si null'a
  -- düşer ve geçmiş ay özeti geriye dönük değişirdi (categories
  -- .archived_at ile aynı gerekçe).
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plan_goals is
  'Aylık odak/hedef kalemleri. Ay, ayın 1''ine sabitlenmiş bir date ile temsil edilir.';
comment on column public.plan_goals.month is
  'Hedefin ayı, ayın 1''ine sabitlenmiş. Kısıt kanonik temsili garanti eder.';
comment on column public.plan_goals.target_count is
  'İsteğe bağlı sayısal hedef. null → ilerleme bağlı görevlerden okunur.';
comment on column public.plan_goals.done_count is
  'Elle işaretlenen ilerleme. Yalnızca target_count doluyken kullanılır; görevlerden türetilmez.';

-- Ekranın tek sorgu şekli: "bu kullanıcının şu aydaki hedefleri, kendi
-- sırasıyla". `month desc` çünkü kullanıcı en çok güncel aya bakar.
create index plan_goals_user_month_idx
  on public.plan_goals (user_id, month desc, sort_order);

-- `unique` kısıtı YOK — bilerek. Aynı ay için birden çok hedef normal
-- durumdur ("3 deneme çöz", "kitap bitir"). Aynı BAŞLIKTA iki hedef
-- yazmak kullanıcı hatasıdır ama şema hatası değildir; unique koymak
-- iki ayrı ayda aynı adlı hedefi ("Tekrar") imkânsız kılmazdı ama aynı
-- ayda meşru bir tekrarı engellerdi ve bunun bir gerekçesi yok.


-- ═══════════════════════════════════════════════════════════════════
-- 3. tasks — kategori ve hedef bağlantısı
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  -- `on delete set null`, `cascade` DEĞİL: kategori silmek GÖREVİ
  -- silmemeli. "Matematik" kategorisini kaldıran kullanıcı, o
  -- kategorideki 40 işi de silmek istemiyordur — isteseydi işleri
  -- silerdi. `restrict` de değil: kullanıcıyı "önce 40 görevi tek tek
  -- boşalt" işine mahkûm ederdi. null = "kategorisiz", zaten birinci
  -- sınıf bir durumdur (görevlerin çoğunun kategorisi yoktur —
  -- start_time'ın null olmasıyla aynı ruhta).
  add column category_id uuid references public.categories (id) on delete set null,

  -- Aynı gerekçe. Ek olarak: hedef silmek geçmiş ay özetini geriye
  -- dönük değiştirir; bu yüzden arayüz silmek yerine ARŞİVLEMEYİ öne
  -- çıkarır (plan_goals.archived_at). `set null` yine de son
  -- savunmadır — hedef gerçekten silinirse görev hayatta kalır.
  add column goal_id uuid references public.plan_goals (id) on delete set null;

comment on column public.tasks.category_id is
  'Görevin kategorisi. En fazla BİR tane — çoklu etiket değil (dilim toplamı = %100 garantisi).';
comment on column public.tasks.goal_id is
  'Görevin bağlı olduğu aylık hedef. En fazla BİR tane.';

-- Yeni index YOK — 0006'daki gerekçenin aynısı. Hiçbir sorgu bu
-- sütunlarla FİLTRELEMİYOR: useTasks() tüm görevleri tek seferde
-- çekiyor ve kategori/hedef gruplaması istemcide, bellekte yapılıyor
-- (queries.ts'in "kişi başına yüzlerle ölçülür, tek çekim daha basit
-- ve hızlı" kararı).
--
-- BİLİNÇLİ TAVİZ: FK sütunlarında index olmaması, `delete from
-- categories` işleminde Postgres'in `tasks` üzerinde seq scan yapması
-- demektir. Kullanıcı başına birkaç yüz satır için ölçülemez;
-- kategori silme de yılda birkaç kez olan bir iştir. İleride biri
-- index eklemeyi düşünürse kararın bilinçli olduğunu buradan görsün.


-- ═══════════════════════════════════════════════════════════════════
-- 4. day_notes — günün planı
-- ═══════════════════════════════════════════════════════════════════

alter table public.day_notes
  -- Günün PLANI — `note` ile aynı şey DEĞİLDİR ve onun yerine geçmez:
  --
  --   note : GERİYE dönük. "Bugün nasıl geçti", ruh haliyle birlikte,
  --          Bugün ekranında akşam yazılır (0004'ün başlığı bunu
  --          açıkça tanımlıyor).
  --   plan : İLERİYE dönük. "Bugün şunları yapacağım", Planlama
  --          ekranında sabah ya da önceki gün yazılır.
  --
  -- İkisini tek alanda tutmak, akşam yazılan değerlendirmenin sabahki
  -- planı EZMESİ demekti: DayNoteCard'ın debounce'lu autosave'i tek
  -- alan üzerinde çalışıyor ve son yazan kazanırdı.
  --
  -- Ayrı TABLO da değil (`day_plans`): anahtar aynı olurdu
  -- (user_id, date), RLS aynı, trigger aynı. Ayrı tablo her gün
  -- açılışında ikinci bir sorgu ya da bir join getirir ve kazandırdığı
  -- hiçbir şey yok — 0007'nin "ayrı tablo mu tek jsonb mu"
  -- muhakemesinin tersi yön: orada iki başlık BAĞIMSIZ düzenleniyordu,
  -- burada iki alan aynı doğal anahtara ait.
  --
  -- 4000 karakter: `note` 2000 ile sınırlı ama plan bir gün listesi
  -- taşıyabilir ve satır satır yazılır; iki katı pay bırakıldı.
  add column plan text check (plan is null or length(plan) <= 4000);

comment on column public.day_notes.plan is
  'Günün İLERİYE dönük planı. note (geriye dönük değerlendirme) ile karıştırılmamalıdır.';

-- ⚠ UYGULAMA TARAFINDA GEREKEN DEĞİŞİKLİK:
-- `useSaveDayNote` şu an `note is null and mood is null` olduğunda
-- SATIRI SİLİYOR. Bu koşul artık `plan`'ı da içermelidir, yoksa Bugün
-- ekranında notu ve ruh halini temizleyen kullanıcı, Planlama'da
-- yazdığı günün planını da sessizce siler. Kısıt SQL'e konmadı çünkü
-- "hepsi boşsa sil" bir arayüz kararıdır, veri bütünlüğü kuralı değil.


-- ═══════════════════════════════════════════════════════════════════
-- 5. RLS
-- ═══════════════════════════════════════════════════════════════════
--
-- `tasks` ve `day_notes` ALTER'ları yeni policy GEREKTİRMEZ: mevcut
-- policy'ler satırın tamamını kapsar, sütun bazlı değildir.
--
-- ── Reddedilen trigger: "görevin kategorisi görevin sahibine ait
--    olmalı" ──
-- routine_schedules'da böyle bir trigger var (stamp_schedule_owner)
-- çünkü ORADA `user_id` bir SÜTUN'du ve rutinin sahibiyle tutarsız
-- olabilirdi. Burada tasks.category_id yalnızca bir FK'dir; ayrı bir
-- user_id kopyası yok, dolayısıyla tutarsızlaşacak bir şey de yok.
-- RLS başkasının categories.id'sini OKUMAYI zaten engelliyor; yazmak
-- için UUID tahmin etmek gerekir ve o durumda bile veri sızmaz —
-- kategori adı okunamaz, görev yalnızca görünmeyen bir kimliğe
-- bağlanır.
-- ═══════════════════════════════════════════════════════════════════

alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy categories_insert on public.categories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy categories_update on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy categories_delete on public.categories
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.plan_goals enable row level security;

create policy plan_goals_select on public.plan_goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plan_goals_insert on public.plan_goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy plan_goals_update on public.plan_goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy plan_goals_delete on public.plan_goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 6. Trigger'lar
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` de aynı yerden bakılır.

create trigger categories_stamp_user_id
  before insert on public.categories
  for each row execute function public.stamp_user_id();

create trigger categories_touch_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

create trigger plan_goals_stamp_user_id
  before insert on public.plan_goals
  for each row execute function public.stamp_user_id();

create trigger plan_goals_touch_updated_at
  before update on public.plan_goals
  for each row execute function public.touch_updated_at();
