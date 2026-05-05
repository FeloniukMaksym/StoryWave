# StoryWave — Architecture

Особистий аудіоплеєр для книг, що зберігаються на Google Drive. Mobile-first веб-додаток з синхронізацією позиції прослуховування між пристроями.

---

## 1. Цілі та обмеження

### Цілі
- Слухати аудіокниги з власного Google Drive у зручному плеєрі.
- Безшовне перемикання між пристроями (ПК ↔ телефон) без ручного пошуку секунди.
- Mobile-first UX, у перспективі — встановлення як PWA на телефон.
- Мінімум інфраструктури: жодного власного бекенду на старті.

### Не-цілі (поки що)
- Офлайн-прослуховування.
- Одночасне прослуховування на двох пристроях.
- Багатокористувацький режим / шерінг.
- Окремий бекенд на .NET (відкладено; можливо ніколи).

### Ключові припущення
- Користувач — одна людина (автор), яка слухає одну книгу за раз.
- Файли вже впорядковані на Drive у папках (одна папка = одна книга).
- Назви файлів сортуються лексикографічно у правильному порядку (`01.mp3`, `02.mp3`, ...).
- Розмір окремого файлу — типово 10–80 МБ (одна глава або частина).

---

## 2. Стек

| Шар | Технологія | Чому |
|---|---|---|
| Build | **Vite** | Швидкий dev-сервер, мінімум конфігурації. |
| UI framework | **React 18 + TypeScript** | Звичний стек, типізація, зрілий ecosystem. |
| UI kit | **MUI (Material UI)** | За уподобанням користувача; багатий, mobile-friendly з коробки. |
| State (UI) | **Zustand** | Легкий, без boilerplate; для глобального стану плеєра й сесії. |
| Server state | **TanStack Query** | Кеш Drive API запитів, retry, refetch on focus. |
| Routing | **React Router** | Стандарт. |
| Auth + DB | **Supabase** | Google OAuth з кастомними scopes, Postgres з RLS, безкоштовний tier. |
| Drive API | **googleapis REST v3** напряму через `fetch` | Не потрібен SDK на фронті. |
| Player | Нативний `<audio>` + **Media Session API** | Lock-screen контроли, метадані треку. |
| PWA | `vite-plugin-pwa` (на пізнішому етапі) | Manifest + service worker без ручного налаштування. |

### Чому без власного бекенду
Уся серверна логіка — це OAuth callback і CRUD по позиціях. Supabase покриває це через Auth + Postgres + RLS без коду на сервері. Якщо в майбутньому з'явиться потреба в логіці яку не можна виконати на клієнті (напр. серверна обробка ID3 тегів) — додамо Supabase Edge Functions або окремий .NET сервіс.

---

## 3. Високорівнева схема

```
┌──────────────────────────────────────────────────────────┐
│                    React PWA (browser)                    │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐ │
│  │   Pages    │  │   Player   │  │   Sync engine       │ │
│  │ (library,  │◄─┤  (<audio>, │◄─┤ (debounced writes,  │ │
│  │  browser,  │  │   Media    │  │  read-on-focus)     │ │
│  │   player)  │  │   Session) │  │                     │ │
│  └─────┬──────┘  └──────┬─────┘  └──────────┬──────────┘ │
│        │                │                    │             │
│        ▼                ▼                    ▼             │
│   ┌─────────────────────────────────────────────────┐    │
│   │  TanStack Query  +  Zustand stores              │    │
│   └────────┬─────────────────────────────┬──────────┘    │
└────────────┼─────────────────────────────┼───────────────┘
             │                              │
             ▼                              ▼
   ┌──────────────────┐         ┌──────────────────────┐
   │ Google Drive API │         │      Supabase        │
   │  (files.list,    │         │  Auth (Google OAuth) │
   │   files get      │         │  Postgres (RLS)      │
   │   alt=media)     │         │   - books            │
   │                  │         │   - playback_pos.    │
   │                  │         │   - current_session  │
   └──────────────────┘         └──────────────────────┘
```

