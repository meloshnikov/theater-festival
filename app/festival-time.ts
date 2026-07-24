import type { FestivalEvent } from "./data";

export type TimeMode = "active" | "soon" | "all";

export type FestivalMoment = {
  day: number;
  time: number;
  rulerTime: number;
};

const festivalClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function festivalBounds(day: number) {
  return day === 24
    ? { start: 20 * 60, end: 22 * 60 }
    : { start: 13 * 60, end: 24 * 60 };
}

export function getCurrentFestivalMoment(
  now = new Date(),
): FestivalMoment | null {
  const values = Object.fromEntries(
    festivalClock
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  if (
    values.year !== 2026 ||
    values.month !== 7 ||
    values.day < 24 ||
    values.day > 26
  ) {
    return null;
  }

  const time = values.hour * 60 + values.minute;
  const { start, end } = festivalBounds(values.day);
  const roundedTime = Math.round(time / 5) * 5;

  return {
    day: values.day,
    time,
    rulerTime: Math.min(end, Math.max(start, roundedTime)),
  };
}

export function isInsideFestivalHours(moment: FestivalMoment | null) {
  if (!moment) return false;
  const { start, end } = festivalBounds(moment.day);
  return moment.time >= start && moment.time <= end;
}

export function eventLiveStatus(
  event: FestivalEvent,
  viewedDay: number,
  moment: FestivalMoment | null,
) {
  if (!moment || viewedDay !== moment.day) return null;
  if (event.start <= moment.time && event.end > moment.time) return "Идёт";
  if (event.start > moment.time) {
    const wait = event.start - moment.time;
    if (wait <= 60) return `Через ${wait} мин.`;
  }
  return null;
}

export function eventMatchesTimeMode(
  event: FestivalEvent,
  mode: TimeMode,
  selectedTime: number,
) {
  if (mode === "active") {
    return event.start <= selectedTime && event.end > selectedTime;
  }
  if (mode === "soon") {
    return event.end > selectedTime && event.start <= selectedTime + 60;
  }
  return true;
}
