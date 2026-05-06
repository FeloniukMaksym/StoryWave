# StoryWave — Roadmap

Поетапний план реалізації. Кожен етап завершується станом, у якому додаток можна реально використовувати (хай і вузько). Естімейти — у вечорах ~2 год.

Легенда: `[ ]` — не зроблено, `[x]` — зроблено, `[~]` — у роботі.

---

## Етап 0 — Підготовка інфраструктури *(0.5 вечора)*

Все що треба зробити **зовні** перш ніж писати код.

- [x] Створити Google Cloud проект "StoryWave"
- [x] Увімкнути Drive API в GCP
- [x] Налаштувати OAuth consent screen (External, додати свій email як test user)
- [x] Створити OAuth 2.0 Client ID типу "Web application"
- [x] Створити проект на Supabase
- [x] Підключити Google як auth provider у Supabase, вставити Client ID + Secret
- [x] Додати scope `https://www.googleapis.com/auth/drive.readonly` у Supabase Google provider
- [x] Зберегти Supabase URL + anon key для `.env.local`

**Definition of done:** є GCP проект з OAuth client, Supabase проект з налаштованим Google провайдером.

---

## Етап 1 — Кістяк додатку *(1–2 вечори)*

Додаток який можна запустити локально, увійти через Google і побачити свій email.

