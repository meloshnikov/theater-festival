# Current implementation → Phoenix MVP 3.15

Этот документ помогает новому исполнителю не принять текущий интерфейс ветки
`main` за согласованное целевое поведение. Он не заменяет ТЗ.

Проверенная база: commit `c42f499a5683018bc50d88c61cfb1f1f2548592a`.

## Что уже можно переиспользовать

- Next.js 16 / React 19 / TypeScript.
- Статические данные событий и площадок в `app/data.ts`.
- Работа с часовым поясом `Europe/Moscow` и 5-минутным округлением.
- Горизонтальный мобильный ruler.
- Поиск и autocomplete по событиям/театрам.
- Выбор нескольких площадок.
- localStorage маршрута.
- Карточка события и базовая схема острова.
- ESLint, build и rendered HTML test.

Переиспользование не означает, что текущая модель и UI уже соответствуют ТЗ.

## Критические различия

| Область | Сейчас в `main` | Цель Phoenix |
|---|---|---|
| Дни | 24, 25 и 26 июля | Ровно два дня по `festival.days[]` |
| Архитектура desktop | Текущий адаптивный список/карточки | Одна партитура `venue × time` + Карта + route dock |
| Mobile navigation | Дата и маршрут смешаны с существующей навигацией | Только Программа / Карта / Мой маршрут |
| Возраст | `ageFilter: string \| null` | `ageFilters[]`, точный multiselect OR |
| Временные состояния | `active / soon / all` | `atTime / nextHour / allDay` + `timeAnchor` |
| Фильтры | Местами применяются сразу | Draft → `Показать N событий` атомарно |
| Выбор площадки | Map pin фактически меняет venue filter | `selectedVenueId` не равен `venueFilters[]` |
| Маршрут | Favorites + отдельный route mode | Два независимых `routesByDate`, route dock на desktop |
| Share | QR, URL hash и native Share реализованы | Share исключён из согласованного MVP |
| Маршрутная карта | Нет полной PreparedRoute-цепочки | Все оставшиеся переходы, минуты, метры, запас и конфликты |
| Геолокация | Не использовать | Полностью отсутствует |
| Detail desktop | Modal/fullscreen-подход | Inspector → drawer 520–600 px вместо Карты |
| Empty route desktop | Переход в отдельный route-mode | Постоянный dock + add-mode на той же партитуре |
| Static config | Данные определены непосредственно в TS | Версионированный двухдневный config + build-time validation |

## Рекомендуемая последовательность реализации

### P0 — модель и состояние

1. Ввести канонические типы из раздела 12 ТЗ.
2. Разделить `selectedVenueId` и `venueFilters[]`.
3. Перевести возраст на `ageFilters[]`.
4. Ввести `timeMode`, `timeAnchor`, `dayFilteredEvents` и `focusEvents`.
5. Ввести `routesByDate` и `routeDate`.
6. Добавить PreparedRoute и build-time validation.

### P1 — общий application shell

1. Сохранить mobile-композицию ниже 1024 px.
2. Создать desktop workspace ≥1024 px.
3. Реализовать единый state-controller для mobile и desktop.
4. Удалить Share из целевого MVP либо держать за выключенным feature flag,
   не смешивая с route dock.

### P2 — desktop

1. Партитура и интерактивный playhead.
2. Linked selection партитуры и Карты.
3. Flush-right filters sidebar.
4. Inspector и detail drawer.
5. Пустой/одиночный/заполненный route dock.
6. Маршрутный слой и конфликтные переходы.
7. Явный map-focus.

### P3 — mobile parity

1. Программа и единая A3-плашка.
2. Карта с bottom sheet 38/70/92%.
3. Мой маршрут: список и карта.
4. Единый detail и route CTA.
5. 320 px, safe area, keyboard и Dynamic Type QA.

## Компонентные границы

Рекомендуемое разбиение, не обязательное для имён файлов:

- `FestivalStateProvider`
- `ProgramFilters`
- `TimeController`
- `DesktopScore`
- `EventBlock`
- `EventInspector`
- `EventDetail`
- `FestivalMap`
- `VenueSheet`
- `RouteDock`
- `RouteList`
- `RouteMapLayer`
- `TransitionCard`

Расчёты времени, фильтров и маршрута должны быть чистыми функциями и не
дублироваться между mobile/desktop компонентами.

## Проверка готовности

Реализация не считается соответствующей только по визуальному сходству.
Необходимо пройти `MVP-AC-01…119` из ТЗ. Особое внимание:

- `AC-68/89/90` — возрастной multiselect;
- `AC-85…97` — статический конфиг и local persistence;
- `AC-98…119` — desktop;
- `AC-29…40` — PreparedRoute и конфликты;
- `AC-74…84/116` — event detail.

## Не принимать без отдельного решения

- увеличение фестиваля обратно до трёх дней;
- сохранение Share/QR в MVP;
- внешние карты или геолокация;
- ручной reorder;
- автоматическая смена desktop layout;
- превращение клика по маркеру в постоянный фильтр.
