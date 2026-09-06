'use client';

import { useEffect, useRef } from 'react';

/**
 * Realtime events pushed by the backend timetable realtime controller.
 * Every payload carries a `type` field naming the event; additional fields
 * are event-specific (generationId, scheduleId, lockOwner, day, ...).
 */
export interface TimetableRealtimeEvent {
  type: string;
  lobbyId?: string;
  generationId?: string;
  termId?: string;
  mode?: string;
  scheduleId?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  lockOwner?: string | null;
  expiresAt?: string | null;
  day?: number | null;
  period?: number | null;
  requirementId?: string;
  courseId?: string;
  courseCode?: string;
  groupId?: string;
  [key: string]: unknown;
}

export const TIMETABLE_REALTIME_EVENTS = {
  MANAGEMENT_STARTED: 'TIMETABLE_MANAGEMENT_STARTED',
  EDIT_STARTED: 'TIMETABLE_EDIT_STARTED',
  LOBBY_CANCELLED: 'LOBBY_CANCELLED',
  LOBBY_MEMBER_JOINED: 'LOBBY_MEMBER_JOINED',
  GENERATION_COMPLETED: 'GENERATION_COMPLETED',
  GENERATION_STARTED: 'GENERATION_STARTED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  SCHEDULE_CREATED: 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED: 'SCHEDULE_UPDATED',
  SCHEDULE_DELETED: 'SCHEDULE_DELETED',
  SCHEDULE_LOCKED: 'SCHEDULE_LOCKED',
  SCHEDULE_UNLOCKED: 'SCHEDULE_UNLOCKED',
  DRAG_STARTED: 'DRAG_STARTED',
  DRAG_MOVED: 'DRAG_MOVED',
  DRAG_ENDED: 'DRAG_ENDED',
  TIMETABLE_PUBLISHED: 'TIMETABLE_PUBLISHED',
  TIMETABLE_DELETED: 'TIMETABLE_DELETED',
  COURSE_REQUIREMENT_CREATED: 'COURSE_REQUIREMENT_CREATED',
  COURSE_REQUIREMENT_UPDATED: 'COURSE_REQUIREMENT_UPDATED',
  COURSE_REQUIREMENT_DELETED: 'COURSE_REQUIREMENT_DELETED',
  TEACHING_GROUP_CREATED: 'TEACHING_GROUP_CREATED',
  TEACHING_GROUP_UPDATED: 'TEACHING_GROUP_UPDATED',
  TEACHING_GROUP_DELETED: 'TEACHING_GROUP_DELETED',
  SNAPSHOT_STATE: 'SNAPSHOT_STATE',
} as const;

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;

/** Which realtime channel to subscribe to (lobby-scoped or generation-scoped). */
export type TimetableRealtimeScope =
  | { kind: 'lobby'; lobbyId: string }
  | { kind: 'generation'; generationId: string };

function streamUrl(scope: TimetableRealtimeScope): string {
  return scope.kind === 'lobby'
    ? `/api/backend/api/realtime/lobbies/${encodeURIComponent(scope.lobbyId)}/stream`
    : `/api/backend/api/realtime/generations/${encodeURIComponent(scope.generationId)}/stream`;
}

/**
 * SSE subscription to a timetable realtime stream.
 *
 * The backend relays events only to authorized staff, so the stream itself
 * doubles as an access check: an unauthorized caller gets a non-2xx response
 * and the hook stops retrying until the scope changes.
 *
 * `onConnected` fires after the stream is (re-)established. Because SSE has no
 * replay, every reconnect is a signal that events may have been missed —
 * consumers MUST re-fetch authoritative state there to stay correct.
 */
function useTimetableRealtimeScope(
  scope: TimetableRealtimeScope | null | undefined,
  onEvent: (event: TimetableRealtimeEvent) => void,
  onConnected?: () => void,
): void {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  const scopeKey = scope
    ? scope.kind === 'lobby' ? `l:${scope.lobbyId}` : `g:${scope.generationId}`
    : null;

  useEffect(() => {
    if (!scope) return;

    let source: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const open = () => {
      if (closed) return;
      source = new EventSource(streamUrl(scope));

      source.onopen = () => {
        attempt = 0;
        // Fires on first connect and after every reconnect: SSE has no replay,
        // so consumers must merge the authoritative server snapshot here.
        onConnectedRef.current?.();
      };

      source.onmessage = (msg) => {
        if (closed || !msg.data) return;
        try {
          const event = JSON.parse(msg.data) as TimetableRealtimeEvent;
          if (event && typeof event.type === 'string') {
            onEventRef.current(event);
          }
        } catch {
          // Ignore malformed payloads; full state is re-fetched on reconnect.
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        attempt += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);
        reconnectTimer = setTimeout(open, delay);
      };
    };

    open();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    };
    // scopeKey identifies the exact channel; scope object identity may vary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);
}

/**
 * SSE subscription to a timetable generation lobby stream. Every event is
 * lobby-scoped, so consumers see what happens inside their own lobby.
 */
export function useTimetableRealtime(
  lobbyId: string | null | undefined,
  onEvent: (event: TimetableRealtimeEvent) => void,
  onConnected?: () => void,
): void {
  useTimetableRealtimeScope(
    lobbyId ? { kind: 'lobby', lobbyId } : null,
    onEvent,
    onConnected,
  );
}

/**
 * SSE subscription to a single generation's stream. Works for both lobby-linked
 * and direct (lobby-less) drafts, so live drag/lock/schedule events reach every
 * HOD browser viewing that generation — no active generation lobby required.
 */
export function useTimetableRealtimeGeneration(
  generationId: string | null | undefined,
  onEvent: (event: TimetableRealtimeEvent) => void,
  onConnected?: () => void,
): void {
  useTimetableRealtimeScope(
    generationId ? { kind: 'generation', generationId } : null,
    onEvent,
    onConnected,
  );
}