**Потоки даних:**
1. **Auth**: Supabase Auth → Google OAuth → отримуємо Supabase session + Google `provider_token` (Drive access token).
2. **Browse Drive**: фронт → Drive API (з Google access token) → список папок/файлів.
3. **Play**: фронт завантажує файл через Drive API як blob → `<audio>` грає з `blob:` URL.
4. **Sync**: фронт пише позицію в Supabase кожні 5с (debounced) + на події `pause`/`ended`/`beforeunload`. На іншому пристрої — читає при focus.

---

## 4. Auth і Google scopes

### OAuth flow
- Supabase налаштований з Google як external provider.
- При логіні запитуємо scope `https://www.googleapis.com/auth/drive.readonly` (read-only — нам не треба нічого писати на Drive).
- Supabase зберігає `provider_token` (Google access token) і `provider_refresh_token` у session.
- Access token живе 1 годину; коли протухає — Supabase автоматично рефрешить через `refresh_token`, нам треба лише читати актуальний токен з `supabase.auth.getSession()` перед кожним викликом Drive API (TanStack Query це робить прозоро через axios/fetch interceptor).

### Google Cloud налаштування (one-time)
1. Створити GCP проект.
2. Увімкнути Drive API.
3. OAuth consent screen: External, додати свій email як test user (поки не потрібен публічний реліз).
4. Створити OAuth 2.0 Client ID типу "Web application", додати redirect URI з Supabase.
5. Заповнити Client ID + Secret у Supabase → Authentication → Providers → Google.
6. У Supabase налаштувати додатковий scope `drive.readonly`.

---

## 5. Модель даних (Supabase Postgres)

### Таблиці

```sql
-- Книги (= папки на Drive, які користувач "відкрив")
create table books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  drive_folder_id text not null,
  title           text not null,
  cover_url       text,
  created_at      timestamptz not null default now(),
  last_played_at  timestamptz,
  unique (user_id, drive_folder_id)
);

create index books_user_last_played_idx
  on books (user_id, last_played_at desc nulls last);

-- Позиція в кожному файлі книги
create table playback_positions (
  book_id          uuid not null references books(id) on delete cascade,
  drive_file_id    text not null,
  position_seconds double precision not null default 0,
  duration_seconds double precision,
  updated_at       timestamptz not null default now(),
  primary key (book_id, drive_file_id)
);

-- Активна сесія користувача (одна на user)
create table current_session (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  book_id       uuid references books(id) on delete set null,
  drive_file_id text,
  updated_at    timestamptz not null default now()
);
```

### Row-Level Security
Усі три таблиці — RLS увімкнено, політика: `auth.uid() = user_id` (для `playback_positions` — через `book_id` join). Користувач бачить тільки свої записи.

```sql
alter table books enable row level security;
create policy books_owner on books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table current_session enable row level security;
create policy session_owner on current_session
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table playback_positions enable row level security;
create policy positions_owner on playback_positions
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
```

---

## 6. Синхронізація позиції

### Стратегія: last-write-wins з debouncing

**Запис позиції під час відтворення:**
- Локально в `localStorage` — миттєво, на кожен `timeupdate` (раз на ~250 мс).
- В Supabase — debounced до 5 секунд + flush на події: `pause`, `ended`, `seeked`, `visibilitychange → hidden`, `beforeunload`.

**Чому 5 секунд:** компроміс між точністю синку (втратимо max 5с при vbrowser crash) і кількістю записів (1 запит на 5с = ~720/година — комфортно для безкоштовного Supabase tier).

**Resume логіка при відкритті додатку / focus на вкладку:**
1. Читаємо `current_session` з Supabase.
2. Якщо є активна `book_id + drive_file_id` — читаємо `playback_positions` для цього файлу.
3. Порівнюємо `updated_at` сервера з локальним `localStorage` — беремо новіший.
4. Стрибаємо на `position_seconds`, ставимо плеєр у pause (не автоплей — потребує user gesture у браузерах).

**Конфлікт двох пристроїв:** оскільки слухаємо на одному за раз — конфлікту нема. Якщо все ж відкрив на двох вкладках — last-write-wins, і це прийнятно для особистого додатку. Не будуємо CRDT.

