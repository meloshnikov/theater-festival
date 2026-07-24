"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  durationLabel,
  festivalEvents,
  formatTime,
  venues,
} from "./data";
import {
  eventLiveStatus,
  eventMatchesTimeMode,
  festivalBounds,
  getCurrentFestivalMoment,
  isInsideFestivalHours,
  type FestivalMoment,
  type TimeMode,
} from "./festival-time";
import type { FestivalEvent } from "./data";

const RULER_STEP_MINUTES = 5;
const RULER_STEP_WIDTH = 10;

function dayLabel(day: number) {
  if (day === 24) return "Пт, 24 июля";
  if (day === 25) return "Сб, 25 июля";
  return "Вс, 26 июля";
}

function matchesFilters(
  event: FestivalEvent,
  venueIds: number[],
  age: string | null,
  query: string,
) {
  if (
    venueIds.length > 0 &&
    (event.venue === null || !venueIds.includes(event.venue))
  ) {
    return false;
  }
  if (age && event.age !== age) return false;
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  if (
    normalizedQuery &&
    !`${event.title} ${event.kind} ${event.company} ${event.city ?? ""} ${
      event.place ?? ""
    }`
      .toLocaleLowerCase("ru")
      .includes(normalizedQuery)
  ) {
    return false;
  }
  return true;
}

