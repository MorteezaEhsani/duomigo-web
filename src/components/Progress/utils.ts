// Date utilities for streak calculations

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDate(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function getWeekDates(weekOffset: number = 0): string[] {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  monday.setDate(monday.getDate() - weekOffset * 7);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(formatDateISO(date));
  }
  return dates;
}

export function getDayStatus(
  date: string,
  today: string,
  completedDays: Set<string>
): 'completed' | 'today' | 'missed' | 'future' {
  const isCompleted = completedDays.has(date);
  const isToday = isSameDate(date, today);
  const isFuture = date > today;

  if (isCompleted && isToday) return 'today';
  if (isCompleted) return 'completed';
  if (isToday) return 'today';
  if (isFuture) return 'future';
  return 'missed';
}

export function getDayNumber(dateStr: string): string {
  const date = new Date(dateStr);
  return String(date.getDate());
}

export function getWeekdayInitials(): string[] {
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
}