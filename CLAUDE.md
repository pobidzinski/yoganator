# Yoganator — MVP Development Context

## Project

Tracker sesji treningowych jogi. Katalog pozycji ze zdjęciami, planowanie sesji
(pozycje + czas przygotowania + czas trwania), automatyczny przebieg treningu
z sygnałami dźwiękowymi i podtrzymywaniem ekranu (Wake Lock). Dark theme,
mobile-first, dostępne przez przeglądarkę (brak prawdziwego PWA — brak
manifest.json/service workera, tylko "Dodaj do ekranu głównego").

## Tech Stack

React 19 + TypeScript + Vite. Tailwind CSS 3 (utility classes only — no
component library). Zustand 5 (jeden store, bez `persist`). react-router-dom
v7. Supabase (`@supabase/supabase-js`) — **brak auth, brak RLS, single-user,
dostęp przez anon key**. Deploy: Vercel (SPA rewrite only).

## Architecture

```
src/
  components/   Layout.tsx (nav), useSortable.ts (drag reorder)
  hooks/        useKeyboardOffset.ts, useWakeLock.ts
  lib/          supabase.ts (client), audio.ts (Web Audio beep generator), time.ts
  features/
    poses/      Katalog ćwiczeń — PoseList, PoseFormModal (+ upload zdjęcia), PosePicker
    plans/      Planowanie sesji — SessionPlansPage, SessionPlanEditor
    training/   Trening — trainingEngine.ts (czyste funkcje), trainingStore.ts (Zustand),
                TrainingPage/TrainingSelectScreen/TrainingRunnerScreen
```

## Key Business Rules

- Sekwencja treningu: dla każdej pozycji w planie — `prep` (jeśli
  `prep_seconds > 0`) → `hold` → kolejna pozycja. Model w `trainingEngine.ts`
  (`buildSteps`, `advance`, `phaseDurationMs`).
- Timer jest oparty na znacznikach czasu (`phaseEndAt = Date.now() + duration`),
  **nigdy nie dekrementowany** — pozostały czas zawsze liczony jako
  `phaseEndAt - now`. Zero kumulującego się dryfu. `tick()` w `trainingStore.ts`
  ma pętlę catch-up, żeby poprawnie przeskoczyć fazy pominięte podczas
  uśpienia karty w tle.
- Pauza/wznowienie: `pause()` zapisuje `pausedRemainingMs = phaseEndAt - now`;
  `resume()` ustawia nowy `phaseEndAt = now + pausedRemainingMs`. Czas nigdy
  nie jest tracony ani resetowany.
- Dźwięki (`lib/audio.ts`, Web Audio, generowane oscylatorem, bez plików):
  `countdownBeep()` na 3/2/1 sekundzie przed końcem fazy, `transitionTone()`
  przy zmianie fazy, `finishChime()` na koniec planu. `AudioContext` musi być
  odblokowany (`unlockAudio()`) w handlerze kliknięcia Start (polityka
  autoplay iOS/Chrome).
- Wake Lock (`hooks/useWakeLock.ts`): żądany podczas aktywnych faz
  (`prep`/`hold`, nie w pauzie), zwalniany przy pauzie/zakończeniu, ponownie
  żądany po `visibilitychange` (przeglądarka zwalnia lock automatycznie w tle).
- `trainingStore` **celowo bez `persist`** — przerwana sesja nie ma sensownej
  semantyki "wznów po nieznanej przerwie"; reload = restart od wyboru planu.
- Usunięcie pozycji użytej w planie: FK `ON DELETE RESTRICT` — UI łapie błąd
  `23503` i pokazuje komunikat zamiast pozwolić na niespójne dane.

## Database

Tabele: `poses` (name, description, image_url), `session_plans` (name,
description), `session_plan_items` (session_plan_id, pose_id, position,
prep_seconds, hold_seconds). Bucket Storage `pose-images` (publiczny, z
jawnymi politykami RLS na `storage.objects`). Migracje w
`supabase/migrations/`, uruchamiane ręcznie przez Supabase SQL editor — każda
zmiana w bazie = nowy plik migracji.

## Coding Rules

- Tailwind only, dark theme (`zinc-950`/`zinc-900`/`zinc-800`, akcent
  `lime-400`) — bez CSS-in-JS, bez bibliotek komponentów.
- Zwykły `useState` + `useEffect` fetch + ręczny refetch po mutacji dla CRUD
  (poses, plans) — bez React Query/SWR. Store Zustand tylko dla stanu runtime
  treningu.
- Wzorzec modala: bottom-sheet (`fixed inset-0 bg-black/80 flex flex-col
  justify-end`), jeden komponent na add+edit przez prop `mode`.
- Drag & drop przez `useSortable` (Pointer Events, długie przytrzymanie na
  touch) — bez zewnętrznej biblioteki DnD.

## Current Phase

Wersja MVP zaimplementowana: katalog ćwiczeń (CRUD + upload zdjęć), planowanie
sesji (CRUD + reorder), silnik treningu (sekwencer + dźwięki + Wake Lock +
pauza/wznowienie). Do zrobienia przed produkcyjnym użyciem: utworzenie
projektu Supabase, uruchomienie migracji, konfiguracja zmiennych środowiskowych
i deploy na Vercel.
