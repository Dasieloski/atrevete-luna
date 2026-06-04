import { format, parseISO, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

// Examples of date-fns usage
export const formatDate = (dateString: string) => {
  const date = parseISO(dateString);
  return format(date, "PPPP", { locale: es }); // e.g., "2 de junio de 2026"
};

export const formatTime = (dateString: string) => {
  const date = parseISO(dateString);
  return format(date, "p"); // e.g., "3:30 PM"
};

export const addDaysToDate = (dateString: string, days: number) => {
  const date = parseISO(dateString);
  return format(addDays(date, days), "yyyy-MM-dd");
};

export const calculateAgeInDays = (birthDateString: string, referenceDateString: string = new Date().toISOString()) => {
  const birthDate = parseISO(birthDateString);
  const referenceDate = parseISO(referenceDateString);
  return differenceInDays(referenceDate, birthDate);
};

export const isDateInPast = (dateString: string) => {
  const date = parseISO(dateString);
  return isBefore(date, new Date());
};

export const isDateInFuture = (dateString: string) => {
  const date = parseISO(dateString);
  return isAfter(date, new Date());
};

// Example usage comments:
// formatDate("2026-06-02T10:30:00Z") // "2 de junio de 2026"
// addDaysToDate("2026-06-02", 5) // "2026-06-07"
// calculateAgeInDays("2000-01-01") // ~9490 (depending on current date)
