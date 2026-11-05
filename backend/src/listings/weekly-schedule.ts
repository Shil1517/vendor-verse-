import { WEEK_DAYS } from "./dto/availability.dto";

export interface TimeRange {
  start: string;
  end: string;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Checks a weekly schedule and returns it normalised (every day present, ranges
 * sorted), or an error message. Ranges are same-day: start must be before end
 * and ranges on one day must not overlap.
 */
export function parseWeeklySchedule(
  value: Record<string, unknown>,
):
  | { ok: true; schedule: Record<string, TimeRange[]> }
  | { ok: false; error: string } {
  const schedule: Record<string, TimeRange[]> = {};
  for (const key of Object.keys(value)) {
    if (!WEEK_DAYS.includes(key)) {
      return {
        ok: false,
        error: `Unknown day "${key}"; use ${WEEK_DAYS.join(", ")}`,
      };
    }
  }
  for (const day of WEEK_DAYS) {
    const raw = value[day] ?? [];
    if (!Array.isArray(raw)) {
      return { ok: false, error: `${day} must be a list of time ranges` };
    }
    const ranges: TimeRange[] = [];
    for (const item of raw) {
      const range = item as Partial<TimeRange> | null;
      if (
        !range ||
        typeof range.start !== "string" ||
        typeof range.end !== "string" ||
        !HH_MM.test(range.start) ||
        !HH_MM.test(range.end)
      ) {
        return {
          ok: false,
          error: `${day} ranges need start and end as HH:MM`,
        };
      }
      if (range.start >= range.end) {
        return { ok: false, error: `${day}: start must be before end` };
      }
      ranges.push({ start: range.start, end: range.end });
    }
    ranges.sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < ranges.length; i += 1) {
      if (ranges[i].start < ranges[i - 1].end) {
        return { ok: false, error: `${day}: time ranges overlap` };
      }
    }
    schedule[day] = ranges;
  }
  return { ok: true, schedule };
}
