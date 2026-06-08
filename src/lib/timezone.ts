/**
 * Converts a deadline date + time in a given source timezone to the user's local timezone.
 * Returns formatted strings and a days-left count.
 */
export function getDeadlineInUserTimezone(
  deadlineDate: string,
  deadlineTime: string = '23:59',
  deadlineTimezone: string = 'UTC'
): {
  localDate: string;
  localTime: string;
  localTimezone: string;
  isoString: string;
  daysLeft: number;
} {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build the ISO-like string in the source timezone and interpret it there.
    // We use Intl to format the source datetime as UTC offset, then create a
    // real Date from that.
    const sourceDateTime = `${deadlineDate}T${deadlineTime}:00`;

    // Parse the naive datetime string as if it lives in deadlineTimezone
    // by using a trick: format an epoch reference time shifted by the tz offset.
    // The safest cross-browser approach is to use the Intl formatter to get
    // the offset for that moment and adjust.
    const naiveDate = new Date(sourceDateTime);

    // Get the UTC offset for the source timezone at this moment (in ms)
    const sourceTzOffsetMs = getTimezoneOffsetMs(naiveDate, deadlineTimezone);
    const userTzOffsetMs = getTimezoneOffsetMs(naiveDate, userTimezone);

    // Adjust from source tz to UTC, then to user tz
    const utcMs = naiveDate.getTime() - sourceTzOffsetMs;
    const userMs = utcMs + userTzOffsetMs;
    const userDate = new Date(userMs);

    const localDate = userDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const localTime = userDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const daysLeft = Math.ceil((utcMs - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      localDate,
      localTime,
      localTimezone: userTimezone,
      isoString: new Date(utcMs).toISOString(),
      daysLeft,
    };
  } catch {
    const fallbackDate = new Date(deadlineDate);
    return {
      localDate: deadlineDate,
      localTime: deadlineTime,
      localTimezone: 'UTC',
      isoString: fallbackDate.toISOString(),
      daysLeft: Math.ceil(
        (fallbackDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    };
  }
}

/**
 * Returns the UTC offset in milliseconds for a given timezone at the given Date.
 * e.g. America/New_York returns -18000000 (−5 h) in winter.
 */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  // Format the date in the target timezone, then parse it back to get the
  // offset from UTC.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);

  const tzYear = get('year');
  const tzMonth = get('month') - 1;
  const tzDay = get('day');
  let tzHour = get('hour');
  const tzMinute = get('minute');
  const tzSecond = get('second');

  // handle midnight shown as 24
  if (tzHour === 24) tzHour = 0;

  const tzMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
  return tzMs - date.getTime();
}

/**
 * Returns a short timezone label (e.g. "WAT" or "EST") given an IANA name.
 * Falls back to the last segment of the IANA string, cleaned up.
 */
export function getShortTimezoneLabel(ianaTimezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'short',
    });
    const parts = fmt.formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ianaTimezone.split('/').pop()?.replace('_', ' ') ?? ianaTimezone;
  } catch {
    return ianaTimezone.split('/').pop()?.replace('_', ' ') ?? ianaTimezone;
  }
}

/**
 * Formats a deadline for display, always converting to the user's local timezone.
 * If no time is provided, just shows the date without timezone conversion.
 */
export function formatDeadlineForDisplay(
  deadlineDate: string,
  deadlineTime?: string | null,
  deadlineTimezone?: string | null
): {
  displayDate: string;
  displayTime: string | null;
  daysLeft: number;
} {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    // If no time provided, just show date (no tz conversion needed)
    if (!deadlineTime) {
      const date = new Date(deadlineDate + 'T00:00:00');
      return {
        displayDate: date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: userTimezone,
        }),
        displayTime: null,
        daysLeft: Math.ceil(
          (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      };
    }

    // With time: convert from school timezone to user timezone
    const sourceString = `${deadlineDate}T${deadlineTime}:00`;
    const sourceTimezone = deadlineTimezone || userTimezone;

    const naiveDate = new Date(sourceString);
    const sourceTzOffsetMs = getTimezoneOffsetMs(naiveDate, sourceTimezone);
    const userTzOffsetMs = getTimezoneOffsetMs(naiveDate, userTimezone);

    const utcMs = naiveDate.getTime() - sourceTzOffsetMs;
    const userMs = utcMs + userTzOffsetMs;
    const userDate = new Date(userMs);

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: userTimezone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return {
      displayDate: formatter.format(userDate),
      displayTime: timeFormatter.format(userDate),
      daysLeft: Math.ceil((utcMs - Date.now()) / (1000 * 60 * 60 * 24)),
    };
  } catch {
    return {
      displayDate: deadlineDate,
      displayTime: deadlineTime || null,
      daysLeft: Math.ceil(
        (new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    };
  }
}

