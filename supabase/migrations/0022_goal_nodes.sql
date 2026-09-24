-- ═══════════════════════════════════════════════════════════════════
-- 0022 — HEDEF AĞACI
--
-- BİR KEZ ÇALIŞTIRIN. `add column` kullanır; ikinci çalıştırma
-- "already exists" hatası verir (0001–0021 de böyledir).
--
-- ── Hangi boşluk? ──
-- Hedefler bugüne kadar TEK KATMANDI:
--
--   plan_goals   "Kimya'yı bitireceğim"     ← dilek
--   week_goals   "bu hafta 3 bölüm"          ← aylığı GRUPLAR (0014)
--   tasks        "asit sorularını çöz"       ← tek iş
--
-- Arada duran şey yoktu: bir hedefi KONULARA, konuları ALT KONULARA
-- ayırıp o kalemleri günlere paylaştırmak. Kullanıcı bunu kafasında
-- yapıyor, uygulamaya yazamıyordu; hedef "Kimya'yı bitireceğim" diye
-- yazılıp orada kalıyor, hangi konunun bittiği hiçbir yerde
-- görünmüyordu.
--
-- Bu tablo o ara katmanı getirir ve hedefi YÜRÜTÜLEBİLİR bir plana
-- çevirir:
--
--   Kimya (plan_goals)
--   ├─ Asitler-Bazlar            (goal_nodes, depth 1)
--   │  ├─ Konu anlatımı izle     (goal_nodes, depth 2)
--   │  └─ Soru bankası 50 soru   (goal_nodes, depth 2)
--   │     └─ 12 Eki · 25 soru    (tasks, node_id ile bağlı)
--   └─ Tepkimeler                (goal_nodes, depth 1)
--
-- ── Neden plan_goals'a `parent_id` eklemek DEĞİL? ──
-- İlk akla gelen buydu ve yanlış olurdu: `month`, `target_count`,
-- `done_count`, `archived_at` sütunlarının hiçbiri bir ALT BAŞLIK için
-- anlamlı değil. "Asitler-Bazlar"ın ayı yoktur — hizmet ettiği hedefin
-- ayı vardır. Tek tabloda tutmak, satırların yarısında yarı sütunun
-- boş ve anlamsız durması demekti; 0011'in "iki ölçeğin çapası
-- farklı" gerekçesinin aynısı, bir seviye derinde.
--
-- Ayrıca mevcut her sorgu (usePlanGoals, goalProgress, GoalCard,
-- PlanGoalStrip) `plan_goals`'ın DÜZ bir liste olduğunu varsayıyor.
-- Ayrı tablo, o varsayımların hiçbirini bozmaz.
--
-- ── Neden serbest metin, `type` sütunu yok? ──
-- "Soru bankası mı deneme mi" ayrımı bir ENUM adayı gibi görünür ve
-- değildir: kullanıcının çalışma biçimleri sınıflandırılabilir bir
-- küme değil ("konu tekrarı", "hoca defterinden geç", "video 2x"),
-- ve sabit bir liste onu kendi diline değil bizim listemize
-- uydurmaya zorlardı. Başlık zaten serbest metin; "Asitler soru
-- bankası 50 soru" tek satırda hem konuyu hem türü hem miktarı
-- söylüyor. Bir tür alanı sonradan istenirse eklenebilir; erken
-- eklenmiş bir enum'u sökmek çok daha pahalıdır.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.goal_nodes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Ağacın ait olduğu aylık hedef. HER SATIRDA dolu, yalnızca köklerde
  -- değil.
  --
  -- ── Neden bu denormalizasyon? ──
  -- Ekranın tek sorgu şekli "şu hedefin BÜTÜN ağacı":
  --
  --   .from("goal_nodes").select("*").eq("plan_goal_id", goalId)
  --
  -- Tek ağ turu, tek indeks taraması, ağacın tamamı. Yalnızca kökler
  -- taşısaydı bu sorgu özyinelemeli CTE isterdi — supabase-js onu
  -- ifade edemez, bir RPC yazmak gerekirdi — ya da seviye seviye N tur
  -- atılırdı. Üç seviyelik bir ağaç için üç bekleme.
  --
  -- Kopyanın ayrışma riski YOK: aşağıdaki depth trigger'ı
  -- `parent.plan_goal_id = new.plan_goal_id` zorunlu kılıyor, yani
  -- farklı hedeflere ait bir ebeveyn-çocuk çifti hiç oluşamıyor.
  --
  -- ── Neden `on delete cascade`? ──
  -- tasks.goal_id'nin `set null`'ından BİLEREK farklı. Hedefi silinmiş
  -- bir ağacın yaşayacağı ekran yok, asılacağı kök yok: "Asitler"
  -- kendi başına yetim bir iş kalemi değil, artık var olmayan bir
  -- planın parçası. `set null` yazılamaz zaten — sütun `not null`,
  -- çünkü hedefsiz düğüm tanımsız bir şey.
  plan_goal_id uuid not null references public.plan_goals (id) on delete cascade,

  -- Üst düğüm. null → hedefin DOĞRUDAN çocuğu (depth 1).
  --
  -- ── Neden `on delete cascade`? ──
  -- Çocuk düğüm, ebeveyni olmadan ANLAMSIZ. `set null` olsaydı silinen
  -- "Asitler"in altındaki "Soru bankası" sessizce bir köke terfi
  -- ederdi — hem kullanıcının kurmadığı bir yapı, hem de `depth`
  -- değişmezi kırılırdı (depth 2 bir satır parent'sız duramaz; check
  -- kısıtı o satıra yapılacak her sonraki güncellemeyi reddederdi).
  --
  -- Bu, `tasks`'ın davranışından farklı ve fark BİLİNÇLİ: görevin
  -- kendi başlığı, `done`'ı, `completed_at`'i var — o bir KAYIT.
  -- Düğüm ise planın bir PARÇASI; parçası olduğu şey gidince o da
  -- gider.
  parent_id uuid references public.goal_nodes (id) on delete cascade,

  -- Ağaçtaki seviye: 1 = hedefin altındaki ilk katman, 3 = en derin.
  --
  -- SUNUCU TÜRETİR, istemci asla göndermez (bkz. stamp_goal_node_depth).
  -- Saklanan bir sütun olması üç şeyi bedavaya veriyor: `aria-level`
  -- bir okuma olur (ağacı yürümek gerekmez), sıralama/filtreleme
  -- mümkün kalır, ve derinlik sınırının reddi tek bir yerde —
  -- aşağıdaki check kısıtında — gerçekleşir.
  --
  -- ── Neden 3? ──
  -- Hedef → konu → alt konu → iş. Kullanıcının kimya örneği tam bu.
  -- Sınırsız derinlik veritabanı için bedava ama arayüzde değil:
  -- mobilde girinti taşar, "şunu şuraya taşı" işlemleri kombinatorik
  -- olarak büyür. Pratikte dördüncü seviye, ikinci seviyeyi yeniden
  -- adlandırmakla aynı işi görüyor.
  depth smallint not null check (depth between 1 and 3),

  -- Serbest metin. `plan_goals.title` 120 karakterle sınırlıyken burası
  -- 200: bir hedef başlığı kısa olur ("Kimya"), bir plan kalemi
  -- olmayabilir ("Asitler ve bazlar — kuvvetli/zayıf ayrımı, soru
  -- bankası 50 soru").
  title text not null check (length(trim(title)) between 1 and 200),

  -- plan_goals.note ile aynı gerekçe ve aynı sınır.
  note text check (note is null or length(note) <= 2000),

  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Doğrudan kendine bağlanma. Aşağıdaki depth trigger'ı bunu zaten
  -- yakalardı (kendi depth'ini kendi depth'i + 1 yapamaz) ama kısıt
  -- daha ucuz ve daha açık: döngünün en basit hâli şemada yazılı
  -- olsun.
  constraint goal_nodes_no_self_parent check (parent_id is null or parent_id <> id)
);

