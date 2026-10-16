const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const EPOCH_WEEKDAY = 4;

export const SUNDAY = 0;
export const SATURDAY = 6;

export const toDayNumber = (isoDate: string) =>
  Date.UTC(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  ) / MS_PER_DAY;

export const fromDayNumber = (dayNumber: number) =>
  new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);

export const weekdayOfDayNumber = (dayNumber: number) =>
  (((dayNumber + EPOCH_WEEKDAY) % DAYS_PER_WEEK) + DAYS_PER_WEEK) %
  DAYS_PER_WEEK;

export const weekdayOf = (isoDate: string) =>
  weekdayOfDayNumber(toDayNumber(isoDate));

export const isWeekend = (weekday: number) =>
  weekday === SUNDAY || weekday === SATURDAY;

export const daysInMonth = (isoMonth: string) =>
  new Date(
    Date.UTC(Number(isoMonth.slice(0, 4)), Number(isoMonth.slice(5, 7)), 0),
  ).getUTCDate();

export const isWithinIsoRange = (isoDate: string, start: string, end: string) =>
  start <= isoDate && isoDate <= end;

export const subtractIsoYear = (isoDate: string) => {
  const previousYear = String(Number(isoDate.slice(0, 4)) - 1).padStart(4, "0");
  const monthDay = isoDate.slice(5, 10);
  if (monthDay === "02-29") {
    return `${previousYear}-02-28`;
  }
  return `${previousYear}-${monthDay}`;
};
