# Yoganator — Dokumentacja funkcjonalna

Ostatnia aktualizacja: 2026-07-21

Aplikacja do planowania i prowadzenia sesji treningowych jogi. Jednoosobowa
(brak logowania), dostępna przez przeglądarkę na telefonie po wdrożeniu na
Vercel, dane w Supabase.

## 1. Nawigacja główna

Trzy zakładki (pasek boczny na desktopie, dolny pasek na telefonie):

1. **Ćwiczenia** (`/poses`) — katalog pozycji jogi.
2. **Plany** (`/plans`) — planowanie sesji treningowych.
3. **Trening** (`/training`) — wybór planu i prowadzenie treningu.

Zakładka Trening podświetla się na czerwono (ring), gdy trening jest aktywnie
w toku (faza `prep` lub `hold`), niezależnie od tego, na której zakładce
aktualnie się znajdujesz.

## 2. Katalog ćwiczeń

Lista pozycji jogi z wyszukiwarką po nazwie. Każda pozycja: nazwa, opcjonalny
opis, opcjonalne zdjęcie.

- **Dodawanie/edycja** — modal (bottom-sheet) z polem nazwy (wymagane), opisu
  i zdjęcia. Zdjęcie wybierane z galerii/aparatu telefonu (`<input
  type="file" accept="image/*">`), podgląd przed zapisem, upload do bucketu
  Supabase Storage `pose-images` przy zapisie formularza. Można usunąć
  istniejące zdjęcie bez wgrywania nowego.
- **Usuwanie** — modal potwierdzenia. Jeśli pozycja jest użyta w jakimkolwiek
  planie sesji, usunięcie jest blokowane na poziomie bazy (FK `ON DELETE
  RESTRICT`) i UI pokazuje komunikat: "Ta pozycja jest użyta w planie sesji —
  usuń ją najpierw z planu."

## 3. Planowanie sesji

Lista zapisanych planów treningowych z podsumowaniem (liczba pozycji, łączny
szacowany czas trwania).

- **Edytor planu** — nazwa (wymagana), opcjonalny opis, uporządkowana lista
  pozycji.
- **Dodawanie pozycji do planu** — przez modal wyboru (wyszukiwarka po
  nazwie, lista wszystkich pozycji z katalogu).
- **Dla każdej pozycji w planie** ustawiasz osobno:
  - **Czas przygotowania** (`prep_seconds`) — odliczanie przed wejściem w
    pozycję. Może być `0` (wtedy trening pomija fazę przygotowania dla tej
    pozycji i przechodzi od razu do trzymania).
  - **Czas trwania** (`hold_seconds`) — jak długo trzymasz pozycję. Musi być
    większy od zera.
- **Zmiana kolejności** — przeciągnięcie (drag & drop) wiersza pozycji: na
  myszy przeciąganie startuje od razu, na dotyku wymaga ok. 350 ms
  przytrzymania (żeby nie kolidować ze zwykłym przewijaniem listy).
- **Zapis** — zapisuje nazwę/opis planu, a następnie zastępuje całą listę
  pozycji w planie nową kolejnością i wartościami (usunięcie starych wpisów i
  wstawienie nowych, z zachowaniem pozycji/kolejności).
- **Usuwanie planu** — z poziomu listy (modal potwierdzenia) lub z poziomu
  edytora istniejącego planu.

## 4. Trening

- **Ekran wyboru planu** — lista zapisanych planów (nazwa, liczba pozycji,
  łączny czas). Wybór planu ładuje go do pamięci sesji treningowej (bez
  jeszcze uruchamiania odliczania).
- **Ekran startowy** — podgląd pierwszej pozycji z planu i przycisk **Start**.
  Kliknięcie Start odblokowuje dźwięk (wymagane przez politykę autoplay
  przeglądarek mobilnych) i uruchamia sekwencer.
- **Przebieg automatyczny** — dla każdej pozycji w planie, w kolejności:
  1. Faza **Przygotowanie** (jeśli `prep_seconds > 0`) — odliczanie w dół,
     nazwa i zdjęcie nadchodzącej pozycji już widoczne.
  2. Faza **Trzymaj pozycję** — odliczanie w dół przez `hold_seconds`.
  3. Automatyczne przejście do fazy przygotowania kolejnej pozycji (lub od
     razu do trzymania, jeśli jej `prep_seconds = 0`).
  4. Po ostatniej pozycji — ekran zakończenia treningu.
  Cały przebieg dzieje się bez interakcji użytkownika, dopóki nie wciśnie
  Pauzy.
- **Pauza / Wznowienie** — przycisk Pauza zamraża dokładnie pozostały czas
  bieżącej fazy (nie restartuje jej od nowa) i zwalnia Wake Lock. Wznowienie
  kontynuuje od dokładnie tego samego punktu.
- **Zakończ** — przerywa trening i wraca do ekranu wyboru planu (strzałka
  wstecz działa tak samo).
- **Ekran aktywnej pozycji** pokazuje: numer pozycji (np. "3 / 8"), zdjęcie i
  nazwę pozycji, etykietę fazy (Przygotowanie / Trzymaj pozycję — kolor
  pomarańczowy vs. limonkowy), duży licznik czasu (mm:ss) i pasek postępu
  bieżącej fazy.

## 5. Sygnały dźwiękowe