---

## 7. Інтеграція з Google Drive

### Які виклики робимо
- `GET /drive/v3/files?q='{folderId}' in parents and (mimeType contains 'audio/' or mimeType='application/vnd.google-apps.folder')&fields=files(id,name,mimeType,size,modifiedTime,imageMediaMetadata)` — список вмісту папки.
- `GET /drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and 'root' in parents` — корінь Drive (стартова точка browser-а).
- `GET /drive/v3/files/{fileId}?alt=media` — завантажити файл (стрім).

### Стрімінг файлів — як обійти обмеження `<audio>`
**Проблема:** `<audio src="https://...">` не дозволяє додати `Authorization: Bearer` header.

**Рішення для MVP:** завантажити файл цілком як blob:
```ts
const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
audioEl.src = url;
```
- Файл 30–80 МБ завантажується за 5–15с на нормальному інтернеті.
- Прийнятно як перший крок; можна почати грати з `progressive`-blob через `MediaSource` пізніше якщо стане проблемою.
- Не забути `URL.revokeObjectURL` при зміні файлу.

**Рішення для майбутнього (якщо стане проблемою):** Service worker, який перехоплює запити на спеціальний шлях типу `/_drive/{fileId}`, додає Bearer header і робить `Range`-aware fetch до Drive. Тоді `<audio>` отримує справжній streaming з seek без повного завантаження. Робимо це **тільки** якщо MVP-підхід не задовольнить.

### Кеш метаданих
- TanStack Query кешує список файлів папки на 5 хвилин — навігація туди-сюди не б'є по Drive API.
- Refetch on window focus — щоб побачити свіжо додані файли.

---

## 8. Плеєр

### Компонент `Player`
- Один глобальний `<audio>` елемент у React дереві (через `useRef`).
- Zustand store `usePlayerStore` тримає: `currentBookId`, `currentFileId`, `playlist` (масив файлів папки), `isPlaying`, `position`, `duration`, `playbackRate`.
- React-компонент-плеєр читає зі стору і рендерить контроли.

### Контроли (MVP)
- Play/Pause (space на десктопі).
- Scrub (drag по progress bar).
- Skip ±30s (стандарт жанру).
- Швидкість 0.75x / 1x / 1.25x / 1.5x / 1.75x / 2x.
- Previous/Next track у межах папки.
- Auto-advance: на `ended` → наступний файл у папці, позиція 0.

### Media Session API
Реєструємо метадані і handlers, щоб lock-screen / Bluetooth-навушники / медіа-клавіші на клавіатурі працювали:
```ts
navigator.mediaSession.metadata = new MediaMetadata({
  title: fileName,
  artist: bookTitle,
  artwork: [{ src: coverUrl, sizes: '512x512' }]
});
navigator.mediaSession.setActionHandler('play', () => play());
navigator.mediaSession.setActionHandler('pause', () => pause());
navigator.mediaSession.setActionHandler('seekbackward', () => skip(-30));
navigator.mediaSession.setActionHandler('seekforward', () => skip(30));
navigator.mediaSession.setActionHandler('previoustrack', () => prev());
navigator.mediaSession.setActionHandler('nexttrack', () => next());
```

---

## 9. Структура проекту