comment on table public.goal_nodes is
  'Aylık hedefin altındaki plan ağacı: konu → alt konu → iş. En fazla 3 seviye. Düğümler günlere GÖREV olarak dağıtılır (tasks.node_id).';
comment on column public.goal_nodes.plan_goal_id is
  'Ağacın ait olduğu aylık hedef. HER satırda dolu (yalnızca köklerde değil): tüm ağaç tek sorguda çekilebilsin diye. Trigger, ebeveynle aynı olmasını garanti eder.';
comment on column public.goal_nodes.parent_id is
  'Üst düğüm. null → hedefin doğrudan çocuğu (depth 1). Silinince çocuklar da silinir: düğüm bir kayıt değil, planın parçası.';
comment on column public.goal_nodes.depth is
  'Ağaçtaki seviye, 1..3. SUNUCU TÜRETİR (stamp_goal_node_depth); istemci göndermez.';

-- Ekranın tek sorgu şekli: "bu hedefin tüm düğümleri". `parent_id nulls
-- first` + `sort_order` sayesinde satırlar zaten EBEVEYNE GÖRE GRUPLU
-- ve kardeş sırasında geliyor — buildGoalTree() ayrıca sıralama
-- yapmak zorunda kalmıyor.
create index if not exists goal_nodes_user_goal_idx
  on public.goal_nodes (user_id, plan_goal_id, parent_id nulls first, sort_order);


