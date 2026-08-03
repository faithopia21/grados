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
    extendedProperties: {
      private: {
        gradosApp: 'true',
        gradosProgramId: input.programId,
      },
    },
  };

  try {
    // STEP 1 — search for an existing event tagged with this exact program ID
    const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=gradosProgramId%3D${input.programId}`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    let existing;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      existing = searchData.items?.[0];
    }

    const url = existing
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.id}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const method = existing ? 'PATCH' : 'POST';

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

export async function clearAllGradosEvents(): Promise<{ deleted: number; error?: string }> {
  if (!accessToken) {
    return { deleted: 0, error: 'Not authenticated' };
  }

  try {
    let allEvents: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const params = new URLSearchParams({
        q: 'DEADLINE:',
        timeMin: '2020-01-01T00:00:00Z',
        timeMax: '2035-01-01T00:00:00Z',
        maxResults: '250',
        singleEvents: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const listRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const listData = await listRes.json();
      const items = (listData.items || []).filter(
        (e: any) =>
          typeof e.summary === 'string' &&
          e.summary.startsWith('DEADLINE:')
      );
      allEvents = allEvents.concat(items);
      pageToken = listData.nextPageToken;
    } while (pageToken);

    let deleted = 0;
    for (const event of allEvents) {
      const delRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (delRes.ok || delRes.status === 410) deleted++;
    }

    return { deleted };
  } catch (err: any) {
    return { deleted: 0, error: err.message };
  }
}