```
StoryWave/
├── docs/
│   ├── ARCHITECTURE.md            ← цей файл
│   └── ROADMAP.md                 ← етапи і задачі
├── public/
│   └── icons/                     (для PWA пізніше)
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx          (MUI ThemeProvider, QueryClient, AuthProvider)
│   │   └── theme.ts               (MUI кастомна тема, mobile-first breakpoints)
│   ├── features/
│   │   ├── auth/
│   │   │   ├── SignInPage.tsx
│   │   │   ├── useAuth.ts
│   │   │   └── AuthGuard.tsx
│   │   ├── library/
│   │   │   ├── LibraryPage.tsx     (список збережених книг + "продовжити")
│   │   │   └── useBooks.ts
│   │   ├── drive-browser/
│   │   │   ├── DriveBrowserPage.tsx
│   │   │   ├── FolderItem.tsx
│   │   │   └── useDrive.ts
│   │   ├── player/
│   │   │   ├── PlayerPage.tsx
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── usePlayerStore.ts   (zustand)
│   │   │   ├── useAudioElement.ts  (керування <audio>)
│   │   │   └── useMediaSession.ts
│   │   └── sync/
│   │       ├── usePositionSync.ts
│   │       └── useSessionResume.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── drive.ts                (обгортки над Drive API)
│   │   └── queryClient.ts
│   ├── components/
│   │   └── (загальні UI-компоненти, якщо знадобляться поверх MUI)
│   ├── types/
│   │   └── domain.ts               (Book, PlaybackPosition, DriveFile, ...)
│   └── main.tsx
├── .env.local                      (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 10. UX-флоу (mobile-first)

### Перший вхід
1. Splash → кнопка "Sign in with Google".
2. OAuth consent (Google запитує дозвіл на читання Drive).
3. Редірект назад → порожня бібліотека → CTA "Add book from Drive".

### Додавання книги
1. Тап на "Add book" → Drive browser (список папок).
2. Можна заходити вглиб папок (breadcrumb навгорі).
3. На папці з аудіофайлами — кнопка "Use this folder as book".
4. Після підтвердження — створюється `book` у Supabase, користувача кидає на `PlayerPage` для цієї книги.

### Прослуховування
1. На `PlayerPage` — список файлів папки (collapsible) + великий плеєр внизу.
2. Тап на файл — починає грати з 0 (або з збереженої позиції якщо є).
3. Closing вкладки / pause → flush позиції в Supabase.

### Resume на іншому пристрої
1. Відкриваєш додаток.
2. На `LibraryPage` бачиш картку "Continue listening" з останньою книгою + назвою файлу + прогрес-баром.
3. Тап → одразу `PlayerPage`, плеєр на потрібній секунді, чекає на тап `play` (browser autoplay restriction).

---

## 11. Тема та брейкпоінти MUI

- Базовий брейкпоінт — мобільний (xs). Десктоп-стилі додаються через `theme.breakpoints.up('md')`.
- Темна тема за замовчуванням (типово для аудіо-додатків, легше для очей).
- Великі тач-цілі: контроли плеєра ≥ 56px height.
- `theme.palette.primary` — спокійний колір (синій або teal); CTA не повинен кричати, бо додаток для довгих сесій.

---

## 12. Невирішені питання / парковка

- **Швидкість Drive API на великих папках** (>200 файлів). Якщо стане проблемою — додамо пагінацію і віртуалізацію списку.
- **ID3 теги для обкладинок і назв глав.** Потребує `jsmediatags` або власного парсингу. Відкладено до пост-MVP.
- **Sleep timer.** Стандарт жанру. Додамо після MVP.
- **Bookmarks / нотатки.** Поки не потрібно — можна додати таблицю `bookmarks` пізніше.
- **PWA install prompt.** Налаштуємо коли з'явиться вирішене відчуття "хочу на телефон".

---

## 13. Безпека і приватність

- Supabase anon key безпечно тримати у фронті — RLS захищає дані.
- Google access token живе тільки в пам'яті Supabase session (sessionStorage за замовчуванням); refresh token зберігається в Supabase і не доступний фронту після initial sign-in.
- Drive scope — `readonly`, додаток фізично не може нічого видалити чи змінити на Drive.
- Жодних third-party аналітик, трекерів, телеметрії на старті.

---

## 14. Відмови від функціоналу які зекономили час

| Що відкинули | Чому |
|---|---|
| Власний бекенд на .NET | Supabase покриває все що треба для MVP. |
| Офлайн-режим | Користувач сказав не треба. Економія: ~5–7 вечорів. |
| MediaSource Extensions / streaming через SW | MVP-підхід через blob достатньо. |
| Багатокористувацький режим | Особистий додаток. |
| Realtime sync через WebSocket | Polling on focus достатньо для одного користувача. |
| Тести (юніт/E2E) на старті | Особистий проект, додамо коли стане боляче. |
