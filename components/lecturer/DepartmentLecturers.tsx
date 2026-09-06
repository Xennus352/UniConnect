'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Users, Eye, Plus, Trash2, X, Loader2, Lock, CalendarDays, AlertTriangle } from 'lucide-react';
import {
  getCurrentStaff,
  getTerms,
  getLecturers,
  getTeachingAssignments,
  getCourses,
  getSections,
  getGenerationScope,
  getPublishedSchedules,
  getTimeSlots,
  createTeachingAssignment,
  deleteTeachingAssignment,
  timeSlotOffsetMinutes,
  reanchorTime,
} from '@/components/shared/api';
import type {
  StaffRecord,
  LecturerResponse,
  TeachingAssignmentResponse,
  CourseRecord,
  SectionRecord,
  GenerationScopeSemester,
  ScheduleResponse,
  AcademicTermRecord,
  TimeSlotResponse,
} from '@/components/shared/api';
import { fmtRange12 } from '@/components/shared/time';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const PERIODS = [1, 2, 3, 4, 5, 6];

const LUNCH_MARK = 'Lunch';

/** Vertical lunch text: each letter rotated so its head faces left, stacked from bottom to top. */
function lunchColumn() {
  const chars = Array.from(LUNCH_MARK);
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        lineHeight: 1.8,
        gap: 2,
        letterSpacing: 1,
        fontWeight: 800,
        fontSize: 9.5,
      }}
    >
      {chars.map((ch, idx) => (
        <span key={idx} style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

const POSITION_STYLES: Record<string, { bg: string; color: string }> = {
  HOD: { bg: 'rgba(40,114,161,0.14)', color: 'var(--primary)' },
  LECTURER: { bg: 'var(--divider)', color: 'var(--text-light)' },
};

const SEMESTER_COLORS = ['#2872a1', '#a14a28', '#2a8a5a', '#6d3fa1', '#b08900', '#7a3b8f'];

const semesterColor = (semesterNo: number): string => SEMESTER_COLORS[(semesterNo - 1) % SEMESTER_COLORS.length];

function positionBadge(position: string) {
  const style = POSITION_STYLES[position] ?? { bg: 'var(--divider)', color: 'var(--text-light)' };
  return (
    <span
      key={position}
      style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: style.bg, color: style.color, textTransform: 'uppercase' }}
    >
      {position === 'HOD' ? 'HOD' : position.toLowerCase()}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 13,
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--base-100)',
  color: 'var(--text)',
  outline: 'none',
};

export function DepartmentLecturersSection() {
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [terms, setTerms] = useState<AcademicTermRecord[]>([]);
  const [termId, setTermId] = useState('');
  const [lecturers, setLecturers] = useState<LecturerResponse[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignmentResponse[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [scope, setScope] = useState<GenerationScopeSemester[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [selected, setSelected] = useState<LecturerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [formCourseId, setFormCourseId] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [saving, setSaving] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlotResponse[]>([]);
  const [confirmAssignment, setConfirmAssignment] = useState<TeachingAssignmentResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  const unitLecturers = useMemo(
    () => lecturers.filter((l) => staff && l.unitId === staff.unitId),
    [lecturers, staff]
  );

  const load = useCallback(
    async (tId: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const current = staff ?? (await getCurrentStaff());
        if (!staff) setStaff(current);
        const [list, ass, cols, secs, scp, sched, slotList] = await Promise.all([
          getLecturers(tId),
          getTeachingAssignments({ termId: tId }),
          getCourses({ unitId: current.unitId }),
          getSections(),
          getGenerationScope(tId),
          getPublishedSchedules(tId),
          getTimeSlots(),
        ]);
        setLecturers(list);
        setAssignments(ass.filter((a) => a.unitId === current.unitId));
        setCourses(cols);
        setSections(secs);
        setScope(scp);
        setSchedules(sched);
        setTimeSlots(slotList);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load lecturers');
      } finally {
        setLoading(false);
      }
    },
    [staff]
  );

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const current = await getCurrentStaff();
        if (!on) return;
        setStaff(current);
        const termsList = await getTerms();
        if (!on) return;
        setTerms(termsList);
        const active = termsList.find((t) => t.status === 'ACTIVE') ?? termsList[0];
        if (active) setTermId(active.termId);
      } catch {
        // Terms could not be loaded; the table will surface the load error.
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload on term change
    if (termId) load(termId);
  }, [termId, load]);

  const isHod = staff ? staff.positions.includes('HOD') : false;

  const sectionOptionsForCourse = useMemo(() => {
    const course = courses.find((c) => c.courseId === formCourseId);
    if (!course) return sections;
    const sem = scope.find((s) => s.semesterNo === course.semesterNo);
    return sem && sem.sections.length > 0 ? sem.sections.map((s) => ({ sectionId: s.sectionId, sectionName: s.sectionName })) : sections;
  }, [courses, formCourseId, scope, sections]);

  const semestersTaughtOf = (l: LecturerResponse): number[] => {
    const set = new Set<number>();
    l.assignedCourses.forEach((c) => set.add(c.semesterNo));
    return [...set].sort((a, b) => a - b);
  };

  const assignmentsOf = (l: LecturerResponse): TeachingAssignmentResponse[] =>
    assignments.filter((a) => a.staffId === l.staffId);

  const schedulesOf = (l: LecturerResponse): ScheduleResponse[] =>
    schedules.filter((s) => s.staffName === l.staffName || s.staffNames.some((n) => n === l.staffName));

  const selectLecturer = (l: LecturerResponse) => setSelected(l);

  const openAssign = (l: LecturerResponse) => {
    setSelected(l);
    setFormStaffId(l.staffId);
    setFormCourseId('');
    setFormSectionId('');
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!staff || !termId || saving) return;
    if (!formCourseId || !formSectionId || !formStaffId) {
      toast.error('Choose a course, a section and a lecturer to assign');
      return;
    }
    if (!courses.some((c) => c.courseId === formCourseId)) {
      toast.error('The selected course no longer exists');
      return;
    }
    setSaving(true);
    try {
      await createTeachingAssignment({
        courseId: formCourseId,
        staffId: formStaffId,
        sectionId: formSectionId,
        termId,
        assignmentStatus: 'ACTIVE',
        assignedByStaffId: staff.staffId,
      });
      toast.success('Lecturer assigned to the course');
      setAssignOpen(false);
      const [ass, list] = await Promise.all([getTeachingAssignments({ termId }), getLecturers(termId)]);
      setAssignments(ass.filter((a) => a.unitId === staff.unitId));
      setLecturers(list);
      const updated = list.find((l) => l.staffId === formStaffId);
      if (updated && selected?.staffId === formStaffId) setSelected(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign lecturer');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoveAssignment = (assignment: TeachingAssignmentResponse) => setConfirmAssignment(assignment);

  const removeAssignment = async (assignment: TeachingAssignmentResponse) => {
    if (!staff || removing) return;
    setRemoving(true);
    try {
      await deleteTeachingAssignment(assignment.assignmentId);
      toast.success('Assignment removed');
      setConfirmAssignment(null);
      const ass = await getTeachingAssignments({ termId });
      setAssignments(ass.filter((a) => a.unitId === staff.unitId));
      if (selected) setLecturers(await getLecturers(termId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove assignment');
    } finally {
      setRemoving(false);
    }
  };

  const selectedAssignments = selected ? assignmentsOf(selected) : [];
  const selectedSchedules = selected ? schedulesOf(selected) : [];

  const timeOffset = useMemo(() => timeSlotOffsetMinutes(timeSlots), [timeSlots]);

  const slotLabel = (period: number): string => {
    const slot = timeSlots.find((t) => t.periodNo === period);
    return slot ? fmtRange12(reanchorTime(slot.startTime, timeOffset), reanchorTime(slot.endTime, timeOffset)) : '—';
  };

  const sectionNamesOf = (s: ScheduleResponse): string =>
    s.sections && s.sections.length > 0 ? s.sections.join(', ') : s.sectionName;

  return (
    <div className="p-2 md:p-4">
      <div
        className="bg-base-100"
        style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap' }}>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
              <Users size={18} style={{ color: 'var(--primary)' }} /> Lecturers
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: '4px 0 0' }}>
              {staff ? `${staff.unitName} unit — ${unitLecturers.length} lecturer${unitLecturers.length === 1 ? '' : 's'}` : 'Loading …'}
            </p>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)' }}>Term</label>
            <select
              value={termId}
              onChange={(e) => {
                setTermId(e.target.value);
                setSelected(null);
              }}
              className="cursor-pointer"
              style={{ ...inputStyle, width: 'auto', minWidth: 150 }}
            >
              {terms.map((t) => (
                <option key={t.termId} value={t.termId}>
                  {String(t.academicYear)} {t.status === 'ACTIVE' ? '(active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isHod && staff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', fontSize: 12, color: 'var(--text-light)', background: 'var(--divider)' }}>
            <Lock size={12} /> View only — only a head of department (HOD) can assign lecturers to courses.
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 20px', color: 'var(--text-light)', fontSize: 13 }}>
              <Loader2 size={16} className="animate-spin" /> Loading lecturers…
            </div>
          ) : loadError ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: '#dc2626' }}>{loadError}</div>
          ) : unitLecturers.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-light)' }}>
              No lecturers found in this unit{termId ? ` for ${terms.find((t) => t.termId === termId)?.academicYear ?? 'this term'}` : ''}.
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--divider)', color: 'var(--text-light)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px' }}>Lecturer</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Positions</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Courses</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Semesters taught</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {unitLecturers.map((l) => {
                  const sems = semestersTaughtOf(l);
                  const selectedRow = selected?.staffId === l.staffId;
                  return (
                    <tr
                      key={l.staffId}
                      style={{
                        borderTop: '1px solid var(--divider)',
                        background: selectedRow ? 'rgba(40,114,161,0.06)' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => selectLecturer(l)}
                    >
                      <td style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${semesterColor((sems[0] ?? 1) % 6 + 1)}, var(--primary-dark))`, flexShrink: 0,
                            }}
                          >
                            {l.staffName.trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div style={{ fontWeight: 800, color: 'var(--accent)' }} className="truncate">{l.staffName}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-light)' }}>{l.staffNo} · {l.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{l.positions.map(positionBadge)}</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text)' }}>{l.courseCount}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {sems.length === 0 ? (
                          <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>
                        ) : (
                          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                            {sems.map((n) => (
                              <span key={n} style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `${semesterColor(n)}1f`, color: semesterColor(n) }}>
                                S{n}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectLecturer(l);
                          }}
                          className="btn btn-sm btn-ghost gap-1 cursor-pointer"
                          style={{ color: 'var(--primary)', fontWeight: 700 }}
                        >
                          <Eye size={12} /> View
                        </button>
                        {isHod && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssign(l);
                            }}
                            className="btn btn-sm btn-ghost gap-1 cursor-pointer"
                            style={{ color: 'var(--primary)', fontWeight: 700 }}
                          >
                            <Plus size={12} /> Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 16 }}>
          <div
            className="bg-base-100"
            style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', flexShrink: 0,
                  }}
                >
                  {selected.staffName.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {selected.staffName}
                    <span style={{ display: 'inline-flex', gap: 4 }}>{selected.positions.map(positionBadge)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    {selected.staffNo} · {selected.unitName} · {selected.email || 'No email on file'}
                  </div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text-light)' }}>
                  {selected.courseCount} course{selected.courseCount === 1 ? '' : 's'}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text-light)' }}>
                  {semestersTaughtOf(selected).length} semester{semestersTaughtOf(selected).length === 1 ? '' : 's'}
                </span>
                {isHod && (
                  <button
                    onClick={() => openAssign(selected)}
                    className="btn btn-sm gap-1.5 border-none text-white cursor-pointer"
                    style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                  >
                    <Plus size={13} /> Assign to course
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>Assigned courses</div>
              {selected.assignedCourses.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-light)', padding: '12px 0' }}>
                  {selected.staffName} is not assigned to any courses{termId ? ` for ${terms.find((t) => t.termId === termId)?.academicYear ?? 'this term'}` : ''}.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selected.assignedCourses.map((c) => (
                    <div
                      key={c.courseId}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)', flexWrap: 'wrap' }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 800, color: semesterColor(c.semesterNo) }}>S{c.semesterNo}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 }}>{c.courseCode}</div>
                        <div className="truncate" style={{ fontSize: 12, color: 'var(--text)' }}>{c.courseName}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-light)', textAlign: 'right' }}>
                        {c.sections.length === 0 ? 'No sections' : c.sections.map((s) => s.sectionName).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', margin: '20px 0 10px' }}>Teaching assignments — current term</div>
              {selectedAssignments.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-light)', padding: '12px 0' }}>No teaching assignments recorded for this term.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedAssignments.map((a) => (
                    <div key={a.assignmentId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)', flexWrap: 'wrap' }}>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 }}>
                          {a.courseCode} · {a.sectionName}
                        </div>
                        <div className="truncate" style={{ fontSize: 12, color: 'var(--text)' }}>{a.courseName}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                          background: a.assignmentStatus === 'ACTIVE' ? 'rgba(5,150,105,0.14)' : 'var(--divider)',
                          color: a.assignmentStatus === 'ACTIVE' ? '#059669' : 'var(--text-light)',
                        }}
                      >
                        {a.assignmentStatus.toLowerCase()}
                      </span>
                      {isHod && (
                        <button
                          onClick={() => confirmRemoveAssignment(a)}
                          disabled={removing}
                          className="btn btn-sm btn-ghost gap-1 cursor-pointer disabled:opacity-50"
                          style={{ color: '#dc2626', fontWeight: 700 }}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={13} /> Overall weekly timetable
              </div>
              {selectedSchedules.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-light)', padding: '12px 0' }}>
                  No published timetable sessions for {selected.staffName}{termId ? ` in ${terms.find((t) => t.termId === termId)?.academicYear ?? 'this term'}` : ''}.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid var(--divider)', background: 'var(--divider)', color: 'var(--text-light)', fontWeight: 800, fontSize: 11 }}>
                          Day
                        </th>
                        {PERIODS.map((period) => (
                          <Fragment key={period}>
                            {period === 4 && (
                              <th style={{ textAlign: 'center', padding: 0, border: '1px solid var(--divider)', background: 'var(--divider)', color: 'var(--text-light)', fontSize: 10, width: 38 }} />
                            )}
                            <th style={{ textAlign: 'center', padding: '8px 6px', border: '1px solid var(--divider)', background: 'var(--divider)', color: 'var(--text-light)', fontWeight: 800, fontSize: 10, whiteSpace: 'nowrap' }}>
                              P{period}
                              <div style={{ fontWeight: 600, fontSize: 9.5, marginTop: 2 }}>{slotLabel(period)}</div>
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((dayLabel, dayIdx) => {
                        const day = dayIdx + 1;
                        const cells: ReactNode[] = [];
                        let skipUntil = 0;
                        PERIODS.forEach((period) => {
                          if (period <= skipUntil) return;
                          if (period === 4) {
                            if (dayIdx === 0) {
                              cells.push(
                                <td key="lunch" rowSpan={DAYS.length} style={{ border: '1px solid var(--divider)', padding: 4, textAlign: 'center', verticalAlign: 'middle', background: 'rgba(0,0,0,0.025)', color: 'var(--text-light)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>{lunchColumn()}</div>
                                </td>
                              );
                            }
                          }
                          const covering = selectedSchedules.filter((s) => s.dayOfWeek === day && s.startPeriodNo <= period && s.endPeriodNo >= period);
                          const start = covering.find((s) => s.startPeriodNo === period) ?? null;
                          if (covering.length === 0) {
                            cells.push(<td key={period} style={{ border: '1px solid var(--divider)', height: 64 }} />);
                            return;
                          }
                          if (start) {
                            const morning = start.startPeriodNo <= 3;
                            const maxEnd = morning ? 3 : 6;
                            const span = Math.min(start.endPeriodNo, maxEnd) - start.startPeriodNo + 1;
                            cells.push(
                              <td
                                key={period}
                                colSpan={span}
                                style={{
                                  border: '1px solid var(--divider)', height: 64, padding: 0, textAlign: 'center', verticalAlign: 'middle',
                                  background: 'rgba(40,114,161,0.1)',
                                }}
                              >
                                <div style={{ padding: '4px 6px' }}>
                                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}>
                                    {start.courseCode}
                                  </div>
                                  <div style={{ fontSize: 9.5, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                                    {fmtRange12(reanchorTime(start.startTime, timeOffset), reanchorTime(start.endTime, timeOffset))}
                                  </div>
                                  <div style={{ fontSize: 9.5, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                                    S{start.semesterNo} · {sectionNamesOf(start)}
                                  </div>
                                </div>
                              </td>
                            );
                            skipUntil = start.startPeriodNo + span - 1;
                            return;
                          }
                          cells.push(<td key={period} style={{ border: '1px solid var(--divider)', height: 64, background: 'rgba(40,114,161,0.04)' }} />);
                        });
                        return (
                          <tr key={day}>
                            <td style={{ padding: '8px 10px', border: '1px solid var(--divider)', color: 'var(--text-light)', fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap', background: 'var(--divider)' }}>
                              {dayLabel}
                            </td>
                            {cells}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {assignOpen && staff && isHod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8, 18, 26, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>Assign lecturer to course</div>
              <button onClick={() => setAssignOpen(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Lecturer</label>
                <select value={formStaffId} onChange={(e) => setFormStaffId(e.target.value)} className="cursor-pointer" style={inputStyle}>
                  {unitLecturers.map((l) => (
                    <option key={l.staffId} value={l.staffId}>{l.staffName} ({l.staffNo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Course</label>
                <select value={formCourseId} onChange={(e) => { setFormCourseId(e.target.value); setFormSectionId(''); }} className="cursor-pointer" style={inputStyle}>
                  <option value="">Choose a course…</option>
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>{c.courseCode} — {c.courseName} (S{c.semesterNo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Section</label>
                <select value={formSectionId} onChange={(e) => setFormSectionId(e.target.value)} className="cursor-pointer" style={inputStyle}>
                  <option value="">Choose a section…</option>
                  {sectionOptionsForCourse.map((s) => (
                    <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-light)', margin: 0 }}>
                The lecturer teaches this course for the selected section in {terms.find((t) => t.termId === termId)?.academicYear ?? 'the current year'}. Each course &amp; section pair can have one lecturer per term.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--surface)' }}>
              <button onClick={() => setAssignOpen(false)} className="btn btn-ghost btn-sm cursor-pointer" style={{ color: 'var(--text-light)' }}>Cancel</button>
              <button
                onClick={submitAssign}
                disabled={saving}
                className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-60"
                style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8, 18, 26, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} style={{ color: '#dc2626' }} /> Remove teaching assignment
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--text)' }}>{confirmAssignment.courseCode}</strong> from{' '}
                <strong style={{ color: 'var(--text)' }}>{confirmAssignment.staffName}</strong> ({confirmAssignment.sectionName})? This cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => setConfirmAssignment(null)}
                  disabled={removing}
                  className="btn btn-ghost btn-sm cursor-pointer disabled:opacity-50"
                  style={{ color: 'var(--text-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeAssignment(confirmAssignment)}
                  disabled={removing}
                  className="btn btn-sm gap-1.5 text-white border-none cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(var(--danger), var(--danger-dark))' }}
                >
                  {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}