-- ═══════════════════════════════════════════════════════════════════
-- tasks.node_id — düğümden doğan görev
-- ═══════════════════════════════════════════════════════════════════
--
-- ── Neden `on delete set null`? ──
-- 0008'in tasks.goal_id / tasks.category_id kararının AYNISI ve aynı
-- gerekçeyle. Görevin kendi `title`'ı, `done`'ı, `completed_at`'i var:
-- o bir KAYIT. `node_id`'yi kaybetmek bir GRUPLAMAYI kaybetmektir,
-- kaydı değil.
--
-- `cascade` olsaydı bir plan başlığını silmek, o başlıktan doğmuş ve
-- kullanıcının GERÇEKTEN TAMAMLADIĞI görevleri de silerdi — geçmişi
-- yeniden yazmak. focus_sessions'ın (0021) `task_title` kopyası burada
-- GEREKMEZ: bir odak oturumu yalnızca "şuna çalıştım" olarak
-- anlamlıdır ve görevi gidince okunamaz hâle gelir; görev ise kendi
-- başına tam bir kayıttır.
--
-- ── Neden hem goal_id hem node_id? ──
-- Düğümden doğan görev İKİSİNİ DE taşır. Böylece GoalCard'ın mevcut
-- çubuğu (goalProgress → tasks.goal_id) sıfır değişiklikle çalışmaya
-- devam eder, ağaç sayfası ise aynı görevlerden daha ince bir kırılım
-- gösterir. Çift sayım yok: ikisi AYNI görev kümesini iki farklı
-- çözünürlükte okuyor, iki ayrı sayaç tutmuyor.
alter table public.tasks
  add column node_id uuid references public.goal_nodes (id) on delete set null;

comment on column public.tasks.node_id is
  'Görevin doğduğu plan düğümü. null → düğümsüz görev (normal durum). Düğüm silinince null''a düşer: görev kaydı korunur.';

-- ── Neden BURADA indeks var, 0008'de yoktu? ──
-- 0008 `goal_id`/`category_id`'ye bilerek indeks koymamıştı: hiçbir
-- sorgu o sütunlarla FİLTRELEMİYOR, useTasks() hepsini çekip bellekte
-- grupluyor. `node_id` için de ilerleme hesabı bellekte yapılıyor —
-- ama ağaç sayfası büyüdükçe "şu düğümün görevleri" doğrudan bir
-- filtre hâline gelir ve tek görev listesi bunu ucuzlatır.
--
-- KISMİ (`where node_id is not null`): görevlerin ezici çoğunluğunun
-- düğümü yok ve onların indekste yer kaplaması, her görev yazımına
-- bedava olmayan bir maliyet eklerdi. 0017'nin
-- tasks_user_completed_idx'iyle aynı biçim.
create index if not exists tasks_node_idx
  on public.tasks (node_id) where node_id is not null;


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════
-- week_goals (0011) ve plan_goals (0008) ile BİREBİR aynı dört policy.
-- Üç kural: `(select auth.uid())` alt sorgu biçimi (InitPlan, bir kez
-- değerlendirilir), `to authenticated` kapsamı, ve insert/update'te
-- `with check` — sahiplik devrini imkânsız kılar.

alter table public.goal_nodes enable row level security;

create policy goal_nodes_select on public.goal_nodes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goal_nodes_insert on public.goal_nodes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy goal_nodes_update on public.goal_nodes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goal_nodes_delete on public.goal_nodes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- tasks.node_id için RLS DEĞİŞMEZ: mevcut tasks policy'leri satırın
-- tamamını kapsar, sütun bazlı değildir (0013/0014 ile aynı).
--
-- FK'nin varlık kontrolünü yükseltilmiş yetkiyle yapması 0014'te uzun
-- uzun tartışıldı ve buraya da aynen geçerli: en kötü sonuç,
-- kullanıcının kendi satırına hiçbir yerde görünmeyen opak bir uuid
-- yazması. Hiçbir şey sızmaz.


-- ═══════════════════════════════════════════════════════════════════
-- Trigger'lar
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────── user_id / updated_at (0003) ─────────────────────

create trigger goal_nodes_stamp_user_id
  before insert on public.goal_nodes
  for each row execute function public.stamp_user_id();

create trigger goal_nodes_touch_updated_at
  before update on public.goal_nodes
  for each row execute function public.touch_updated_at();


