'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Pencil, Trash2, X, Search, Loader2, Lock, AlertTriangle,
} from 'lucide-react';
import { getCurrentStaff, getCourses, getMajors, getSemesters, createCourse, updateCourse, deleteCourse } from '@/components/shared/api';
import type { StaffRecord, CourseRecord, MajorRecord, SemesterRecord, CourseRequest } from '@/components/shared/api';

interface CourseFormState {
  unitId: string;
  courseCode: string;
  courseName: string;
  creditUnit: string;
  majorId: string;
  semesterId: string;
  isRequired: boolean;
  displayOrder: string;
}

function emptyForm(unitId: string): CourseFormState {
  return {
    unitId,
    courseCode: '',
    courseName: '',
    creditUnit: '',
    majorId: '',
    semesterId: '',
    isRequired: false,
    displayOrder: '0',
  };
}

function formFromCourse(c: CourseRecord): CourseFormState {
  return {
    unitId: c.unitId,
    courseCode: c.courseCode,
    courseName: c.courseName,
    creditUnit: c.creditUnit != null ? String(c.creditUnit) : '',
    majorId: c.majorId ?? '',
    semesterId: c.semesterId,
    isRequired: c.isRequired,
    displayOrder: String(c.displayOrder),
  };
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

const RELATED_MAJOR_CODES = ['CS', 'CT', 'CST'];

export function DepartmentCoursesSection() {
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [majors, setMajors] = useState<MajorRecord[]>([]);
  const [semesters, setSemesters] = useState<SemesterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseRecord | null>(null);
  const [form, setForm] = useState<CourseFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<CourseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const current = await getCurrentStaff();
      setStaff(current);
      const [list, all, sem] = await Promise.all([
        getCourses({ unitId: current.unitId }),
        getMajors(),
        getSemesters(),
      ]);
      setCourses(list);
      setMajors(all.filter((mj) => mj.unitId === current.unitId || RELATED_MAJOR_CODES.includes(mj.majorCode)));
      setSemesters(sem);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  const isHod = staff ? staff.positions.includes('HOD') : false;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...courses]
      .filter((c) => {
        if (semesterFilter !== '' && String(c.semesterNo) !== semesterFilter) return false;
        if (q && !`${c.courseCode} ${c.courseName}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.courseCode.localeCompare(b.courseCode));
  }, [courses, query, semesterFilter]);

  const openCreate = () => {
    if (!staff) return;
    setEditing(null);
    setForm(emptyForm(staff.unitId));
    setModalOpen(true);
  };

  const openEdit = (c: CourseRecord) => {
    setEditing(c);
    setForm(formFromCourse(c));
    setModalOpen(true);
  };

  const saveCourse = async () => {
    if (!form || !staff || saving) return;
    const credit = Number(form.creditUnit);
    if (!form.courseCode.trim() || !form.courseName.trim() || !Number.isFinite(credit) || credit <= 0) {
      toast.error('Course code, course name and a positive credit unit are required');
      return;
    }
    const payload: CourseRequest = {
      unitId: form.unitId,
      courseCode: form.courseCode.trim(),
      courseName: form.courseName.trim(),
      creditUnit: credit,
      majorId: form.majorId || null,
      semesterId: form.semesterId || null,
      isRequired: form.isRequired,
      displayOrder: Math.max(0, Math.floor(Number(form.displayOrder) || 0)),
    };
    setSaving(true);
    try {
      if (editing) {
        await updateCourse(editing.courseId, payload);
        toast.success('Course updated');
      } else {
        await createCourse(payload);
        toast.success('Course created');
      }
      setModalOpen(false);
      setForm(null);
      setCourses(await getCourses({ unitId: staff.unitId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save course');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (c: CourseRecord) => setConfirmTarget(c);

  const handleDelete = async () => {
    if (!confirmTarget || !staff || deleting) return;
    setDeleting(true);
    try {
      await deleteCourse(confirmTarget.courseId);
      toast.success('Course deleted');
      setConfirmTarget(null);
      setCourses(await getCourses({ unitId: staff.unitId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete course');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-2 md:p-4">
      <div
        className="bg-base-100"
        style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap' }}>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
              <BookOpen size={18} style={{ color: 'var(--primary)' }} /> Courses
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: '4px 0 0' }}>
              {staff ? `${staff.unitName} unit` : 'Loading …'}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text)' }}>
                {courses.length} subject{courses.length === 1 ? '' : 's'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(40,114,161,0.14)', color: 'var(--primary)' }}>
                {courses.filter((c) => c.isRequired).length} required
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text-light)' }}>
                {courses.filter((c) => !c.isRequired).length} elective
              </span>
            </div>
          </div>
          {staff && isHod && (
            <button
              onClick={openCreate}
              className="btn btn-sm gap-1.5 border-none text-white cursor-pointer"
              style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
            >
              <Plus size={14} /> Add course
            </button>
          )}
        </div>

        {!isHod && staff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', fontSize: 12, color: 'var(--text-light)', background: 'var(--divider)' }}>
            <Lock size={12} /> View only — only a head of department (HOD) can add or update courses in this unit.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexWrap: 'wrap' }}>
          <div className="relative flex-1" style={{ minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by course code or name…"
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="cursor-pointer"
            style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
          >
            <option value="">All semesters</option>
            {semesters.map((s) => (
              <option key={s.semesterId} value={String(s.semesterNo)}>Semester {s.semesterNo}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 20px', color: 'var(--text-light)', fontSize: 13 }}>
              <Loader2 size={16} className="animate-spin" /> Loading courses…
            </div>
          ) : loadError ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--error, #dc2626)' }}>{loadError}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <BookOpen size={26} style={{ color: 'var(--text-lighter)', margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                {courses.length === 0 ? 'No courses yet' : 'Nothing matches'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-light)', marginTop: 4 }}>
                {courses.length === 0
                  ? 'No courses have been added to this unit yet.'
                  : 'No courses match the current search or semester filter.'}
              </div>
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--divider)', color: 'var(--text-light)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px' }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Course</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Semester</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Major</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Credits</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Type</th>
                  {isHod && <th style={{ textAlign: 'right', padding: '10px 20px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.courseId} style={{ borderTop: '1px solid var(--divider)' }}>
                    <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, background: 'var(--divider)', padding: '3px 10px', borderRadius: 'var(--radius-sm)' }}>
                        {c.courseCode}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: 600 }}>{c.courseName}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text)' }}>
                        Sem {c.semesterNo}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      {c.majorId ? (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(40,114,161,0.12)', color: 'var(--primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {c.majorCode}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-lighter)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text)', fontWeight: 700 }}>{c.creditUnit ?? '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {c.isRequired ? (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(40,114,161,0.14)', color: 'var(--primary)' }}>Required</span>
                      ) : (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--divider)', color: 'var(--text-light)' }}>Elective</span>
                      )}
                    </td>
                    {isHod && (
                      <td style={{ padding: '10px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openEdit(c)}
                          className="btn btn-sm btn-ghost gap-1 cursor-pointer"
                          style={{ color: 'var(--primary)', fontWeight: 700 }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(c)}
                          className="btn btn-sm btn-ghost gap-1 cursor-pointer"
                          style={{ color: '#dc2626', fontWeight: 700 }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8, 18, 26, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="bg-base-100 w-full max-w-lg" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={15} style={{ color: 'var(--primary)' }} /> {editing ? 'Update course' : 'Add course'}
              </div>
              <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'grid', gap: 12 }}>
              <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Course code *</label>
                  <input value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} placeholder="e.g. CS-101" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Course name *</label>
                  <input value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} placeholder="e.g. Introduction to Programming" style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Credit units *</label>
                  <input type="number" min={1} value={form.creditUnit} onChange={(e) => setForm({ ...form, creditUnit: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Semester</label>
                  <select value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: e.target.value })} className="cursor-pointer" style={inputStyle}>
                    <option value="">Not set</option>
                    {semesters.map((s) => (
                      <option key={s.semesterId} value={s.semesterId}>Semester {s.semesterNo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Display order</label>
                  <input type="number" min={0} value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: 5 }}>Major</label>
                <select value={form.majorId} onChange={(e) => setForm({ ...form, majorId: e.target.value })} className="cursor-pointer" style={inputStyle}>
                  <option value="">No major</option>
                  {majors.map((m) => (
                    <option key={m.majorId} value={m.majorId}>{m.majorCode} — {m.majorName}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  style={{ width: 15, height: 15, accentColor: 'var(--primary)' }}
                />
                Core / required course (not an elective)
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--surface)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm cursor-pointer" style={{ color: 'var(--text-light)' }}>Cancel</button>
              <button
                onClick={saveCourse}
                disabled={saving}
                className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-60"
                style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? 'Save changes' : 'Add course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8, 18, 26, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} style={{ color: '#dc2626' }} /> Delete course
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>{confirmTarget.courseCode}</strong> —{' '}
                {confirmTarget.courseName}? This cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => setConfirmTarget(null)}
                  disabled={deleting}
                  className="btn btn-ghost btn-sm cursor-pointer disabled:opacity-50"
                  style={{ color: 'var(--text-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-sm gap-1.5 text-white border-none cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(var(--danger), var(--danger-dark))' }}
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}