Generowane w locie przez Web Audio API (oscylator, ton sinusoidalny) — brak
plików audio do zarządzania.

```
countdownBeep()   — krótki sygnał (880 Hz) na 3, 2 i 1 sekundę przed końcem
                     bieżącej fazy (przygotowania lub trzymania)
transitionTone()  — dwutonowy sygnał (440 Hz → 660 Hz) przy każdej zmianie
                     fazy: przygotowanie→trzymanie, trzymanie→przygotowanie
                     kolejnej pozycji, oraz na starcie treningu
finishChime()     — trzytonowy akord wznoszący (523/659/784 Hz) na koniec
                     całego planu
```

`AudioContext` jest tworzony/wznawiany dopiero w handlerze kliknięcia
przycisku Start, żeby spełnić politykę autoplay iOS Safari/Chrome (dźwięk nie
może wystartować bez wcześniejszej interakcji użytkownika).

## 6. Wake Lock (podtrzymanie ekranu)

Ekran telefonu nie może zgasnąć podczas treningu, bo zgaszenie ekranu w
przeglądarce mobilnej (zwłaszcza iOS Safari) zwykle zatrzymuje timery JS.

- Wake Lock (`navigator.wakeLock.request('screen')`) jest żądany, gdy
  trening jest w toku (`prep`/`hold`) **i** nie jest zapauzowany.
- Zwalniany przy: pauzie, zakończeniu treningu, odmontowaniu ekranu.
- Przeglądarka automatycznie zwalnia Wake Lock po zminimalizowaniu/zablokowaniu
  karty — po powrocie karty na pierwszy plan (`visibilitychange` →
  `visible`) lock jest żądany ponownie.
- Brak wsparcia przeglądarki dla Wake Lock API → cichy fallback (trening
  dalej działa poprawnie, tylko ekran może zgasnąć).

## 7. Reguły biznesowe i silnik sekwencera (pseudokod)

```
buildSteps(plan):
  posortuj session_plan_items po position
  → lista kroków [{ pose, prepSeconds, holdSeconds, index, total }]

initialPhaseForStep(step):
  step.prepSeconds > 0 ? 'prep' : 'hold'

advance(steps, phase, stepIndex):
  jeśli phase == 'prep':  → { phase: 'hold', stepIndex }         (ta sama pozycja)
  jeśli phase == 'hold':
    nextIndex = stepIndex + 1
    jeśli nextIndex >= steps.length → { finished: true }
    inaczej → { phase: initialPhaseForStep(steps[nextIndex]), stepIndex: nextIndex }

start():
  phase = initialPhaseForStep(steps[0])
  phaseEndAt = now() + phaseDurationMs(steps[0], phase)

tick(now):
  dopóki now >= phaseEndAt:
    wynik = advance(...)
    jeśli finished → zagraj finishChime(), phase = 'finished', koniec
    inaczej: phase/stepIndex = wynik, phaseEndAt += phaseDurationMs(nowyKrok, nowaFaza)
             zagraj transitionTone()
             (pętla catch-up — dogania fazy pominięte w tle karty)
  jeśli pozostały czas fazy ∈ {1, 2, 3} sekundy i jeszcze nie ogłoszony w tej fazie:
    zagraj countdownBeep()

pause():
  pausedRemainingMs = phaseEndAt - now()
  phaseEndAt = null

resume():
  phaseEndAt = now() + pausedRemainingMs
```

Kluczowa zasada: `phaseEndAt` to zawsze **absolutny znacznik czasu**, a
pozostały czas jest zawsze *liczony na nowo* jako `phaseEndAt - now()` —
nigdy nie dekrementowany krok po kroku. Dzięki temu nie ma kumulującego się
dryfu, a pętla catch-up w `tick()` poprawnie przeskakuje fazy pominięte
podczas uśpienia karty w tle (np. telefon zablokowany w kieszeni).

## 8. Model danych

**`poses`**
| kolumna | typ | opis |
|---|---|---|
| id | uuid | PK |
| name | text | wymagane |
| description | text | opcjonalne |
| image_url | text | publiczny URL z bucketu `pose-images`, opcjonalne |
| created_at | timestamptz | |

**`session_plans`**
| kolumna | typ | opis |
|---|---|---|
| id | uuid | PK |
| name | text | wymagane |
| description | text | opcjonalne |
| created_at | timestamptz | |

**`session_plan_items`**
| kolumna | typ | opis |
|---|---|---|
| id | uuid | PK |
| session_plan_id | uuid | FK → session_plans, `ON DELETE CASCADE` |
| pose_id | uuid | FK → poses, `ON DELETE RESTRICT` |
| position | int | kolejność w planie |
| prep_seconds | int | ≥ 0 |
| hold_seconds | int | > 0 |

**Storage**: bucket `pose-images`, publiczny odczyt, jawne polityki RLS na
`storage.objects` dla insert/update/delete (bo `public = true` na buckecie
kontroluje tylko odczyt przez CDN URL, nie zapis).

**`trainingStore`** (Zustand, bez `persist`): `planId`, `planName`, `steps`
(wynik `buildSteps`), `stepIndex`, `phase` (`idle`/`prep`/`hold`/`finished`),
`phaseEndAt`, `isPaused`, `pausedRemainingMs`, `lastAnnouncedSecond` (dedup
sygnału 3/2/1 w obrębie jednego ticka co 250 ms).