-- ──────────────────── depth'i ebeveynden türet ──────────────────────
--
-- ── Neden istemci hesaplamıyor? ──
-- Bu şemadaki her değişmezin bir veritabanı savunması var
-- (`extract(day from month) = 1`, `color_slot between 0 and 7`).
-- Derinlik de öyle olmalı: eski bir sekmeden gelen depth-4 satır,
-- buildGoalTree()'nin ve çizicinin karşılığı olmayan bir düğüm
-- üretirdi.
--
-- ── Neden yalnız check kısıtı yetmiyor? ──
-- Check EBEVEYNİ GÖREMEZ. İstemci `{parent_id: <depth 3 düğüm>,
-- depth: 1}` yazsa kısıt bunu memnuniyetle kabul ederdi. Kısıt gerekli
-- ama yeterli değil: trigger değeri TÜRETİR, kısıt sınırı UYGULAR.
create or replace function public.stamp_goal_node_depth()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_depth smallint;
  parent_goal  uuid;
begin
  if new.parent_id is null then
    new.depth := 1;
    return new;
  end if;

  select n.depth, n.plan_goal_id
    into parent_depth, parent_goal
  from public.goal_nodes n
  where n.id = new.parent_id;

  if parent_depth is null then
    raise exception 'Üst düğüm bulunamadı: %', new.parent_id;
  end if;

  -- Ağaç TEK hedefin içinde kalır. Başka hedefin düğümüne bağlanmak,
  -- ağacı iki hedef arasında bölerdi ve plan_goal_id denormalizasyonu
  -- (yukarıda) o an yalan söylemeye başlardı — "tek sorguda tüm ağaç"
  -- garantisi çöker.
  if parent_goal <> new.plan_goal_id then
    raise exception 'Üst düğüm başka bir hedefe ait';
  end if;

  -- 3'ü aşarsa check kısıtı reddeder. Tek kural, tek yer.
  new.depth := (parent_depth + 1)::smallint;
  return new;
end;
$$;

create trigger goal_nodes_stamp_depth
  before insert or update of parent_id on public.goal_nodes
  for each row execute function public.stamp_goal_node_depth();


-- ───────────── taşınan dalın altındaki depth'leri yay ───────────────
--
-- Yukarıdaki trigger yalnızca TAŞINAN DÜĞÜMÜN KENDİ depth'ini düzeltir.
-- Kullanıcı çocuklu bir dalı taşıyabilsin istedi, yani "Asitler"i
-- altındaki dört kalemle birlikte başka bir başlığın altına
-- sürükleyebilmeli. O zaman torunların depth'i de kaymalı; yoksa
-- ağaçta 1 → 3 gibi seviye atlayan satırlar kalır ve o satırlara
-- yapılacak her sonraki güncelleme check kısıtına takılır.
--
-- ── Sonsuz döngü riski? ── Yok. Özyineleme `parent_id` bağlarını
-- izliyor ve `depth` sınırlı (check 1..3): bir döngü `d = d + k`
-- eşitliğini gerektirir, bu hiçbir sonlu derinlik için sağlanamaz.
-- Doğrudan kendine bağlanmayı goal_nodes_no_self_parent kesiyor.
--
-- ── Neden `n.depth <> s.depth` süzgeci? ── Değişmeyen satıra update
-- atmamak için. Her update touch_updated_at'i tetikler ve gereksiz
-- bir `updated_at` değişikliği, "bu düğüme en son ne zaman
-- dokundum" bilgisini kirletirdi.
create or replace function public.cascade_goal_node_depth()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  with recursive soy as (
    select n.id, n.depth
    from public.goal_nodes n
    where n.id = new.id

    union all

    select c.id, (s.depth + 1)::smallint
    from public.goal_nodes c
    join soy s on c.parent_id = s.id
  )
  update public.goal_nodes n
  set depth = s.depth
  from soy s
  where n.id = s.id
    and n.id <> new.id
    and n.depth <> s.depth;

  return null;
end;
$$;

-- AFTER: kendi depth'i BEFORE trigger'da çoktan yazıldı; özyineleme
-- onun üstüne kuruluyor. `when (old.parent_id is distinct from
-- new.parent_id)` — taşıma dışındaki güncellemeler (yeniden
-- adlandırma, not, sıra) ağacı hiç dolaşmasın.
create trigger goal_nodes_cascade_depth
  after update of parent_id on public.goal_nodes
  for each row
  when (old.parent_id is distinct from new.parent_id)
  execute function public.cascade_goal_node_depth();