export default function Home() {
  const [day, setDay] = useState(25);
  const [selectedTime, setSelectedTime] = useState(14 * 60);
  const [mode, setMode] = useState<TimeMode>("active");
  const [venueFilter, setVenueFilter] = useState<number[]>([]);
  const [ageFilter, setAgeFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftVenue, setDraftVenue] = useState<number[]>([]);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [festivalNow, setFestivalNow] = useState<FestivalMoment | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerMarkerRef = useRef<HTMLDivElement>(null);
  const rulerFrame = useRef<number | null>(null);
  const rulerSettleTimer = useRef<number | null>(null);
  const rulerFeedbackTimer = useRef<number | null>(null);
  const rulerIsInteracting = useRef(false);
  const lastFeedbackStep = useRef<number | null>(null);
  const followCurrentTime = useRef(true);
  const lastPageScroll = useRef(0);
  const pageScrollFrame = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const moment = getCurrentFestivalMoment();
      setFestivalNow(moment);
      if (moment) {
        setDay(moment.day);
        setSelectedTime(moment.rulerTime);
      }
    }, 0);
    const interval = window.setInterval(() => {
      const moment = getCurrentFestivalMoment();
      setFestivalNow(moment);
      if (moment && followCurrentTime.current) {
        setDay(moment.day);
        setSelectedTime(moment.rulerTime);
      }
    }, 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    lastPageScroll.current = window.scrollY;
    const handlePageScroll = () => {
      if (pageScrollFrame.current !== null) return;
      pageScrollFrame.current = window.requestAnimationFrame(() => {
        const nextScroll = window.scrollY;
        const movement = nextScroll - lastPageScroll.current;

        if (filtersOpen || nextScroll < 48) {
          setBottomNavHidden(false);
          lastPageScroll.current = nextScroll;
        } else if (movement > 7) {
          setBottomNavHidden(true);
          lastPageScroll.current = nextScroll;
        } else if (movement < -7) {
          setBottomNavHidden(false);
          lastPageScroll.current = nextScroll;
        }

        pageScrollFrame.current = null;
      });
    };

    window.addEventListener("scroll", handlePageScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handlePageScroll);
      if (pageScrollFrame.current !== null) {
        window.cancelAnimationFrame(pageScrollFrame.current);
        pageScrollFrame.current = null;
      }
    };
  }, [filtersOpen]);

  const { start: rangeStart, end: rangeEnd } = festivalBounds(day);
  const ticks = Array.from(
    { length: Math.floor((rangeEnd - rangeStart) / 60) + 1 },
    (_, index) => rangeStart / 60 + index,
  );
  const mobileRulerTicks = Array.from(
    {
      length:
        Math.floor((rangeEnd - rangeStart) / RULER_STEP_MINUTES) + 1,
    },
    (_, index) => rangeStart + index * RULER_STEP_MINUTES,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const ruler = rulerRef.current;
      if (!ruler) return;
      const nextLeft =
        ((selectedTime - rangeStart) / RULER_STEP_MINUTES) * RULER_STEP_WIDTH;
      if (Math.abs(ruler.scrollLeft - nextLeft) > 1) {
        ruler.scrollTo({ left: nextLeft, behavior: "auto" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [day, rangeStart, selectedTime]);

  useEffect(
    () => () => {
      if (rulerFrame.current !== null) {
        window.cancelAnimationFrame(rulerFrame.current);
      }
      if (rulerSettleTimer.current !== null) {
        window.clearTimeout(rulerSettleTimer.current);
      }
      if (rulerFeedbackTimer.current !== null) {
        window.clearTimeout(rulerFeedbackTimer.current);
      }
    },
    [],
  );

  const dayEvents = useMemo(
    () => festivalEvents.filter((event) => event.days.includes(day)),
    [day],
  );
  const availableVenues = useMemo(
    () =>
      venues.filter((venue) =>
        dayEvents.some((event) => event.venue === venue.id),
      ),
    [dayEvents],
  );

  const visibleEvents = useMemo(() => {
    return dayEvents
      .filter((event) => {
        if (!matchesFilters(event, venueFilter, ageFilter, query)) return false;
        return eventMatchesTimeMode(event, mode, selectedTime);
      })
      .sort((a, b) => a.start - b.start || (a.venue ?? 0) - (b.venue ?? 0));
  }, [ageFilter, dayEvents, mode, query, selectedTime, venueFilter]);

  const draftVisibleCount = useMemo(
    () =>
      dayEvents.filter((event) => {
        if (!matchesFilters(event, draftVenue, draftAge, draftQuery)) return false;
        return eventMatchesTimeMode(event, mode, selectedTime);
      }).length,
    [dayEvents, draftAge, draftQuery, draftVenue, mode, selectedTime],
  );

  const activeCount = dayEvents.filter(
    (event) => event.start <= selectedTime && event.end > selectedTime,
  ).length;

  const filterCount =
    venueFilter.length +
    Number(Boolean(ageFilter)) +
    Number(Boolean(query.trim()));
  const mobileModeLabel =
    mode === "active"
      ? festivalNow &&
        day === festivalNow.day &&
        selectedTime === festivalNow.rulerTime &&
        isInsideFestivalHours(festivalNow)
        ? "Идут сейчас"
        : "В это время"
      : mode === "soon"
        ? "В течение часа"
        : "Весь день";
  const currentTimeAvailable = isInsideFestivalHours(festivalNow);
  const showReturnToNow =
    currentTimeAvailable &&
    festivalNow !== null &&
    (day !== festivalNow.day || selectedTime !== festivalNow.rulerTime);

  const changeDay = (nextDay: number) => {
    followCurrentTime.current = false;
    setDay(nextDay);
    setSelectedTime(nextDay === 24 ? 20 * 60 : 14 * 60);
    setMode("active");
    setVenueFilter([]);
  };

  const toggleVenue = (venue: number) => {
    setVenueFilter((current) =>
      current.includes(venue)
        ? current.filter((id) => id !== venue)
        : [...current, venue].sort((a, b) => a - b),
    );
    setMode("all");
  };

  const showOnMap = (venue: number) => {
    setVenueFilter([venue]);
    if (window.matchMedia("(max-width: 780px)").matches) {
      setMode("all");
      document.getElementById("program")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
  };

  const resetFilters = () => {
    setVenueFilter([]);
    setAgeFilter(null);
    setQuery("");
  };

  const showAllProgram = () => {
    resetFilters();
    setMode("all");
  };

  const openFilters = () => {
    setBottomNavHidden(false);
    setDraftVenue([...venueFilter]);
    setDraftAge(ageFilter);
    setDraftQuery(query);
    setFiltersOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftVenue([]);
    setDraftAge(null);
    setDraftQuery("");
  };

  const applyDraftFilters = () => {
    setVenueFilter([...draftVenue]);
    setAgeFilter(draftAge);
    setQuery(draftQuery);
    setFiltersOpen(false);
  };

  const setRulerTime = (value: number) => {
    setSelectedTime(Math.min(rangeEnd, Math.max(rangeStart, value)));
  };

  const playRulerFeedback = (value: number) => {
    const isHour = value % 60 === 0;
    const isQuarter = value % 15 === 0;
    const vibrationDuration = isHour ? 14 : isQuarter ? 9 : 5;
    const markerScale = isHour ? 1.2 : isQuarter ? 1.13 : 1.07;

    const hapticNavigator = navigator as Navigator & {
      mozVibrate?: (pattern: number | number[]) => boolean;
      webkitVibrate?: (pattern: number | number[]) => boolean;
    };
    const vibrate = (
      hapticNavigator.vibrate ??
      hapticNavigator.webkitVibrate ??
      hapticNavigator.mozVibrate
    ) as ((pattern: number | number[]) => boolean) | undefined;
    if (typeof vibrate === "function") {
      vibrate.call(hapticNavigator, vibrationDuration);
    }

    const marker = rulerMarkerRef.current;
    if (
      marker &&
      typeof marker.animate === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      marker.getAnimations().forEach((animation) => animation.cancel());
      marker.animate(
        [
          { transform: "translateX(-50%) scale(1)" },
          { transform: `translateX(-50%) scale(${markerScale})` },
          { transform: "translateX(-50%) scale(1)" },
        ],
        {
          duration: isHour ? 150 : 105,
          easing: "cubic-bezier(.2,.8,.2,1)",
        },
      );
    }
  };

  const beginRulerInteraction = () => {
    setBottomNavHidden(true);
    rulerIsInteracting.current = true;
    const ruler = rulerRef.current;
    if (ruler) {
      lastFeedbackStep.current = Math.round(
        ruler.scrollLeft / RULER_STEP_WIDTH,
      );
    }
  };

  const handleRulerScroll = () => {
    if (rulerSettleTimer.current !== null) {
      window.clearTimeout(rulerSettleTimer.current);
    }
    rulerSettleTimer.current = window.setTimeout(() => {
      const ruler = rulerRef.current;
      if (ruler) {
        const step = Math.round(ruler.scrollLeft / RULER_STEP_WIDTH);
        ruler.scrollTo({
          left: step * RULER_STEP_WIDTH,
          behavior: "smooth",
        });
      }
      rulerSettleTimer.current = null;
    }, 120);

    if (rulerFrame.current !== null) return;
    rulerFrame.current = window.requestAnimationFrame(() => {
      const ruler = rulerRef.current;
      if (ruler) {
        const step = Math.round(ruler.scrollLeft / RULER_STEP_WIDTH);
        const nextTime = rangeStart + step * RULER_STEP_MINUTES;
        if (
          rulerIsInteracting.current &&
          step !== lastFeedbackStep.current
        ) {
          followCurrentTime.current = false;
          lastFeedbackStep.current = step;
          playRulerFeedback(nextTime);
        }
        setRulerTime(nextTime);
      }
      rulerFrame.current = null;
    });

    if (rulerFeedbackTimer.current !== null) {
      window.clearTimeout(rulerFeedbackTimer.current);
    }
    rulerFeedbackTimer.current = window.setTimeout(() => {
      rulerIsInteracting.current = false;
      setBottomNavHidden(false);
      rulerFeedbackTimer.current = null;
    }, 180);
  };

  const handleRulerKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextTime = Math.max(
        rangeStart,
        selectedTime - RULER_STEP_MINUTES,
      );
      if (nextTime !== selectedTime) {
        followCurrentTime.current = false;
        playRulerFeedback(nextTime);
        setRulerTime(nextTime);
      }
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextTime = Math.min(
        rangeEnd,
        selectedTime + RULER_STEP_MINUTES,
      );
      if (nextTime !== selectedTime) {
        followCurrentTime.current = false;
        playRulerFeedback(nextTime);
        setRulerTime(nextTime);
      }
    }
  };

  const useCurrentTime = () => {
    const moment = getCurrentFestivalMoment();
    if (moment && isInsideFestivalHours(moment)) {
      followCurrentTime.current = true;
      setFestivalNow(moment);
      setDay(moment.day);
      setSelectedTime(moment.rulerTime);
      setMode("active");
      setVenueFilter([]);
    }
  };

  return (
    <main>
      <header className="site-header">
        <span aria-hidden="true" />
        <nav className="top-nav" aria-label="Основная навигация">
          <a className="active" href="#program">
            Программа
          </a>
          <a href="#map">Карта</a>
          <a href="#venues">Площадки</a>
        </nav>
        <div className="header-date">
          <span aria-hidden="true">◷</span> 24–26 июля 2026
        </div>
      </header>

      <section className="mobile-cockpit" aria-label="Навигация по программе">
        <div className="mobile-time-value" aria-live="polite">
          <span>Выбранное время</span>
          <strong>{formatTime(selectedTime)}</strong>
          <button
            className={`live-now-button ${
              currentTimeAvailable && !showReturnToNow ? "is-current" : ""
            }`}
            onClick={useCurrentTime}
            disabled={!showReturnToNow}
            aria-label={
              festivalNow === null
                ? "Текущее время доступно во время фестиваля"
                : !currentTimeAvailable
                  ? "Сейчас программа не идёт"
                : showReturnToNow
                ? "Вернуться к текущему времени"
                : "Выбрано текущее время"
            }
          >
            <i aria-hidden="true" />
            Сейчас
          </button>
        </div>
        <div className="mobile-ruler-shell">
          <div
            className="mobile-ruler-marker"
            ref={rulerMarkerRef}
            aria-hidden="true"
          >
            <i />
          </div>
          <div
            className="mobile-ruler-scroll"
            ref={rulerRef}
            onPointerDown={beginRulerInteraction}
            onWheel={beginRulerInteraction}
            onScroll={handleRulerScroll}
            onKeyDown={handleRulerKeyDown}
            role="slider"
            tabIndex={0}
            aria-label="Выберите время, прокручивая шкалу"
            aria-valuemin={rangeStart}
            aria-valuemax={rangeEnd}
            aria-valuenow={selectedTime}
            aria-valuetext={formatTime(selectedTime)}
          >
            <div className="mobile-ruler-track" aria-hidden="true">
              <span className="ruler-spacer" />
              {mobileRulerTicks.map((value) => {
                const isHour = value % 60 === 0;
                const isQuarter = value % 15 === 0;
                return (
                  <span
                    key={value}
                    className={
                      isHour ? "hour" : isQuarter ? "quarter" : "minute"
                    }
                  >
                    <i />
                    {isHour && <b>{formatTime(value)}</b>}
                  </span>
                );
              })}
              <span className="ruler-spacer" />
            </div>
          </div>
        </div>
      </section>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">
            XIV Международный фестиваль · Елагин остров
          </p>
          <h1>Выберите, куда идти дальше</h1>
          <p className="hero-copy">
            Сравнивайте спектакли по времени, возрасту и площадке — карта всегда
            рядом.
          </p>
          <p className="festival-motto">Прошлое — лишь пролог</p>
        </div>
        <div className="selected-time" aria-live="polite">
          <span>{dayLabel(day)} · выбранное время</span>
          <strong>{formatTime(selectedTime)}</strong>
          <small>
            {activeCount
              ? `${activeCount} ${
                  activeCount === 1
                    ? "событие идёт"
                    : activeCount >= 2 && activeCount <= 4
                      ? "события идут"
                      : "событий идут"
                } в этот момент`
              : "В этот момент событий нет"}
          </small>
        </div>
      </section>

      <section className="time-console" aria-label="Выбор времени">
        <div className="time-labels" aria-hidden="true">
          {ticks.map((hour) => (
            <span key={hour}>{hour === 24 ? "00:00" : `${hour}:00`}</span>
          ))}
        </div>
        <input
          className="time-range"
          type="range"
          min={rangeStart}
          max={rangeEnd}
          step={5}
          value={selectedTime}
          aria-label="Выберите время программы"
          onChange={(event) => {
            followCurrentTime.current = false;
            setSelectedTime(Number(event.target.value));
          }}
          style={
            {
              "--range-progress": `${
                ((selectedTime - rangeStart) / (rangeEnd - rangeStart)) * 100
              }%`,
            } as React.CSSProperties
          }
        />
        <div className="quick-row">
          <div className="day-switcher" aria-label="Выберите день">
            {[24, 25, 26].map((value) => (
              <button
                key={value}
                className={day === value ? "selected" : ""}
                onClick={() => changeDay(value)}
              >
                {value} июля
              </button>
            ))}
          </div>
          <div className="quick-times" aria-label="Быстрый выбор времени">
            {(day === 24 ? [20, 21] : [13, 16, 19, 22]).map((hour) => (
              <button
                key={hour}
                onClick={() => {
                  followCurrentTime.current = false;
                  setSelectedTime(hour * 60);
                }}
              >
                {hour}:00
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace" id="program">
        <div className="program-panel">
          <div className="program-heading">
            <div>
              <p className="section-kicker">
                {day === 24 ? "Открытие фестиваля" : "Основная программа"}
              </p>
              <h2>
                {mode === "active"
                  ? `Идут в ${formatTime(selectedTime)}`
                  : mode === "soon"
                    ? "Начнутся в течение часа"
                    : `Все события ${day} июля`}
              </h2>
            </div>
            <label className="search">
              <span className="sr-only">Поиск спектакля или театра</span>
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Спектакль или театр"
              />
            </label>
          </div>

          <div className="filter-row" aria-label="Фильтр по времени">
            <button
              className={mode === "active" ? "selected" : ""}
              onClick={() => setMode("active")}
            >
              В это время
            </button>
            <button
              className={mode === "soon" ? "selected" : ""}
              onClick={() => setMode("soon")}
            >
              В течение часа
            </button>
            <button
              className={mode === "all" ? "selected" : ""}
              onClick={() => setMode("all")}
            >
              Весь день
            </button>
          </div>

          <div className="age-filter desktop-filters" aria-label="Фильтр по возрасту">
            <span>Возраст:</span>
            <button
              className={ageFilter === null ? "selected" : ""}
              onClick={() => setAgeFilter(null)}
            >
              любой
            </button>
            {["0+", "6+", "12+", "16+", "18+"].map((age) => (
              <button
                className={ageFilter === age ? "selected" : ""}
                key={age}
                onClick={() => setAgeFilter(age)}
              >
                {age}
              </button>
            ))}
          </div>

          <div className="venue-strip desktop-filters" aria-label="Фильтр по площадке">
            <button
              className={venueFilter.length === 0 ? "selected" : ""}
              onClick={() => setVenueFilter([])}
            >
              Все площадки
            </button>
            {availableVenues.map((venue) => (
              <button
                key={venue.id}
                className={venueFilter.includes(venue.id) ? "selected" : ""}
                onClick={() => toggleVenue(venue.id)}
                aria-pressed={venueFilter.includes(venue.id)}
                title={venue.name}
              >
                <span
                  className="venue-dot"
                  style={{ background: venue.color }}
                  aria-hidden="true"
                >
                  {venue.id}
                </span>
                {venue.short}
              </button>
            ))}
          </div>

          <div className="results-line">
            <span className="desktop-result-count">
              {visibleEvents.length}{" "}
              {visibleEvents.length === 1 ? "событие" : "событий"}
            </span>
            <label className="mobile-view-picker">
              <span>{mobileModeLabel}</span>
              <i aria-hidden="true">⌄</i>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as TimeMode)
                }
                aria-label="Выберите период показа"
              >
                <option value="active">Идут сейчас</option>
                <option value="soon">В течение часа</option>
                <option value="all">Весь день</option>
              </select>
            </label>
            <span className="mobile-result-count">
              {visibleEvents.length}{" "}
              {visibleEvents.length === 1 ? "событие" : "событий"}
            </span>
            {(venueFilter.length > 0 || ageFilter || query) && (
              <button onClick={resetFilters}>Сбросить фильтры</button>
            )}
          </div>

          {filterCount > 0 && (
            <div className="active-filter-chips" aria-label="Активные фильтры">
              {query.trim() && (
                <button onClick={() => setQuery("")}>
                  <span>Поиск: «{query.trim()}»</span>
                  <b aria-hidden="true">×</b>
                </button>
              )}
              {ageFilter && (
                <button onClick={() => setAgeFilter(null)}>
                  <span>Возраст {ageFilter}</span>
                  <b aria-hidden="true">×</b>
                </button>
              )}
              {venueFilter.map((venueId) => (
                <button
                  key={venueId}
                  onClick={() =>
                    setVenueFilter((current) =>
                      current.filter((id) => id !== venueId),
                    )
                  }
                >
                  <span>
                    № {venueId} · {venues[venueId - 1].short}
                  </span>
                  <b aria-hidden="true">×</b>
                </button>
              ))}
            </div>
          )}

          {visibleEvents.length ? (
            <div className="event-grid">
              {visibleEvents.map((event) => {
                const venue = event.venue
                  ? venues[event.venue - 1]
                  : undefined;
                const isActive =
                  event.start <= selectedTime && event.end > selectedTime;
                const status = eventLiveStatus(event, day, festivalNow);
                const isLive = status === "Идёт";
                return (
                  <article
                    className={`event-card ${isActive ? "is-active" : ""}`}
                    key={event.id}
                    data-start={formatTime(event.start)}
                  >
                    <div className="event-rail" aria-hidden="true">
                      <time>{formatTime(event.start)}</time>
                      <span />
                    </div>
                    <div className="event-topline">
                      <strong>
                        {formatTime(event.start)}–{formatTime(event.end)}
                      </strong>
                      <span>{durationLabel(event.start, event.end)}</span>
                    </div>
                    <div className="event-meta">
                      <span>{event.kind}</span>
                      <b>{event.age}</b>
                    </div>
                    <h3>{event.title}</h3>
                    <p className="event-credits">
                      <span className="event-company">{event.company}</span>
                      {event.city && (
                        <span className="event-city">{event.city}</span>
                      )}
                    </p>
                    {event.note && <p className="event-note">{event.note}</p>}
                    <div className="event-footer">
                      {venue ? (
                        <button
                          className="venue-link"
                          onClick={() => showOnMap(venue.id)}
                          style={
                            {
                              "--venue-color": venue.color,
                            } as React.CSSProperties
                          }
                        >
                          <span>{venue.id}</span> {venue.short}
                        </button>
                      ) : (
                        <span className="event-place">
                          ◉ {event.place ?? "Маршрут фестиваля"}
                        </span>
                      )}
                      {status && (
                        <span className={isLive ? "live-badge" : "soon-badge"}>
                          {status}
                        </span>
                      )}
                    </div>
                    {event.place && venue && (
                      <p className="place-note">{event.place}</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">◎</span>
              <h3>Ничего не найдено</h3>
              <p>Измените время, возраст, площадку или поисковый запрос.</p>
              <button onClick={showAllProgram}>Показать всю программу</button>
            </div>
          )}
        </div>

        <aside className="map-card" id="map">
          <div className="map-card-heading">
            <div>
              <p className="section-kicker">Ориентир на острове</p>
              <h2>Карта площадок</h2>
            </div>
            {venueFilter.length > 0 && (
              <button className="map-reset" onClick={() => setVenueFilter([])}>
                Сбросить
              </button>
            )}
          </div>
          <p className="map-hint">
            Нажмите на номер, чтобы отфильтровать программу. На официальной
            карте отмечены дорожки и все 17 площадок.
          </p>
          <div className="map-image-wrap">
            <img
              src="https://elaginpark.org/upload/medialibrary/09e/tk2inoanpf90tmv5j4h2nulbsavwihbn.jpg"
              alt="Карта Елагина острова с семнадцатью площадками фестиваля 2026 года"
            />
            {venues.map((venue) => (
              <button
                className={`map-pin ${
                  venueFilter.includes(venue.id) ? "selected" : ""
                }`}
                key={venue.id}
                style={
                  {
                    left: `${venue.x}%`,
                    top: `${venue.y}%`,
                    "--venue-color": venue.color,
                  } as React.CSSProperties
                }
                onClick={() => toggleVenue(venue.id)}
                aria-pressed={venueFilter.includes(venue.id)}
                aria-label={`Площадка ${venue.id}: ${venue.name}`}
                title={venue.name}
              >
                {venue.id}
              </button>
            ))}
          </div>
          <div className="map-selection" aria-live="polite">
            {venueFilter.length > 0 ? (
              <div>
                <strong>
                  {venueFilter.length === 1
                    ? venues[venueFilter[0] - 1].name
                    : `Выбрано площадок: ${venueFilter.length}`}
                </strong>
                <small>
                  {
                    dayEvents.filter(
                      (event) =>
                        event.venue !== null &&
                        venueFilter.includes(event.venue),
                    ).length
                  }{" "}
                  событий {day} июля
                </small>
              </div>
            ) : (
              <span>Выберите площадку на карте</span>
            )}
          </div>
          <a
            className="original-map"
            href="https://elaginpark.org/upload/medialibrary/09e/tk2inoanpf90tmv5j4h2nulbsavwihbn.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Открыть оригинал карты ↗
          </a>
        </aside>
      </section>

      <section className="venues-section" id="venues">
        <div className="section-title-row">
          <div>
            <p className="section-kicker">17 точек на острове</p>
            <h2>Все площадки</h2>
          </div>
          <a href="#map">Смотреть на карте ↑</a>
        </div>
        <div className="venue-list">
          {venues.map((venue) => (
            <button key={venue.id} onClick={() => showOnMap(venue.id)}>
              <span style={{ background: venue.color }}>{venue.id}</span>
              <div>
                <strong>{venue.name}</strong>
                <small>Расписание и место на карте</small>
              </div>
              <i aria-hidden="true">→</i>
            </button>
          ))}
        </div>
      </section>

      <footer>
        <p>
          <span className="footer-copy-desktop">
            В программе возможны изменения. Перед поездкой проверьте информацию
            организаторов.
          </span>
          <span className="footer-copy-mobile">
            Программа может измениться.
          </span>
        </p>
        <a
          href="https://elaginpark.org/events/xiv-festival-ulichnykh-teatrov-elagin-park-2026/"
          target="_blank"
          rel="noreferrer"
        >
          <span className="footer-link-desktop">Официальная страница ↗</span>
          <span className="footer-link-mobile">Проверить у организаторов ↗</span>
        </a>
      </footer>

      <nav
        className={`mobile-bottom-nav ${
          bottomNavHidden && !filtersOpen ? "is-hidden" : ""
        }`}
        aria-label="Быстрая навигация"
      >
        <label className="mobile-bottom-date">
          <span aria-hidden="true">▦</span>
          <strong>{day} июля</strong>
          <select
            value={day}
            onChange={(event) => changeDay(Number(event.target.value))}
            aria-label="Выберите день фестиваля"
          >
            <option value={24}>Пт, 24 июля · открытие</option>
            <option value={25}>Сб, 25 июля</option>
            <option value={26}>Вс, 26 июля</option>
          </select>
        </label>
        <button
          onClick={openFilters}
          aria-expanded={filtersOpen}
          aria-controls="mobile-filters"
        >
          <span aria-hidden="true">≡</span>
          Фильтры{filterCount ? <b>{filterCount}</b> : null}
        </button>
      </nav>

      {filtersOpen && (
        <div
          className="filter-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setFiltersOpen(false);
          }}
        >
          <section
            className="mobile-filter-sheet"
            id="mobile-filters"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-toolbar">
              <button
                className="sheet-reset-top"
                onClick={resetDraftFilters}
                disabled={
                  draftVenue.length === 0 &&
                  !draftAge &&
                  !draftQuery.trim()
                }
              >
                Сбросить
              </button>
              <h2 id="mobile-filter-title">Фильтры</h2>
              <button
                className="sheet-close"
                onClick={() => setFiltersOpen(false)}
                aria-label="Закрыть фильтры"
              >
                ×
              </button>
            </div>

            <div className="sheet-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Спектакль или театр"
                aria-label="Спектакль или театр"
              />
              {draftQuery && (
                <button
                  onClick={() => setDraftQuery("")}
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-list" aria-label="Параметры фильтрации">
              <label className="filter-list-row">
                <span>Возраст</span>
                <strong>{draftAge ?? "Любой"}</strong>
                <i aria-hidden="true">›</i>
                <select
                  value={draftAge ?? ""}
                  onChange={(event) =>
                    setDraftAge(event.target.value || null)
                  }
                  aria-label="Выберите возраст"
                >
                  <option value="">Любой</option>
                  {["0+", "6+", "12+", "16+", "18+"].map((age) => (
                    <option value={age} key={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <section
              className="venue-multi-filter"
              aria-labelledby="venue-filter-title"
            >
              <div className="venue-multi-heading">
                <div>
                  <h3 id="venue-filter-title">Площадки</h3>
                  <span>
                    {draftVenue.length
                      ? `Выбрано: ${draftVenue.length}`
                      : "Можно выбрать несколько"}
                  </span>
                </div>
                {draftVenue.length > 0 && (
                  <button onClick={() => setDraftVenue([])}>Очистить</button>
                )}
              </div>
              <div className="venue-choice-grid">
                {availableVenues.map((venue) => {
                  const selected = draftVenue.includes(venue.id);
                  return (
                    <button
                      key={venue.id}
                      className={selected ? "selected" : ""}
                      onClick={() =>
                        setDraftVenue((current) =>
                          current.includes(venue.id)
                            ? current.filter((id) => id !== venue.id)
                            : [...current, venue.id].sort((a, b) => a - b),
                        )
                      }
                      aria-pressed={selected}
                    >
                      <span style={{ background: venue.color }}>
                        {venue.id}
                      </span>
                      <strong>{venue.short}</strong>
                      <i aria-hidden="true">{selected ? "✓" : ""}</i>
                    </button>
                  );
                })}
              </div>
            </section>

            <p className="filter-help">
              Отметьте все интересующие площадки. Программа покажет события на
              любой из них.
            </p>

            <div className="sheet-actions">
              <button
                className="sheet-apply"
                onClick={() => {
                  applyDraftFilters();
                  document
                    .getElementById("program")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Показать {draftVisibleCount}{" "}
                {draftVisibleCount === 1 ? "событие" : "событий"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