### Налаштування проекту
- [x] `npm create vite@latest` — React + TypeScript template
- [x] Встановити залежності: `@mui/material @emotion/react @emotion/styled @mui/icons-material`
- [x] Встановити: `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-router-dom`
- [x] Налаштувати ESLint + Prettier (мінімально, рекомендовані Vite preset)
- [x] Створити `.env.local` з `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [x] Додати `.env.local` в `.gitignore`

### Базова структура
- [x] Створити структуру папок з `ARCHITECTURE.md` §9
- [x] `src/lib/supabase.ts` — створення клієнта
- [x] `src/app/providers.tsx` — MUI ThemeProvider, QueryClientProvider, BrowserRouter
- [x] `src/app/theme.ts` — темна тема MUI з base config
- [x] `src/app/router.tsx` — routes: `/`, `/sign-in`, `/library`, `/browse`, `/player/:bookId`

### Auth
- [x] `features/auth/SignInPage.tsx` — кнопка "Sign in with Google"
- [x] `features/auth/useAuth.ts` — hook з `session`, `user`, `signIn`, `signOut`
- [x] `features/auth/AuthGuard.tsx` — обгортка для приватних маршрутів
- [x] Перевірити що після sign-in у session є `provider_token` (Google access token)

### Definition of done
Запускаю `npm run dev` → відкриваю → бачу sign-in → входжу через Google → бачу свій email і кнопку "Sign out".

---

## Етап 2 — Drive browser *(1 вечір)*

Можна навігувати по своєму Google Drive і бачити папки + аудіофайли.

- [x] `lib/drive.ts` — функції `listFolder(folderId)`, `getFile(fileId)` з Bearer auth
- [x] Inteceptor / wrapper щоб брати свіжий `provider_token` з Supabase session
- [x] `features/drive-browser/useDrive.ts` — TanStack Query хуки `useFolderContents(folderId)`
- [x] `features/drive-browser/DriveBrowserPage.tsx` — список вмісту з MUI `List`
- [x] Навігація вглиб (тап на папку → роутимо на `/browse?folderId=...`)
- [x] Breadcrumb навгорі (`Home / Audiobooks / Sapkowski`)
- [x] Іконки: папка vs файл (MUI icons)
- [x] Loading state (Skeleton), empty state, error state
- [x] Кнопка "Use this folder as book" — поки що просто `console.log(folderId)`

### Definition of done
Заходжу через `/browse`, бачу корінь Drive, можу клікати в папки, бачу аудіофайли. Все mobile-first, на телефоні виглядає нормально.

---

## Етап 3 — Плеєр одного файлу *(1–2 вечори)*

Вибираю файл — він грає. Базові контроли. Без Supabase синку.

### Audio core
- [x] `features/player/usePlayerStore.ts` — Zustand store: `currentFileId`, `playlist`, `isPlaying`, `position`, `duration`, `playbackRate`, `actions`
- [x] `features/player/useAudioElement.ts` — створює і керує `<audio>` через ref
- [x] Завантаження файлу через Drive API → `blob` → `URL.createObjectURL` → `audio.src`
- [x] Cleanup: `revokeObjectURL` при зміні файлу
- [x] Loading state поки blob качається

### Контроли
- [x] `PlayerControls.tsx`: Play/Pause кнопка (велика, центральна)
- [x] Skip ±30s кнопки
- [x] Previous/Next track (поки disabled)
- [x] `ProgressBar.tsx` з MUI `Slider` — drag для seek
- [x] Display: поточний час / тривалість (mm:ss)
- [x] Switcher швидкості (0.75x – 2x)

### Тимчасове збереження
- [x] Зберігати позицію в `localStorage` на `pause`/`ended`/`beforeunload`
- [x] При відкритті того ж файлу — піднімати позицію з `localStorage`

### Definition of done
Заходжу в папку через browser → тапаю на файл → завантажується → грає → можу паузити, скрабити, міняти швидкість, скіпати ±30с. Закриваю вкладку, повертаюсь — продовжую з тієї ж секунди.

---

## Етап 4 — Supabase синк *(1–2 вечори)*

Це момент коли додаток стає твоїм — позиція синкається між пристроями.

### Schema
- [x] У Supabase SQL editor створити таблиці `books`, `playback_positions`, `current_session` (SQL з ARCHITECTURE §5)
- [x] Створити індекси
- [x] Увімкнути RLS і політики (SQL з ARCHITECTURE §5)
- [x] Перевірити RLS вручну (спробувати select без auth — має повернути порожньо)

### Запис позиції
- [x] `features/sync/usePositionSync.ts` — debounced (5с) write до Supabase під час відтворення
- [x] Flush на події: `pause`, `ended`, `seeked`, `visibilitychange → hidden`, `beforeunload`
- [x] Локальний `localStorage` дублікат (миттєвий, на кожен `timeupdate`)
- [x] Оновлення `current_session` при старті відтворення нового файлу
- [x] Оновлення `books.last_played_at`

### Resume логіка
- [x] `features/sync/useSessionResume.ts` — на app mount читає `current_session`
- [x] При `window focus` / `visibilitychange → visible` — refetch позиції з Supabase
- [x] Порівняння локальної vs серверної `updated_at` — newer wins
- [x] Стрибаємо плеєр на потрібну секунду, не автограємо (browser policy)

### Definition of done
Слухаю на ПК. Закриваю. Відкриваю на телефоні через хвилину. Бачу "Continue listening", тапаю — одразу та сама секунда (±5с). Тапаю play — продовжую. Закриваю на телефоні, повертаюсь до ПК — теж усе синкнулось.

---

## Етап 5 — Бібліотека книг *(1 вечір)*

`/library` — список збережених книг + "Продовжити слухати".

- [x] Кнопка "Use this folder as book" у Drive browser реально створює запис у `books`
- [x] Захист від дублікатів (unique constraint на `user_id + drive_folder_id`)
- [x] `features/library/useBooks.ts` — TanStack Query хуки `useBooks()`, `useDeleteBook()`
- [x] `features/library/LibraryPage.tsx`:
  - [x] Великий блок "Continue listening" зверху (з `current_session` + позицією)
  - [x] Прогрес-бар на картці "Continue listening"
  - [x] Сітка/список усіх книг, відсортованих за `last_played_at desc`
  - [x] Empty state ("Add your first book from Drive")
  - [x] CTA "Add book" → переходить на `/browse`
- [x] Long-press / context menu → "Remove book" (в БД, файли на Drive не чіпаємо)
- [x] Тап на книгу → `/player/:bookId`

### Definition of done
Маю на бібліотеці 2-3 книги, можу свайпати між ними, вибрати, продовжити. Видалити книгу зі списку (без видалення файлів).

---

## Етап 6 — Auto-advance і повноцінний плейлист *(0.5–1 вечір)*

Закінчився файл — наступний почав грати сам.

- [ ] При відкритті книги — підвантажуємо повний список файлів папки і кладемо в `playlist`
- [ ] Сортування файлів за `name` (lexical)
- [ ] На `ended` — `position = 0`, переходимо на наступний файл, автограємо (тут autoplay дозволено бо є user gesture в межах сесії)
- [ ] Previous/Next кнопки активні, працюють
- [ ] UI: список файлів книги (collapsible) на `PlayerPage`, тап на файл → перехід
- [ ] Якщо в `playback_positions` є запис для файлу — стартує з нього, інакше з 0
- [ ] Якщо це останній файл і він закінчився — pause + повідомлення "Book finished"

### Definition of done
Запускаю книгу з 10 файлів. Слухаю першу главу. На `ended` — без моєї участі продовжує другу главу з 0с. Можу тапнути "next" і пропустити главу.

---

## Етап 7 — Media Session API *(0.5 вечора)*

Lock-screen контроли і Bluetooth-навушники.

- [ ] `features/player/useMediaSession.ts` — реєстрація metadata + handlers
- [ ] Метадані: title (назва файлу), artist (назва книги), artwork (default іконка)
- [ ] Handlers: play, pause, seekbackward (30с), seekforward (30с), previoustrack, nexttrack
- [ ] Перевірити на Android Chrome (lock screen), iOS Safari (control center), на ноуті — медіа-клавіші
- [ ] Display playback state на lock screen синхронізований з реальним станом

### Definition of done
Заблокував телефон під час прослуховування — на lock-screen бачу обкладинку додатку, назву, кнопки play/pause/skip. Натискаю play на BT-навушниках — додаток грає. Ставлю на паузу з lock-screen — додаток паузить.

---

## Етап 8 — PWA *(0.5 вечора)*

Можна встановити на домашній екран телефону.

- [ ] `npm install -D vite-plugin-pwa`
- [ ] Налаштувати `vite.config.ts` з PWA plugin
- [ ] Створити іконки: 192x192, 512x512, maskable (можна у https://maskable.app)
- [ ] `manifest.webmanifest`: name "StoryWave", short_name "StoryWave", display "standalone", theme_color, background_color
- [ ] Service worker: precache shell, runtime cache для статики (НЕ для Drive файлів)
- [ ] Перевірити Lighthouse PWA audit ≥ 90
- [ ] Встановити на телефон, перевірити що відкривається без браузерної рамки

### Definition of done
На телефоні відкриваю додаток у Chrome → "Add to home screen" → запускається як standalone додаток без UI браузера.

---

## Етап 9 — Поліровка плеєра (post-MVP, по бажанню)

Не критично для MVP, але різко покращує досвід.

### Sleep timer
- [ ] UI: dropdown зі значеннями 5/10/15/30/45/60 хв + "End of chapter"
- [ ] Логіка: запам'ятовує deadline, на кожен `timeupdate` перевіряє, fade-out 5с і pause

### Покращення UX
- [ ] Skip silence (детекція тиші — або просто збільшення швидкості на тиші)
- [ ] Bookmarks: можу поставити закладку в певному місці, повернутись пізніше
- [ ] Display chapters з ID3 тегів (через `jsmediatags`)
- [ ] Cover art з ID3 тегів — використати в Media Session і UI

### Якість життя
- [ ] Error boundary з нормальним fallback
- [ ] Toast notifications (MUI Snackbar) для помилок Drive/Supabase
- [ ] Skeletons замість spinner-ів
- [ ] Анімації переходів (`framer-motion`?)
- [ ] Keyboard shortcuts на десктопі (space, arrow left/right)

---

## Парковка (потенційно колись)

- Streaming через service worker з `Range` requests (якщо blob-завантаження стане боляче).
- Офлайн режим через Cache API + IndexedDB.
- Шерінг прогресу з близькими (поки не треба).
- Власний бекенд на .NET (якщо з'явиться логіка яку Supabase не покриє).
- Тести (Vitest + Playwright).
- CI/CD + автодеплой на Vercel/Netlify.

---

## Поточний фокус

> **Етап 5 завершено.** Далі — Етап 6 (Auto-advance і повноцінний плейлист).
