let accessToken: string | null = null;
let tokenClient: any = null;

export function initGoogleCalendarAuth(
  onSuccess: (token: string) => void,
  onError: (error: any) => void
) {
  if (!window.google) {
    onError(new Error('Google Identity Services not loaded'));
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar.events.owned',
    callback: (response: any) => {
      if (response.error) {
        onError(response);
        return;
      }
      accessToken = response.access_token;
      onSuccess(response.access_token);
    },
  });

  tokenClient.requestAccessToken();
}

export function getStoredAccessToken() {
  return accessToken;
}

interface CalendarEventInput {
  programId: string;
  schoolName: string;
  programName: string;
  deadline: string;
  status: string;
  existingEventId?: string | null;
  reminderMinutes: number[];
}

export async function syncEventToGoogleCalendar(
  input: CalendarEventInput
): Promise<{
  success: boolean;
  eventId?: string;
  error?: string;
}> {
  if (!accessToken) {
    return {
      success: false,
      error: 'Not authenticated with Google',
    };
  }

  const deadlineDate = new Date(input.deadline);
  const endDate = new Date(deadlineDate);
  endDate.setDate(endDate.getDate() + 1);

  const formatDateOnly = (d: Date) => d.toISOString().split('T')[0];

  const eventBody = {
    summary: `DEADLINE: ${input.schoolName} - ${input.programName}`,
    description: `Application deadline for ${input.programName} at ${input.schoolName}.\nStatus: ${input.status}`,
    start: {
      date: formatDateOnly(deadlineDate),
    },
    end: {
      date: formatDateOnly(endDate),
    },
    reminders: {
      useDefault: false,
      overrides: input.reminderMinutes.map(minutes => ({
        method: 'popup' as const,
        minutes,
      })),
    },
  };

  try {
    const url = input.existingEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${input.existingEventId}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const method = input.existingEventId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to sync event',
      };
    }

    const data = await response.json();
    return { success: true, eventId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
