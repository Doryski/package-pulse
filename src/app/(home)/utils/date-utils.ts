import { DATE_FORMAT } from "@/lib/config/constants";
import { startOfWeek as dfnsStartOfWeek, format, parseISO } from "date-fns";

export const parseDate = (dateString: string) => parseISO(dateString);
export const formatDate = (date: Parameters<typeof format>[0]) =>
  format(date, DATE_FORMAT);
export const startOfWeek = (date: Parameters<typeof dfnsStartOfWeek>[0]) =>
  dfnsStartOfWeek(date, { weekStartsOn: 1 });
