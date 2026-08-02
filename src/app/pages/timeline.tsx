import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageSkeleton } from '../components/page-skeleton';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import {
  displayProgramStatus,
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from '../../lib/program-status';
import { getShortTimezoneLabel } from '../../lib/timezone';
import { Calendar, Clock, AlertCircle, ArrowRight, Download, X } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from 'sonner';
import { initGoogleCalendarAuth, syncEventToGoogleCalendar } from '../../lib/google-calendar';

interface DbProgram {
  id: string;
  school_name: string;
  program_name: string;
  degree_type: string;
  country: string;
  deadline: string | null;
  deadline_time?: string | null;
  deadline_timezone?: string | null;
  status: string;
  google_calendar_event_id?: string | null;
}

type UrgencyBucket = 'urgent' | 'soon' | 'upcoming' | 'future';

interface ProgramWithUrgency extends DbProgram {
  daysLeft: number | null;
  bucket: UrgencyBucket;
}

function getDaysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getUrgencyBucket(daysLeft: number): UrgencyBucket {
  if (daysLeft <= 7) return 'urgent';
  if (daysLeft <= 30) return 'soon';
  if (daysLeft <= 60) return 'upcoming';
  return 'future';
}

function getDaysBadgeClass(daysLeft: number): string {
  if (daysLeft <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (daysLeft <= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
}

function getLeftBorderClass(bucket: UrgencyBucket): string {
  switch (bucket) {
    case 'urgent':
      return 'border-l-red-600';
    case 'soon':
      return 'border-l-amber-600';
    case 'upcoming':
      return 'border-l-blue-600';
    default:
      return 'border-l-green-600';
  }
}

const REMINDER_PRESETS = [
  { label: '1 week before', minutes: 10080 },
  { label: '3 days before', minutes: 4320 },
  { label: '1 day before', minutes: 1440 },
  { label: '1 hour before', minutes: 60 },
  { label: 'On the deadline day', minutes: 0 },
];

export function Timeline() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramWithUrgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const isOnline = useOnlineStatus();
  const [selectedUrgencies, setSelectedUrgencies] = usePersistedState<string[]>('grados_deadlines_urgency', []);
  const [showExportModal, setShowExportModal] = useState(false);
  const [reminderIntervals, setReminderIntervals] = usePersistedState<number[]>(
    'grados_ics_reminders',
    [10080, 4320, 1440, 0] // 7 days, 3 days, 1 day, day of
  );
  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<'months' | 'weeks' | 'days' | 'hours' | 'minutes'>('days');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });

  const fetchPrograms = useCallback(async () => {
    setLoading(true);

    if (!navigator.onLine) {
      setFetchError(true);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrograms([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('programs')
        .select('id, school_name, program_name, degree_type, country, deadline, deadline_time, deadline_timezone, status, google_calendar_event_id')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      setFetchError(false);

      const withUrgency = ((data ?? []) as DbProgram[]).flatMap(program => {
        const daysLeft = getDaysLeft(program.deadline);
        if (daysLeft === null) return []; // skip programs with no deadline
        return [{
          ...program,
          daysLeft,
          bucket: getUrgencyBucket(daysLeft),
        }];
      });

      setPrograms(withUrgency);
    } catch (err: any) {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.code === 'NETWORK_ERROR'
      ) {
        setFetchError(true);
      } else {
        toast.error('Failed to load data');
        setFetchError(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && fetchError) {
      setFetchError(false);
      fetchPrograms();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const urgent = useMemo(() => programs.filter(p => p.bucket === 'urgent'), [programs]);
  const soon = useMemo(() => programs.filter(p => p.bucket === 'soon'), [programs]);
  const upcoming = useMemo(() => programs.filter(p => p.bucket === 'upcoming'), [programs]);
  const future = useMemo(() => programs.filter(p => p.bucket === 'future'), [programs]);

  const eligiblePrograms = programs.filter(p => p.deadline);

  const handleUrgencyClick = (urgency: string) => {
    setSelectedUrgencies(prev =>
      prev.includes(urgency)
        ? prev.filter(u => u !== urgency)
        : [...prev, urgency]
    );
  };

  const filteredPrograms = useMemo(() => {
    if (selectedUrgencies.length === 0) return programs;
    return programs.filter(p => selectedUrgencies.includes(p.bucket));
  }, [programs, selectedUrgencies]);

  const filteredUrgent = useMemo(() => filteredPrograms.filter(p => p.bucket === 'urgent'), [filteredPrograms]);
  const filteredSoon = useMemo(() => filteredPrograms.filter(p => p.bucket === 'soon'), [filteredPrograms]);
  const filteredUpcoming = useMemo(() => filteredPrograms.filter(p => p.bucket === 'upcoming'), [filteredPrograms]);
  const filteredFuture = useMemo(() => filteredPrograms.filter(p => p.bucket === 'future'), [filteredPrograms]);

  const toggleReminder = (minutes: number) => {
    setReminderIntervals(prev =>
      prev.includes(minutes)
        ? prev.filter(m => m !== minutes)
        : [...prev, minutes].sort((a, b) => b - a)
    );
  };

  const generateAndDownloadICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GradOS//Application Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const formatUTC = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const programsToExport = programs.filter(
      p => selectedForExport.includes(p.id) && p.deadline
    );

    programsToExport.forEach(program => {
      // Format the deadline as an all-day event (single day, no multi-day span)
      // VALUE=DATE uses YYYYMMDD format; DTEND is the day AFTER (exclusive end per iCal spec)
      const deadlineDateRaw = program.deadline!.replace(/-/g, '');
      const nextDay = new Date(program.deadline!);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayRaw = nextDay.toISOString().slice(0, 10).replace(/-/g, '');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${program.id}@grados.app`);
      lines.push(`DTSTAMP:${formatUTC(new Date())}`);
      lines.push(`DTSTART;VALUE=DATE:${deadlineDateRaw}`);
      lines.push(`DTEND;VALUE=DATE:${nextDayRaw}`);
      lines.push(`SUMMARY:DEADLINE: ${program.school_name} - ${program.program_name}`);

      const descParts = [
        `Application deadline for ${program.program_name} at ${program.school_name}.`,
      ];
      if (program.deadline_time) {
        descParts.push(`\\nDue by: ${program.deadline_time}${program.deadline_timezone ? ' ' + program.deadline_timezone : ''}`);
      }
      descParts.push(`\\nStatus: ${program.status || 'Not Started'}`);

      lines.push(`DESCRIPTION:${descParts.join('')}`);
      lines.push('STATUS:CONFIRMED');
      // Tell Apple Calendar to use our alarms, not the default 30-min one
      lines.push('X-APPLE-DEFAULT-ALARM:TRUE');

      // Add a VALARM for each selected reminder interval
      reminderIntervals.forEach(minutes => {
        const triggerValue = minutes === 0
          ? 'TRIGGER:PT0S'
          : `TRIGGER:-PT${minutes}M`;

        const reminderLabel = minutes === 0
          ? `Today: ${program.school_name} deadline`
          : minutes >= 1440
            ? `${Math.floor(minutes / 1440)} day(s) until ${program.school_name} deadline`
            : minutes >= 60
              ? `${Math.floor(minutes / 60)} hour(s) until ${program.school_name} deadline`
              : `${minutes} min until ${program.school_name} deadline`;

        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push(triggerValue);
        lines.push(`DESCRIPTION:${reminderLabel}`);
        lines.push('END:VALARM');
      });

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    // ICS requires CRLF line endings
    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GradOS-Deadlines.ics';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Calendar file downloaded');
  };

  const DeadlineCard = ({ program }: { program: ProgramWithUrgency }) => {

    return (
      <div
        className={`p-4 rounded-lg border transition-colors border-l-[3px] ${getLeftBorderClass(
          program.bucket
        )} border-border hover:bg-accent/50`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="truncate font-medium">{program.school_name}</h4>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDaysBadgeClass(program.daysLeft!)}`}
              >
                {program.daysLeft! >= 0 ? `${program.daysLeft}d left` : 'Overdue'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {program.degree_type} in {program.program_name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(program.deadline)}</span>
              {program.deadline_time && (
                <span>
                  at {program.deadline_time}
                  {program.deadline_timezone && program.deadline_timezone !== 'UTC' && (
                    <span className="ml-1 opacity-70">
                      ({getShortTimezoneLabel(program.deadline_timezone)})
                    </span>
                  )}
                </span>
              )}
              <Badge
                variant={getStatusBadgeVariant(program.status)}
                className={`text-xs ${getStatusBadgeClassName(program.status)}`}
              >
                {displayProgramStatus(program.status)}
              </Badge>
            </div>
            {(() => {
              const showOriginalTz = localStorage.getItem('grados_show_original_tz') === 'true';
              return showOriginalTz && program.deadline_timezone ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {program.deadline_time} {program.deadline_timezone.split('/').pop()?.replace('_', ' ')}
                </p>
              ) : null;
            })()}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/applications/${program.id}`)}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <PageSkeleton />;

  if (fetchError || !isOnline) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Deadlines"
          subtitle="All application deadlines in one place"
          backTo="/dashboard"
        />
        <OfflinePage
          onRetry={() => { setFetchError(false); fetchPrograms(); }}
          pageName="your deadlines"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Deadlines"
        subtitle="All application deadlines in one place"
        backTo="/dashboard"
      />

      {/* Export .ics Modal */}
      {showExportModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setShowExportModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-background border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]">

            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="text-base font-semibold">Export calendar file</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg hover:bg-accent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Section A: Select applications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Select applications to export</p>
                  <button
                    onClick={() =>
                      setSelectedForExport(
                        selectedForExport.length === eligiblePrograms.length
                          ? []
                          : eligiblePrograms.map(p => p.id)
                      )
                    }
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {selectedForExport.length === eligiblePrograms.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </button>
                </div>

                <div className="space-y-0.5 border border-border rounded-lg overflow-hidden">
                  {eligiblePrograms.map((program, index) => (
                    <label
                      key={program.id}
                      className={`flex items-center gap-3 py-2.5 px-3 hover:bg-accent cursor-pointer${
                        index < eligiblePrograms.length - 1 ? ' border-b border-border' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForExport.includes(program.id)}
                        onChange={() => {
                          setSelectedForExport(prev =>
                            prev.includes(program.id)
                              ? prev.filter(id => id !== program.id)
                              : [...prev, program.id]
                          );
                        }}
                        className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{program.school_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {program.program_name} · {program.deadline}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section B: Reminder intervals */}
              <div>
                <p className="text-sm font-semibold mb-1">Reminder notifications</p>
                <p className="text-xs text-muted-foreground mb-3">
                  These reminders will be embedded in your calendar file.
                </p>

                <div className="space-y-2">
                  {REMINDER_PRESETS.map(preset => (
                    <label
                      key={preset.minutes}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={reminderIntervals.includes(preset.minutes)}
                        onChange={() => toggleReminder(preset.minutes)}
                        className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm">{preset.label}</span>
                    </label>
                  ))}
                </div>

                {/* Custom reminder input */}
                <div className="pt-3 border-t border-border mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Custom reminder
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={customValue}
                      onChange={e => setCustomValue(e.target.value)}
                      placeholder="2"
                      className="w-16 px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={customUnit}
                      onChange={e => setCustomUnit(e.target.value as any)}
                      className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none"
                    >
                      <option value="months">months before</option>
                      <option value="weeks">weeks before</option>
                      <option value="days">days before</option>
                      <option value="hours">hours before</option>
                      <option value="minutes">minutes before</option>
                    </select>
                    <button
                      onClick={() => {
                        const num = parseInt(customValue);
                        if (!num || num < 1) return;

                        let minutes = 0;
                        switch (customUnit) {
                          case 'months': minutes = num * 30 * 24 * 60; break;
                          case 'weeks': minutes = num * 7 * 24 * 60; break;
                          case 'days': minutes = num * 24 * 60; break;
                          case 'hours': minutes = num * 60; break;
                          case 'minutes': minutes = num; break;
                        }

                        if (!reminderIntervals.includes(minutes)) {
                          setReminderIntervals(prev => [...prev, minutes].sort((a, b) => b - a));
                        }
                        setCustomValue('');
                      }}
                      className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Show custom interval tags */}
                  {reminderIntervals.filter(m => ![10080, 4320, 1440, 60, 0].includes(m)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {reminderIntervals
                        .filter(m => ![10080, 4320, 1440, 60, 0].includes(m))
                        .map(m => {
                          const label = m >= 43200
                            ? `${Math.round(m / 43200)} month(s) before`
                            : m >= 10080
                            ? `${Math.round(m / 10080)} week(s) before`
                            : m >= 1440
                            ? `${Math.round(m / 1440)} day(s) before`
                            : m >= 60
                            ? `${Math.round(m / 60)} hour(s) before`
                            : `${m} min before`;
                          return (
                            <span
                              key={m}
                              className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full"
                            >
                              {label}
                              <button
                                onClick={() => setReminderIntervals(prev => prev.filter(x => x !== m))}
                                className="hover:text-red-500 ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Info note */}
              <p className="text-xs text-muted-foreground pb-1">
                Re-importing this file will update existing events, not create duplicates.
                Safe to re-export when you add new schools.
              </p>
            </div>

            {/* Sticky footer */}
            <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
              {/* Google Calendar sync */}
              <div>
                <button
                  onClick={() => {
                    initGoogleCalendarAuth(
                      async () => {
                        setSyncing(true);
                        const toSync = programs.filter(
                          p => selectedForExport.includes(p.id) && p.deadline
                        );
                        setSyncProgress({ done: 0, total: toSync.length });

                        for (const program of toSync) {
                          const result = await syncEventToGoogleCalendar({
                            programId: program.id,
                            schoolName: program.school_name,
                            programName: program.program_name,
                            deadline: program.deadline!,
                            status: program.status || 'Not Started',
                            existingEventId: program.google_calendar_event_id,
                            reminderMinutes: reminderIntervals,
                          });

                          if (result.success && result.eventId) {
                            await supabase
                              .from('programs')
                              .update({ google_calendar_event_id: result.eventId })
                              .eq('id', program.id);
                          }

                          setSyncProgress(prev => ({ ...prev, done: prev.done + 1 }));
                        }

                        setSyncing(false);
                        toast.success(`Synced ${toSync.length} deadline(s) to Google Calendar`);
                        setShowExportModal(false);
                      },
                      () => {
                        setSyncing(false);
                        toast.error('Google Calendar sync failed. Please try again.');
                      }
                    );
                  }}
                  disabled={syncing || selectedForExport.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {syncing
                    ? `Syncing... (${syncProgress.done}/${syncProgress.total})`
                    : 'Sync to Google Calendar'
                  }
                </button>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Recommended for Google Calendar users — reminders work reliably
                </p>
              </div>

              {/* ICS export */}
              <div className="flex gap-3">
                <button
                  id="export-ics-confirm"
                  onClick={() => {
                    setShowExportModal(false);
                    generateAndDownloadICS();
                  }}
                  disabled={selectedForExport.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  Export {selectedForExport.length > 0 ? `(${selectedForExport.length})` : ''} calendar file
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Use .ics export for Apple Calendar, Outlook, or other calendar apps
              </p>
            </div>
          </div>
        </>
      )}

      {/* Transparent overlay behind cards — clears selection on outside click */}
      {selectedUrgencies.length > 0 && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setSelectedUrgencies([])}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative z-10">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedForExport(eligiblePrograms.map(p => p.id));
              setShowExportModal(true);
            }}
            disabled={loading || programs.length === 0}
            id="export-ics-button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export .ics
          </Button>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
        <Card
          className={`border-2 cursor-pointer transition-all ${
            selectedUrgencies.includes('urgent')
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : 'border-transparent hover:border-border border-red-200 dark:border-red-800'
          }`}
          onClick={() => handleUrgencyClick('urgent')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{loading ? '—' : urgent.length}</div>
            <p className="text-xs text-muted-foreground mt-1">≤ 7 days away</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${
            selectedUrgencies.includes('soon')
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : 'border-transparent hover:border-border border-yellow-200 dark:border-yellow-800'
          }`}
          onClick={() => handleUrgencyClick('soon')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{loading ? '—' : soon.length}</div>
            <p className="text-xs text-muted-foreground mt-1">8–30 days away</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${
            selectedUrgencies.includes('upcoming')
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : 'border-transparent hover:border-border border-blue-200 dark:border-blue-800'
          }`}
          onClick={() => handleUrgencyClick('upcoming')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-blue-600">{loading ? '—' : upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">31–60 days away</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${
            selectedUrgencies.includes('future')
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : 'border-transparent hover:border-border border-green-200 dark:border-green-800'
          }`}
          onClick={() => handleUrgencyClick('future')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Future</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{loading ? '—' : future.length}</div>
            <p className="text-xs text-muted-foreground mt-1">&gt; 60 days away</p>
          </CardContent>
        </Card>
      </div>

        {/* Clear selection link */}
        {selectedUrgencies.length > 0 && (
          <div className="px-4 md:px-6 -mt-2 mb-2 relative z-10">
            <button
              onClick={() => setSelectedUrgencies([])}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <X size={11} />
              Clear selection
            </button>
          </div>
        )}

        <div className="relative z-10">
          {filteredPrograms.length === 0 && programs.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <h3 className="text-base mb-2">No deadlines match your filters</h3>
              <button
                onClick={() => setSelectedUrgencies([])}
                className="text-sm text-indigo-600 hover:underline mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <h3 className="text-base mb-2">No deadlines to track</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                Add schools to your dashboard and their deadlines will appear here.
              </p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredUrgent.length > 0 && (
                <div className="space-y-3">
                  {filteredUrgent.map(p => (
                    <DeadlineCard key={p.id} program={p} />
                  ))}
                </div>
              )}
              {filteredSoon.length > 0 && (
                <div className="space-y-3">
                  {filteredSoon.map(p => (
                    <DeadlineCard key={p.id} program={p} />
                  ))}
                </div>
              )}
              {filteredUpcoming.length > 0 && (
                <div className="space-y-3">
                  {filteredUpcoming.map(p => (
                    <DeadlineCard key={p.id} program={p} />
                  ))}
                </div>
              )}
              {filteredFuture.length > 0 && (
                <div className="space-y-3">
                  {filteredFuture.map(p => (
                    <DeadlineCard key={p.id} program={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
