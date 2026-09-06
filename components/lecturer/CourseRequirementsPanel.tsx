'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarPlus,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  apiFetch,
  getCourses,
  getMeetingRequirements,
  createMeetingRequirement,
  updateMeetingRequirement,
  deleteMeetingRequirement,
  MEETING_TYPE_LABELS,
} from '@/components/shared/api';
import type { CourseRecord, MeetingRequirementResponse, MeetingType, OrganizationalUnitRecord } from '@/components/shared/api';
import { useTimetableRealtime, TIMETABLE_REALTIME_EVENTS } from '@/lib/supabase/useTimetableRealtime';
import { toast } from 'sonner';

const MAX_TOTAL_PERIODS = 4;

interface CourseRequirementsPanelProps {
  unitId: string;
  lobbyId?: string | null;
  semesters?: { semesterId: string; semesterNo: number }[];
  onChanged?: () => void;
}

interface Row {
  requirementId: string;
  meetingType: MeetingType;
  sessionsPerWeek: number;
  periodsPerSession: number;
}

interface DraftRow {
  meetingType: MeetingType;
  sessionsPerWeek: number;
  periodsPerSession: number;
  saving: boolean;
}

export default function CourseRequirementsPanel({ unitId, lobbyId, semesters, onChanged }: CourseRequirementsPanelProps) {
  const [courses, setCourses] = useState<CourseRecord[] | null>(null);
  const [requirements, setRequirements] = useState<MeetingRequirementResponse[] | null>(null);
  const [units, setUnits] = useState<OrganizationalUnitRecord[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId);
  const [courseId, setCourseId] = useState<string>('');
  const [semesterNo, setSemesterNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  const selectedCourse = useMemo(
    () => courses?.find((c) => c.courseId === courseId) ?? null,
    [courses, courseId]
  );

  const rows: Row[] = useMemo(() => {
    if (!requirements || !selectedCourse) return [];
    return requirements
      .filter((r) => r.courseId === selectedCourse.courseId)
      .map((r) => ({
        requirementId: r.requirementId,
        meetingType: r.meetingType,
        sessionsPerWeek: r.sessionsPerWeek,
        periodsPerSession: r.periodsPerSession,
      }));
  }, [requirements, selectedCourse]);

  const totalPeriods = useMemo(
    () => rows.reduce((sum, r) => sum + r.sessionsPerWeek * r.periodsPerSession, 0),
    [rows]
  );

  const semestersArr = useMemo(() => semesters ?? [], [semesters]);
  const scopeSemesterId = useMemo(() => {
    if (semesterNo === null || semestersArr.length === 0) return undefined;
    return semestersArr.find((s) => s.semesterNo === semesterNo)?.semesterId ?? undefined;
  }, [semesterNo, semestersArr]);

  const load = useCallback(async () => {
    try {
      const [courseList, reqs] = await Promise.all([
        getCourses({ unitId: selectedUnitId, semesterId: scopeSemesterId }),
        getMeetingRequirements({ unitId: selectedUnitId, semesterId: scopeSemesterId }),
      ]);
      setCourses(courseList);
      setRequirements(reqs);
      setError(null);
      if (!courseId && courseList.length > 0) {
        setCourseId(courseList[0].courseId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load course requirements');
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId, courseId, scopeSemesterId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial requirements load
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrganizationalUnitRecord[]>('/api/organizational-units')
      .then((list) => {
        if (!cancelled) setUnits(list);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load units');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useTimetableRealtime(lobbyId, (event) => {
    if (
      event.type === TIMETABLE_REALTIME_EVENTS.COURSE_REQUIREMENT_CREATED ||
      event.type === TIMETABLE_REALTIME_EVENTS.COURSE_REQUIREMENT_UPDATED ||
      event.type === TIMETABLE_REALTIME_EVENTS.COURSE_REQUIREMENT_DELETED
    ) {
      getMeetingRequirements({ unitId: selectedUnitId, semesterId: scopeSemesterId })
        .then(setRequirements)
        .catch(() => {});
    }
  });

  const semesterOptions = useMemo(() => {
    if (semestersArr.length > 0) {
      return semestersArr
        .slice()
        .sort((a, b) => a.semesterNo - b.semesterNo)
        .map((s) => [s.semesterNo, []] as [number, CourseRecord[]]);
    }
    const map = new Map<number, CourseRecord[]>();
    (courses ?? []).forEach((c) => {
      map.set(c.semesterNo, [...(map.get(c.semesterNo) ?? []), c]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [courses, semestersArr]);

  const visibleCourses = useMemo(() => {
    if (semesterNo === null) return courses ?? [];
    return (courses ?? []).filter((c) => c.semesterNo === semesterNo);
  }, [courses, semesterNo]);

  const addDraft = () => {
    if (drafts.length >= 3) return;
    setDrafts((prev) => [
      ...prev,
      { meetingType: 'LECTURE', sessionsPerWeek: 1, periodsPerSession: 1, saving: false },
    ]);
  };

  const updateDraft = (index: number, patch: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const saveDraft = async (index: number) => {
    const draft = drafts[index];
    if (!selectedCourse || draft.saving) return;
    if (draft.sessionsPerWeek <= 0 || draft.periodsPerSession <= 0) {
      toast.error('Sessions and periods must be greater than 0');
      return;
    }
    const projected = totalPeriods + draft.sessionsPerWeek * draft.periodsPerSession;
    if (projected > MAX_TOTAL_PERIODS) {
      toast.error(
        `Total weekly periods would exceed ${MAX_TOTAL_PERIODS} for ${selectedCourse.courseCode}`
      );
      return;
    }
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, saving: true } : d)));
    try {
      await createMeetingRequirement({
        courseId: selectedCourse.courseId,
        meetingType: draft.meetingType,
        sessionsPerWeek: draft.sessionsPerWeek,
        periodsPerSession: draft.periodsPerSession,
      });
      toast.success('Requirement added');
      setDrafts((prev) => prev.filter((_, i) => i !== index));
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save requirement');
    } finally {
      setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, saving: false } : d)));
    }
  };

  const updateRow = async (row: Row, patch: Partial<Row>) => {
    if (!selectedCourse) return;
    const next = { ...row, ...patch };
    if (next.sessionsPerWeek <= 0 || next.periodsPerSession <= 0) {
      toast.error('Sessions and periods must be greater than 0');
      return;
    }
    const others = rows
      .filter((r) => r.requirementId !== row.requirementId)
      .reduce((sum, r) => sum + r.sessionsPerWeek * r.periodsPerSession, 0);
    if (others + next.sessionsPerWeek * next.periodsPerSession > MAX_TOTAL_PERIODS) {
      toast.error(`Total weekly periods would exceed ${MAX_TOTAL_PERIODS} for ${selectedCourse.courseCode}`);
      return;
    }
    try {
      await updateMeetingRequirement(row.requirementId, {
        courseId: selectedCourse.courseId,
        meetingType: next.meetingType,
        sessionsPerWeek: next.sessionsPerWeek,
        periodsPerSession: next.periodsPerSession,
      });
      toast.success('Requirement updated');
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update requirement');
    }
  };

  const deleteRow = async (row: Row) => {
    try {
      await deleteMeetingRequirement(row.requirementId);
      toast.success('Requirement removed');
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove requirement');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-lighter)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading course requirements...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-xs mb-3" style={{ color: 'var(--warning)' }}>{error}</div>
        <button onClick={load} className="btn btn-ghost btn-sm gap-1.5 cursor-pointer" style={{ color: 'var(--primary)' }}>
          <RotateCcw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--surface)' }}>
        <BookOpen size={15} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Course Meeting Requirements</span>
      </div>

      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--surface)' }}>
        <div className="relative mb-3">
          <select
            value={selectedUnitId}
            onChange={(e) => {
              setCourseId('');
              setSelectedUnitId(e.target.value);
            }}
            className="w-full appearance-none cursor-pointer"
            style={{
              fontSize: 13,
              padding: '8px 30px 8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--surface-border)',
              background: 'var(--divider)',
              color: 'var(--text)',
              outline: 'none',
            }}
          >
            {units.length === 0 ? (
              <option value={selectedUnitId}>{selectedUnitId}</option>
            ) : (
              units.map((u) => (
                <option key={u.unitId} value={u.unitId}>{u.unitName}</option>
              ))
            )}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button
            onClick={() => setSemesterNo(null)}
            className="cursor-pointer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 14,
              border: semesterNo === null ? '1.5px solid var(--primary)' : '1.5px solid var(--surface-border)',
              background: semesterNo === null ? 'rgba(40,114,161,0.15)' : 'var(--divider)',
              color: semesterNo === null ? 'var(--primary)' : 'var(--text-light)',
            }}
          >
            All semesters
          </button>
          {semesterOptions.map(([no]) => (
            <button
              key={no}
              onClick={() => setSemesterNo(no)}
              className="cursor-pointer"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 14,
                border: semesterNo === no ? '1.5px solid var(--primary)' : '1.5px solid var(--surface-border)',
                background: semesterNo === no ? 'rgba(40,114,161,0.15)' : 'var(--divider)',
                color: semesterNo === no ? 'var(--primary)' : 'var(--text-light)',
              }}
            >
              Semester {no}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="relative flex-1">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full appearance-none cursor-pointer"
              style={{
                fontSize: 13,
                padding: '8px 30px 8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--surface-border)',
                background: 'var(--divider)',
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {visibleCourses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseCode} — {c.courseName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        {!selectedCourse ? (
          <div className="text-center py-6 text-xs" style={{ color: 'var(--text-lighter)' }}>
            No courses available for this unit
          </div>
        ) : (
          <>
            {rows.length === 0 && drafts.length === 0 && (
              <div className="text-center py-6 text-xs" style={{ color: 'var(--text-lighter)' }}>
                No meeting requirements yet — add lecture/lab sessions below
              </div>
            )}

            {rows.map((row) => (
              <div
                key={row.requirementId}
                className="flex items-center gap-2 px-3 py-2.5 mb-2"
                style={{ borderRadius: 'var(--radius-md)', border: '1.5px solid var(--surface-border)', background: 'var(--divider)' }}
              >
                <span
                  className="badge badge-sm shrink-0"
                  style={{
                    background: row.meetingType === 'LECTURE' ? 'rgba(40,114,161,0.15)' : 'rgba(16,185,129,0.15)',
                    color: row.meetingType === 'LECTURE' ? 'var(--primary)' : '#059669',
                    border: 'none',
                  }}
                >
                  {MEETING_TYPE_LABELS[row.meetingType]}
                </span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min={1}
                    value={row.sessionsPerWeek}
                    onChange={(e) => updateRow(row, { sessionsPerWeek: Number(e.target.value) })}
                    className="w-14 text-center bg-transparent outline-none"
                    style={{ fontSize: 13, color: 'var(--text)', border: '1.5px solid var(--surface-border)', borderRadius: 8, padding: '4px 6px' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>sessions ×</span>
                  <input
                    type="number"
                    min={1}
                    value={row.periodsPerSession}
                    onChange={(e) => updateRow(row, { periodsPerSession: Number(e.target.value) })}
                    className="w-14 text-center bg-transparent outline-none"
                    style={{ fontSize: 13, color: 'var(--text)', border: '1.5px solid var(--surface-border)', borderRadius: 8, padding: '4px 6px' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>periods</span>
                </div>
                <span className="badge badge-sm shrink-0" style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706', border: 'none' }}>
                  {row.sessionsPerWeek * row.periodsPerSession} / wk
                </span>
                <button
                  onClick={() => deleteRow(row)}
                  className="btn btn-ghost btn-xs btn-circle cursor-pointer shrink-0"
                  style={{ color: 'var(--danger)' }}
                  title="Remove requirement"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {drafts.map((draft, index) => (
              <div
                key={`draft-${index}`}
                className="flex items-center gap-2 px-3 py-2.5 mb-2"
                style={{ borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--primary)', background: 'rgba(40,114,161,0.06)' }}
              >
                <select
                  value={draft.meetingType}
                  onChange={(e) => updateDraft(index, { meetingType: e.target.value as MeetingType })}
                  className="cursor-pointer shrink-0"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: 'none',
                    background: draft.meetingType === 'LECTURE' ? 'rgba(40,114,161,0.15)' : 'rgba(16,185,129,0.15)',
                    color: draft.meetingType === 'LECTURE' ? 'var(--primary)' : '#059669',
                    outline: 'none',
                  }}
                >
                  <option value="LECTURE">Lecture</option>
                  <option value="LAB">Lab</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={draft.sessionsPerWeek}
                  onChange={(e) => updateDraft(index, { sessionsPerWeek: Number(e.target.value) })}
                  className="w-14 text-center bg-transparent outline-none"
                  style={{ fontSize: 13, color: 'var(--text)', border: '1.5px solid var(--surface-border)', borderRadius: 8, padding: '4px 6px' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>sessions ×</span>
                <input
                  type="number"
                  min={1}
                  value={draft.periodsPerSession}
                  onChange={(e) => updateDraft(index, { periodsPerSession: Number(e.target.value) })}
                  className="w-14 text-center bg-transparent outline-none"
                  style={{ fontSize: 13, color: 'var(--text)', border: '1.5px solid var(--surface-border)', borderRadius: 8, padding: '4px 6px' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>periods</span>
                <button
                  onClick={() => saveDraft(index)}
                  disabled={draft.saving}
                  className="btn btn-xs btn-primary gap-1 border-none text-white cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {draft.saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save
                </button>
                <button
                  onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                  className="btn btn-ghost btn-xs btn-circle cursor-pointer shrink-0"
                  style={{ color: 'var(--text-light)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={addDraft}
                disabled={drafts.length >= 3}
                className="btn btn-ghost btn-xs gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--primary)' }}
              >
                <Plus size={13} /> Add meeting
              </button>
              <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-light)' }}>
                <CalendarPlus size={12} />
                <span>
                  Total:{' '}
                  <b style={{ color: totalPeriods > MAX_TOTAL_PERIODS ? 'var(--danger)' : 'var(--accent)' }}>
                    {totalPeriods}
                  </b>{' '}
                  / {MAX_TOTAL_PERIODS} periods per week
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}