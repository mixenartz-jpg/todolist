-- ═══════════════════════════════════════════════════════════════════
-- 0011 — HAFTALIK HEDEFLER
-- ═══════════════════════════════════════════════════════════════════
--
-- Planlama'nın hedef ölçekleri arasında bir boşluk vardı:
--
--   plan_goals   : AY ölçeği — "bu ay 30 deneme çöz"
--   (yok)        : HAFTA ölçeği
--   tasks.date   : GÜN ölçeği — tek bir iş
--
-- Ay çok uzak, gün çok yakın. "Bu hafta üç bölüm bitir" ne aylık bir
-- odaktır ne de tek bir görev; haftanın başında yazılan, hafta boyunca
-- işaretlenen ara ölçektir. Kullanıcı bunu aylık hedefe sıkıştırmak
-- zorunda kalıyordu ve o zaman ay sonunda "hangi hafta neyi
-- bitirmiştim" bilgisi kayboluyordu.
--
-- ── Neden plan_goals'a bir `scale` sütunu değil? ──
-- İki ölçeğin ÇAPASI farklı: aylık hedef ayın 1'ine, haftalık hedef
-- pazartesiye sabitlenir. Tek tabloda tutmak `month` sütununun bazen
-- ay başı bazen pazartesi olması demekti — 0008'in kanonik temsil
-- kısıtı (`extract(day from month) = 1`) o an çöker ve iki ölçek
-- birbirinin sorgusuna sızardı. İki tablo, iki kısıt, iki index.
--
-- ── Neden month_plans'ın yerine? ──
-- month_plans (0009/0010) aya bağlı serbest not kartlarıydı: yazılıyor
-- ama ÖLÇÜLMÜYORDU. Takip edilebilir bir şey üretmediği için
-- kaldırıldı (0012); yerini bu tablo aldı.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.week_goals (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Hedefin ait olduğu hafta, ISO PAZARTESİSİNE sabitlenmiş bir `date`.
  --
  -- Kısıt, plan_goals.month'un `extract(day from month) = 1` kısıtıyla
  -- birebir aynı işi yapar (gerekçesi 0008:123-131'de uzun uzun yazılı):
  -- `date` tipi tek başına '2026-08-13' kabul eder ve o zaman aynı
  -- hafta için birden çok anahtar doğar; "bu haftanın hedefleri"
  -- sorgusu onları farklı haftalar sanardı.
  --
  -- `isodow` seçildi çünkü uygulama tarafında haftayı
  -- `startOfIsoWeek()` üretiyor (src/lib/date/date.ts) ve o da
  -- pazartesi tabanlı. `dow` kullanmak pazar tabanlı olurdu ve iki
  -- katman farklı hafta başlangıcı konuşurdu.
  week_start date not null check (extract(isodow from week_start) = 1),

  title   text not null check (length(trim(title)) between 1 and 120),

  -- plan_goals.note ile aynı gerekçe: ayrıntı zorunlu değil, çünkü
  -- bazı hedeflerin başlığı zaten tam cümledir.
  note    text check (note is null or length(note) <= 2000),

  -- Sayısal hedef ("3 bölüm"), İSTEĞE BAĞLI.
  --
  -- plan_goals'tan bir fark var: orada `null` "ilerleme bağlı
  -- görevlerden okunur" demekti. Burada haftalık hedefe görev
  -- BAĞLANMIYOR (tasks.goal_id yalnızca plan_goals'a bakar), bu yüzden
  -- `null` sadece "sayaçsız hedef" demektir — tamamlanma yalnızca
  -- completed_at ile, elle işaretlenerek olur.
  target_count integer check (target_count is null or target_count between 1 and 9999),

  done_count   integer not null default 0 check (done_count >= 0),

  -- categories / plan_goals ile AYNI palet (src/lib/ui/colors.ts).
  color_slot smallint not null default 0 check (color_slot between 0 and 7),

  sort_order integer not null default 0,

  -- Hedefin tamamlandığı an.
  --
  -- plan_goals'ın `archived_at`'inden farklı bir şeydir ve bilerek öyle
  -- adlandırıldı: arşiv "bunu artık takip etmiyorum" (vazgeçme),
  -- tamamlanma "bunu bitirdim" (başarı). Haftalık hedefte istenen
  -- ikincisi — kullanıcı hafta sonunda neyi bitirdiğini görmek
  -- istiyor, dolayısıyla tamamlanan hedef LİSTEDE KALIR, yalnızca
  -- üstü çizili görünür. Bu yüzden arşiv sütunu YOK.
  --
  -- `boolean` değil `timestamptz`: "ne zaman bitti" bilgisi bedavaya
  -- gelir ve ileride haftalık özet istenirse veri zaten oradadır.
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.week_goals is
  'Haftalık hedef kalemleri. Hafta, ISO pazartesisine sabitlenmiş bir date ile temsil edilir.';
comment on column public.week_goals.week_start is
  'Hedefin haftası, ISO pazartesisine sabitlenmiş. Kısıt kanonik temsili garanti eder.';
comment on column public.week_goals.target_count is
  'İsteğe bağlı sayısal hedef. null → sayaçsız; tamamlanma yalnızca elle işaretlenir.';
comment on column public.week_goals.completed_at is
  'Hedefin tamamlandığı an. plan_goals.archived_at''ten farklıdır: vazgeçme değil, bitirme.';

-- Ekranın tek sorgu şekli: "bu kullanıcının şu haftaki hedefleri, kendi
-- sırasıyla". `week_start desc` çünkü kullanıcı en çok güncel haftaya
-- bakar (plan_goals_user_month_idx ile aynı şekil).
create index if not exists week_goals_user_week_idx
  on public.week_goals (user_id, week_start desc, sort_order);

-- `unique` kısıtı YOK — plan_goals'taki (0008:191-195) gerekçenin
-- aynısı: aynı hafta için birden çok hedef normal durumdur.


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════

alter table public.week_goals enable row level security;

create policy week_goals_select on public.week_goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy week_goals_insert on public.week_goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy week_goals_update on public.week_goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy week_goals_delete on public.week_goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- Trigger'lar
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` de aynı yerden bakılır.

create trigger week_goals_stamp_user_id
  before insert on public.week_goals
  for each row execute function public.stamp_user_id();

create trigger week_goals_touch_updated_at
  before update on public.week_goals
  for each row execute function public.touch_updated_at();
