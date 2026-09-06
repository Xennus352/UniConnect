'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as DragEvt, ReactNode } from 'react';
import { useSupabase } from '@/utils/supabase/client';
import { RollCallHistorySection } from '@/components/lecturer/RollCallHistory';
import { useFeedPosts, useConversations } from '@/lib/supabase/hooks';
import WelcomeBar from '@/components/shared/WelcomeBar';
import StatCard from '@/components/shared/StatCard';
import MessageItem from '@/components/shared/MessageItem';
import QuickAccess from '@/components/shared/QuickAccess';
import DataTable from '@/components/shared/DataTable';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';
import FeedPost from '@/components/shared/FeedPost';
import LostFoundPage from '@/components/shared/LostFoundSection';
import AnnouncementsPage from '@/components/shared/AnnouncementsSection';
import { useSession } from '@/components/shared/session';
import { useMyProfile } from '@/components/shared/useMyProfile';
import { toast } from 'sonner';
import {
  BookOpen, ClipboardList, Megaphone, CalendarCheck,
  CalendarDays,
  Search, MessageSquare, Newspaper,
  Filter, Download, Plus, Check, X, Eye, Users, Ban,
  ArrowLeft, CalendarCog, Clock, Loader2, Lock, Unlock,
  RefreshCw, Trash2, GripVertical, Play, CheckCircle2,
  AlertTriangle, Radio, UserPlus, ChevronDown, Timer,
  XCircle, Blocks, Layers, ShieldCheck, Send, Move,
  ClipboardCheck,
  History, Undo2, Redo2,
} from 'lucide-react';
import Link from 'next/link';
import { fmt12h, fmtRange12 } from '@/components/shared/time';
import { useRouter } from 'next/navigation';
import type { StudentData, RollCallData } from '@/components/shared/types';
import {
  apiFetch, markAttendance,
  getRollCallMySchedule, ensureRollCallSession, getRollCallStudents,
} from '@/components/shared/api';
import type {
  RollCallSchedule, RollCallStudentsResponse,
} from '@/components/shared/api';
import {
  getCurrentStaff,
  getGeneration,
  getGenerationManage,
  getGenerationScope,
  getGenerationSchedules,
  getGenerationLobbies,
  getGenerations,
  getExamTypes,
  getCourses,
  getTeachingGroups,
  createTeachingGroup,
  addTeachingGroupMembers,
  deleteTeachingGroup,
  getTeachingAssignments,
  getPublishedSchedules,
  getTimetableLock,
  acquireTimetableLock,
  heartbeatTimetableLock,
  releaseTimetableLock,
  generateTimetable,
  publishGeneration,
  prepareSnapshot,
  cancelGeneration,
  swapSchedules,
  swapCellSchedules,
  createSchedule,
  deleteSchedule,
  publishDragStatus,
  createGenerationLobby,
  joinGenerationLobby,
  inviteLobbyMember,
  cancelGenerationLobby,
  generateFromLobby,
  deleteGeneration,
  getTimetableTimeGrid,
  PERSISTED_PERIOD_LABELS,
  PERSISTED_LUNCH_LABEL,
} from '@/components/shared/api';
import type {
  AcademicTermRecord, AttendanceRecord, ClassSessionRecord,
  StaffRecord, GenerationStatus,
  GenerationManageResponse, GenerationScopeSemester, GenerationSessionResponse,
  ExamTypeResponse, ScheduleResponse, TeachingGroupResponse,
  TeachingAssignmentResponse, TimetableLobbyResponse, TimetableLockResponse,
  CourseRecord, StudentRecord,
} from '@/components/shared/api';
import { useUniversityData } from '@/components/shared/useUniversityData';
import { useTimetableRealtime, useTimetableRealtimeGeneration, TIMETABLE_REALTIME_EVENTS } from '@/lib/supabase/useTimetableRealtime';
import CourseRequirementsPanel from '@/components/lecturer/CourseRequirementsPanel';
export { default as FeedSection } from '@/components/shared/FeedSection';
export { default as MessagesSection } from '@/components/shared/MessagesSection';
export { default as ActivitySection } from '@/components/shared/ActivitySection';

import BlockedSection from '@/components/shared/BlockedSection';

type RollCallRow = RollCallData & { studentId: string };

function initialsOf(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => (w[0] || '').toUpperCase()).join('');
}

function timeLabel(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const supabase = useSupabase();
  const [feedTab, setFeedTab] = useState('latest');
  const { posts, loading: postsLoading } = useFeedPosts(supabase);
  const { user: session } = useSession();
  const me = session?.email ?? '';
  const { conversations, loading: convLoading } = useConversations(supabase, me);

  return (
    <div>
      <WelcomeBar name="Dr. Smith" subtitle="Here's your lecture overview for today" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={<BookOpen size={20} />} iconBgClass="bg-primary/10 text-primary" value={6} label="Active Courses" trend="+2 this sem" />
        <StatCard icon={<ClipboardList size={20} />} iconBgClass="bg-info/10 text-info" value={12} label="Assignments" trend="3 due soon" />
        <StatCard icon={<Megaphone size={20} />} iconBgClass="bg-warning/10 text-warning" value={3} label="Announcements" trend="New today" />
        <StatCard icon={<CalendarCheck size={20} />} iconBgClass="bg-success/10 text-success" value={8} label="Upcoming Events" trend="This week" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[18px]">
        <div>
          <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--surface)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Newspaper size={16} /> Recent Feed
              </h3>
              <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '0 22px', borderBottom: '1px solid var(--surface)' }}>
              {['latest', 'following'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFeedTab(tab)}
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: feedTab === tab ? 'var(--primary)' : 'var(--text-light)',
                    cursor: 'pointer',
                    borderBottom: '2.5px solid',
                    borderBottomColor: feedTab === tab ? 'var(--primary)' : 'transparent',
                    background: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (feedTab !== tab) { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderBottomColor = 'var(--secondary)'; } }}
                  onMouseLeave={(e) => { if (feedTab !== tab) { e.currentTarget.style.color = 'var(--text-light)'; e.currentTarget.style.borderBottomColor = 'transparent'; } }}
                >
                  {tab === 'latest' ? 'Latest' : 'Following'}
                </button>
              ))}
            </div>
            {(posts ?? []).slice(0, 2).map((post) => (
              <FeedPost key={post.id} post={post} />
            ))}
            {posts && posts.length === 0 && (
              <div style={{ padding: '18px 22px', fontSize: 13, color: 'var(--text-lighter)' }}>No posts yet</div>
            )}
          </div>
        </div>
        <div>
          <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--surface)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarCheck size={16} /> Upcoming Events
              </h3>
              <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ padding: '18px 22px', fontSize: 13, color: 'var(--text-lighter)' }}>No upcoming events</div>
          </div>
          <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--surface)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={16} /> Recent Messages
              </h3>
              <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            {(conversations ?? []).slice(0, 3).map((conv) => (
              <MessageItem key={conv.id} initials={conv.other.initials} color="from-primary to-secondary" name={conv.other.name} preview={conv.preview} time={timeLabel(conv.lastMessageAt)} />
            ))}
            {conversations && conversations.length === 0 && (
              <div style={{ padding: '18px 22px', fontSize: 13, color: 'var(--text-lighter)' }}>No messages yet</div>
            )}
          </div>
          <QuickAccess role={session?.role} />
        </div>
      </div>
    </div>
  );
}

function ordinalLabel(n: number): string {
  return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][n - 1] ?? `${n}th`;
}

function StudentInfoModal({ student, onClose }: { student: StudentRecord; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);
  const fields: Array<{ label: string; value: string }> = [
    { label: 'Roll No', value: student.rollNo },
    { label: 'Major', value: student.majorCode },
    { label: 'Semester', value: ordinalLabel(student.semesterNo) },
    { label: 'Section', value: student.sectionName || '—' },
    { label: 'Academic Year', value: student.academicYear ? `${student.academicYear}` : '—' },
    { label: 'Phone', value: student.phoneNo || '—' },
    { label: 'Address', value: student.address || '—' },
  ];
  return (
    <>
      <style>{`
        dialog.sim-pop::backdrop { background: rgba(4, 10, 16, 0.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: sim-fade 0.2s ease-out; }
        dialog.sim-pop[open] { animation: sim-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes sim-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sim-pop { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
      <dialog
        ref={dialogRef}
        className="sim-pop"
        onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
        style={{
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--modal-bg)',
          color: 'var(--text)',
          padding: 0,
          margin: 'auto',
          width: 'min(420px, calc(100vw - 32px))',
          maxHeight: 'min(520px, calc(100vh - 64px))',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-info to-info/70 flex items-center justify-center text-white font-bold text-sm shrink-0">{initialsOf(student.studentName)}</div>
          <div className="flex-1 min-w-0">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.studentName}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{student.email}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
            className="cursor-pointer border-none flex items-center justify-center transition-transform duration-200 hover:scale-110 hover:rotate-90 shrink-0"
            style={{ color: 'var(--text-light)', background: 'none', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'grid', gap: 10 }}>
          {fields.map((f) => (
            <div key={f.label} className="flex items-start justify-between gap-4" style={{ paddingBottom: 10, borderBottom: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-lighter)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>{f.value}</span>
            </div>
          ))}
        </div>
      </dialog>
    </>
  );
}

export function StudentsSection() {
  const { data, loading, error } = useUniversityData<StudentRecord[]>(
    useCallback(() => apiFetch<StudentRecord[]>('/api/students'), [])
  );
  const router = useRouter();
  const { user: session } = useSession();
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const [semester, setSemester] = useState('all');
  const [viewing, setViewing] = useState<StudentRecord | null>(null);

  const students = useMemo(() => data ?? [], [data]);

  const courseOptions = useMemo(() => [...new Set(students.map((s) => s.majorCode).filter(Boolean))].sort(), [students]);
  const semesterOptions = useMemo(
    () => [...new Set(students.map((s) => s.semesterNo).filter((n) => n > 0))].sort((a, b) => a - b),
    [students]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (course !== 'all' && s.majorCode !== course) return false;
      if (semester !== 'all' && s.semesterNo !== Number(semester)) return false;
      if (q) {
        const haystack = `${s.studentName} ${s.rollNo} ${s.email} ${s.majorCode} ${s.semesterNo}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [students, query, course, semester]);

  const rows: (StudentData & { student: StudentRecord })[] = filtered.map((s) => ({
    name: s.studentName,
    initials: initialsOf(s.studentName),
    color: 'from-info to-info/70',
    rollNo: s.rollNo,
    major: s.majorCode,
    majorColor: 'badge-primary',
    email: s.email,
    semester: ordinalLabel(s.semesterNo),
    student: s,
  }));

  const openMessages = useCallback(async (student: StudentRecord) => {
    if (!session) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otherEmail: student.email,
          otherName: student.studentName,
          otherInitials: initialsOf(student.studentName),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ message: 'Could not start conversation' }))).message);
      const { conversationId } = await res.json();
      router.push(`/${session?.role ?? 'student'}/messages?conv=${conversationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start conversation');
    }
  }, [router, session]);

  return (
    <div>
      {error && !data && (
        <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 12 }}>
          University server unreachable — retrying—
        </div>
      )}
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Students</h1>
      <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20 }}>Manage and view your enrolled students</p>
      {loading && !data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-base-100 backdrop-blur-xl p-5" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-strong)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-[var(--radius-md)] bg-base-300 animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-base-300 animate-pulse" />
                </div>
                <div className="h-7 w-16 rounded-md bg-base-300 animate-pulse" />
                <div className="mt-3 h-3.5 w-28 rounded bg-base-300 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px' }}>
              <div className="flex items-center gap-3 mb-[18px] flex-wrap">
                <div className="h-10 flex-1 min-w-[200px] rounded-[var(--radius-sm)] bg-base-300 animate-pulse" />
                <div className="h-10 w-[140px] rounded-[var(--radius-sm)] bg-base-300 animate-pulse" />
                <div className="h-10 w-[140px] rounded-[var(--radius-sm)] bg-base-300 animate-pulse" />
              </div>
              <div className="flex items-center gap-6 px-4 py-3" style={{ borderBottom: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)' }}>
                <div className="h-3 w-24 rounded bg-base-300 animate-pulse" />
                <div className="h-3 w-16 rounded bg-base-300 animate-pulse" />
                <div className="h-3 w-14 rounded bg-base-300 animate-pulse" />
                <div className="h-3 w-20 rounded bg-base-300 animate-pulse" />
                <div className="h-3 w-10 rounded bg-base-300 animate-pulse ml-auto" />
              </div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-4 py-[14px]" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-base-300 animate-pulse shrink-0" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-44 rounded bg-base-300 animate-pulse" />
                      <div className="h-3 w-32 rounded bg-base-300 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3.5 w-20 rounded bg-base-300 animate-pulse" />
                  <div className="h-5 w-14 rounded-full bg-base-300 animate-pulse" />
                  <div className="h-3.5 w-8 rounded bg-base-300 animate-pulse" />
                  <div className="ml-auto flex gap-2">
                    <div className="h-6 w-6 rounded bg-base-300 animate-pulse" />
                    <div className="h-6 w-6 rounded bg-base-300 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <StatCard icon={<Users size={20} />} iconBgClass="bg-primary/10 text-primary" value={data?.length ?? 0} label="Total Students" trend="Across courses" />
            <StatCard icon={<Check size={20} />} iconBgClass="bg-success/10 text-success" value={data?.length ?? 0} label="Active" trend="All enrolled" />
            <StatCard icon={<X size={20} />} iconBgClass="bg-error/10 text-error" value={0} label="Pending" trend="Need review" />
          </div>
      <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ color: 'var(--text-light)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, roll no, email, or major..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%' }}
              />
            </div>
            <select value={course} onChange={(e) => setCourse(e.target.value)} style={{ padding: '9px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', fontWeight: 500, cursor: 'pointer', minWidth: 140 }}>
              <option value="all">All Courses</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ padding: '9px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', fontWeight: 500, cursor: 'pointer', minWidth: 140 }}>
              <option value="all">All Semesters</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>{ordinalLabel(s)}</option>
              ))}
            </select>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: '18px 22px', fontSize: 13, color: 'var(--text-lighter)' }}>
              {students.length > 0 ? 'No students match your search or filters' : 'No students yet'}
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'name', label: 'Student', render: (_: string | number, row: StudentData) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${row.color} flex items-center justify-center text-white font-bold text-xs`}>{row.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-lighter)' }}>{row.email}</div>
                    </div>
                  </div>
                )},
                { key: 'rollNo', label: 'Roll No', render: (v: string) => <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-light)' }}>{v}</span> },
                { key: 'major', label: 'Major', render: (v: string) => (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase',
                    color: v === 'CS' ? 'var(--primary)' : v === 'SE' ? 'var(--accent)' : 'var(--info)',
                    backgroundColor: v === 'CS' ? 'rgba(40, 114, 161,0.15)' : v === 'SE' ? 'rgba(45,68,92,0.08)' : 'rgba(59,130,246,0.08)',
                  }}>{v}</span>
                )},
                { key: 'semester', label: 'Semester', render: (v: string) => <span style={{ fontSize: 12.5, fontWeight: 500 }}>{v}</span> },
                { key: 'actions', label: '', render: (_: string | number, row: StudentData) => {
                  const st = (row as StudentData & { student: StudentRecord }).student;
                  return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      title="View student"
                      onClick={() => setViewing(st)}
                      style={{ background: 'transparent', color: 'var(--text-light)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.color = 'var(--primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-light)'; }}
                    ><Eye size={14} /></button>
                    <button
                      title="Message student"
                      onClick={() => void openMessages(st)}
                      style={{ background: 'transparent', color: 'var(--text-light)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.color = 'var(--primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-light)'; }}
                    ><MessageSquare size={14} /></button>
                  </div>
                );}},
              ]}
              data={rows}
            />
          )}
        </div>
      </div>
        </>
      )}
      {viewing && <StudentInfoModal student={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

export function RollCallSection({ mode = 'today', onViewHistory }: {
  mode?: 'today' | 'schedules';
  onViewHistory?: (scheduleId: string, month: string) => void;
} = {}) {
  const isSchedulesMode = mode === 'schedules';
  const [schedules, setSchedules] = useState<RollCallSchedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<'confirm' | 'form'>('confirm');
  const [modalLoading, setModalLoading] = useState(false);
  const [mOccurrence, setMOccurrence] = useState('');
  const [roster, setRoster] = useState<RollCallStudentsResponse | null>(null);
  const [rows, setRows] = useState<{
    studentId: string; rollNo: string; name: string;
    present: boolean; checked: Set<string>; remark: string;
    attendanceId: string | null;
  }[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedInfo, setSubmittedInfo] = useState<{ scheduleId: string; month: string } | null>(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const pendingRef = useRef<{ sessionId: string; entries: unknown[] } | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  // Today tab records TODAY only; Schedules tab uses its own picked month/day.
  const [sessionDateToday] = useState(todayIso);
  const [occMonth, setOccMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selCourseCode, setSelCourseCode] = useState('');
  const [selDay, setSelDay] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getRollCallMySchedule()
      .then((list) => { if (alive) setSchedules(list); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load schedule'); });
    return () => { alive = false; };
  }, []);

  // ---- Schedules-mode cascade (course -> day -> valid dates), all derived ----
  const courseCodes = useMemo(
    () => [...new Set((schedules ?? []).map((s) => s.courseCode))].sort(),
    [schedules]);
  const effCourseCode = courseCodes.includes(selCourseCode)
    ? selCourseCode
    : (courseCodes[0] ?? '');
  const courseSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.courseCode === effCourseCode),
    [schedules, effCourseCode]);
  const courseDays = useMemo(
    () => [...new Set(courseSchedules.map((s) => s.dayOfWeek))].sort((a, b) => a - b),
    [courseSchedules]);
  const effDay: number | null =
    selDay !== null && courseDays.includes(selDay)
      ? selDay
      : (courseDays[0] ?? null);
  const daySchedules = useMemo(
    () => (effDay !== null
      ? courseSchedules.filter((s) => s.dayOfWeek === effDay)
      : []),
    [courseSchedules, effDay]);

  // Valid calendar dates for the selected teaching day within occMonth.
  // Derived ONLY from the timetable weekday of the selected day - never from
  // a generic Monday-Sunday calendar.
  const validDates = useMemo(() => {
    if (isSchedulesMode && effDay === null) return [] as string[];
    if (!isSchedulesMode) return [todayIso];
    const [y, m] = occMonth.split('-').map(Number);
    if (!y || !m) return [] as string[];
    const dates: string[] = [];
    const d = new Date(Date.UTC(y, m - 1, 1));
    while (d.getUTCMonth() === m - 1) {
      if (d.getUTCDay() % 7 === effDay % 7 || ((d.getUTCDay() === 0 ? 7 : d.getUTCDay()) === effDay)) {
        dates.push(d.toISOString().slice(0, 10));
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
  }, [isSchedulesMode, effDay, occMonth, todayIso]);

  // Derived occurrence date: in Schedules mode, snap mOccurrence to the
  // nearest valid date for the selected day. Falls back to the first valid
  // date if the current selection doesn't match the teaching weekday.
  const effOccurrence = useMemo(() => {
    if (!isSchedulesMode) return sessionDateToday;
    if (validDates.length === 0) return '';
    return validDates.includes(mOccurrence) ? mOccurrence : validDates[0];
  }, [isSchedulesMode, validDates, mOccurrence, sessionDateToday]);

  // in Schedules mode, so the class cards always have a valid date context.
  useEffect(() => {
  }, [isSchedulesMode, validDates, mOccurrence]);

  const selected = schedules?.find((s) => s.scheduleId === scheduleId) ?? null;
  const todays = (schedules ?? []).filter((s) => s.dayName === todayName);

  // Two-phase modal: phase 'confirm' asks "Start Roll Call?" — creates
  // NOTHING. Clicking "Start" calls ensureSessionOn (create/reuse) THEN
  // loads students WITH the returned sessionId so existing attendance is
  // pre-filled. The CLASS_SESSION identity flows through the whole flow.
  const openConfirm = (sid: string, date: string) => {
    setScheduleId(sid);
    setMOccurrence(date);
    setRoster(null);
    setRows([]);
    setPage(1);
    setError(null);
    setModalPhase('confirm');
    setModalOpen(true);
  };

  const startRollCall = async () => {
    setModalPhase('form');
    setModalLoading(true);
    setError(null);
    try {
      // 1. Create/reuse the session for schedule_id + occurrence date.
      const sess = await ensureRollCallSession(scheduleId, mOccurrence);
      // 2. Load students WITH existing attendance for that exact session.
      const data = await getRollCallStudents(scheduleId, sess.sessionId);
      setRoster(data);
      setRows(data.students.map((st) => ({
        studentId: st.studentId,
        rollNo: st.rollNo,
        name: st.studentName,
        attendanceId: st.attendanceId,
        present: st.attendanceStatus === 'PRESENT',
        checked: new Set(
          st.attendanceStatus === 'PRESENT'
            ? (st.attendedSlotIds.length > 0
                ? st.attendedSlotIds
                : data.slots.map((sl) => sl.slotId))
            : []
        ),
        remark: st.remark ?? '',
      })));
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setModalLoading(false);
    }
  };

  const buildEntries = () => {
    if (!roster) return [];
    const order = roster.slots.map((sl) => sl.slotId);
    return rows.map((r) => {
      const present = r.present && r.checked.size > 0;
      let startId: string | null = null;
      let endId: string | null = null;
      if (present) {
        const idxs = order.map((id, i) => (r.checked.has(id) ? i : -1)).filter((i) => i >= 0);
        const contiguous = idxs.length > 0 && idxs.every((v, k) => k === 0 || v === idxs[k - 1] + 1);
        if (!contiguous) throw new Error('Attendance periods must be consecutive.');
        startId = order[idxs[0]];
        endId = order[idxs[idxs.length - 1]];
      }
      return {
        studentId: r.studentId,
        attendanceStatus: present ? ('PRESENT' as const) : ('ABSENT' as const),
        remark: r.remark || undefined,
        attendanceStartSlotId: startId,
        attendanceEndSlotId: endId,
      };
    });
  };

  // Submit: creates/reuses the CLASS_SESSION for THIS occurrence date, then
  // saves attendance transactionally. Opening the modal never wrote anything.
  const doSubmit = async (forceUpdate: boolean) => {
    if (!selected || !mOccurrence || busy) return;
    setBusy(true); setError(null);
    try {
      const sess = await ensureRollCallSession(selected.scheduleId, mOccurrence);
      const existing = await getRollCallStudents(selected.scheduleId, sess.sessionId);
      const hasPrior = existing.students.some((st) => st.attendanceId);
      if (hasPrior && !forceUpdate) {
        setShowUpdateConfirm(true);
        return;
      }
      await markAttendance(sess.sessionId, buildEntries() as never);
      toast.success(forceUpdate ? 'Roll Call updated successfully.' : 'Roll Call submitted successfully.');
      setSubmittedInfo({ scheduleId: selected.scheduleId, month: mOccurrence.slice(0, 7) });
      setModalOpen(false);
      const list = await getRollCallMySchedule();
      setSchedules(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const togglePresent = (studentId: string, present: boolean) => {
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      if (!present) return { ...r, present: false, checked: new Set<string>() };
      const all = new Set<string>(roster?.slots.map((sl) => sl.slotId) ?? []);
      return { ...r, present: true, checked: all };
    }));
  };

  const toggleSlot = (studentId: string, slotId: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      const next = new Set(r.checked);
      if (next.has(slotId)) next.delete(slotId); else next.add(slotId);
      return { ...r, checked: next, present: next.size > 0 };
    }));
  };

  const openHistory = (sid: string, month: string) => {
    if (onViewHistory) onViewHistory(sid, month);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={20} /> {isSchedulesMode ? 'Schedules Roll Call' : "Today's Roll Call"}
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-light)' }}>
            {isSchedulesMode
              ? <>Any scheduled timetable day &middot; previous / today / upcoming</>
              : <>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</>}
          </div>
        </div>
        {onViewHistory ? (
          <button onClick={() => onViewHistory(scheduleId || (submittedInfo?.scheduleId ?? ''), occMonth)}
            className="btn btn-ghost btn-sm" style={{ border: '1.5px solid var(--surface-border)' }}>
            <History size={14} /> Roll Call History
          </button>
        ) : (
          <Link href="/lecturer/roll-call-history" className="btn btn-ghost btn-sm" style={{ border: '1.5px solid var(--surface-border)' }}>
            <History size={14} /> Roll Call History
          </Link>
        )}
      </div>

      {/* Schedules mode controls: Course / Teaching days / Month */}
      {isSchedulesMode && (
        <div className="flex items-end gap-3 flex-wrap mb-4">
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'grid', gap: 2 }}>
            Course
            <select value={effCourseCode} onChange={(e) => { setSelCourseCode(e.target.value); setSelDay(null); }}
              className="btn btn-ghost btn-sm cursor-pointer" style={{ border: '1.5px solid var(--surface-border)', minWidth: 160 }}>
              {courseCodes.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'grid', gap: 2 }}>
            Month
            <input type="month" value={occMonth}
              onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setOccMonth(e.target.value); }}
              className="btn btn-ghost btn-sm" style={{ border: '1.5px solid var(--surface-border)' }} />
          </label>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4" style={{ borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: 12.5 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Teaching-day chips (Schedules) or Today card header (Today) */}
      <div className="mb-5" style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-soft)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--surface-border)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
          {isSchedulesMode
            ? <>Available Schedule Days &mdash; {occMonth}</>
            : <>Today&rsquo;s Roll Call &mdash; {todayName}</>}
        </div>

        {isSchedulesMode && courseDays.length === 0 && (
          <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-light)' }}>
            No assigned courses available.
          </div>
        )}

        {isSchedulesMode && (
          <div style={{ padding: '10px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {courseDays.map((dow) => {
              const active = effDay === dow;
              return (
                <button key={dow} onClick={() => setSelDay(dow)}
                  className="btn btn-xs cursor-pointer"
                  style={{
                    border: '1.5px solid ' + (active ? 'var(--primary)' : 'var(--surface-border)'),
                    background: active ? 'rgba(35,96,138,0.12)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    fontWeight: active ? 700 : 500,
                  }}>
                  {DOW_NAMES[dow]}
                </button>
              );
            })}
          </div>
        )}

        {/* Valid dates for the selected teaching day */}
        {isSchedulesMode && (
          <div style={{ padding: '10px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {validDates.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-light)' }}>No dates in this month.</span>
            )}
            {validDates.map((v) => {
              const active = v === effOccurrence;
              const rel = v < todayIso ? 'Past' : v === todayIso ? 'Today' : 'Upcoming';
              return (
                <button key={v}
                  onClick={() => setMOccurrence(v)}
                  className="btn btn-xs cursor-pointer"
                  style={{
                    border: '1.5px solid ' + (active ? 'var(--primary)' : 'var(--surface-border)'),
                    background: active ? 'rgba(35,96,138,0.14)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    fontWeight: active ? 700 : 500,
                  }}>
                  {new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>{rel}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isSchedulesMode && schedules === null && (
          <div style={{ padding: '14px 18px' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surface)' }}>
                <div style={{ width: 60, height: 12, borderRadius: 4, background: 'var(--surface-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: 200, height: 12, borderRadius: 4, background: 'var(--surface-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        )}
        {!isSchedulesMode && todays.length === 0 && (
          <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-light)' }}>
            No classes scheduled for today.
          </div>
        )}

        {(isSchedulesMode ? daySchedules : todays).map((s) => {
          const isSel = s.scheduleId === scheduleId;
          // Compute PAST / CURRENT / UPCOMING from actual wall-clock times
          const nowT = new Date().getHours() * 60 + new Date().getMinutes();
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          const startM = toMin(s.startTime), endM = toMin(s.endTime);
          const timeStatus = nowT >= startM && nowT < endM ? 'CURRENT' : nowT >= endM ? 'PAST' : 'UPCOMING';
          const statusLabel = s.todaySessionCompleted ? 'Completed' : s.todaySessionId ? 'Pending' : timeStatus === 'CURRENT' ? 'Current' : timeStatus === 'PAST' ? 'Past' : 'Upcoming';
          const statusColor = s.todaySessionCompleted ? '#16a34a' : timeStatus === 'CURRENT' ? 'var(--primary)' : timeStatus === 'PAST' ? 'var(--text-light)' : 'var(--warning)';
          return (
            <button key={s.scheduleId}
              onClick={() => openConfirm(s.scheduleId, isSchedulesMode ? effOccurrence : todayIso)}
              className="w-full text-left cursor-pointer"
              style={{
                padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid var(--surface)',
                background: isSel ? 'rgba(35,96,138,0.08)' : 'transparent',
              }}>
              <span style={{ fontSize: 16 }}>
                {s.todaySessionCompleted ? '\u2611' : s.todaySessionId ? '\u2610' : '\u25CB'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {fmtRange12(s.startTime, s.endTime)} &nbsp;{s.courseCode} &mdash; Sem {s.semesterNo ?? '?'} {s.sectionNames.join('+')}
              </span>
              {!isSchedulesMode && (
                <span className="badge badge-xs" style={{
                  marginLeft: 'auto',
                  background: timeStatus === 'CURRENT' ? 'rgba(35,96,138,0.14)' : 'transparent',
                  color: timeStatus === 'CURRENT' ? 'var(--accent)' : 'var(--text-light)',
                  fontWeight: timeStatus === 'CURRENT' ? 700 : 400,
                }}>
                  {statusLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && !modalOpen && (
        <div className="mb-4 flex items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
          <span className="badge" style={{ background: 'rgba(35,96,138,0.12)', color: 'var(--accent)', border: 'none', fontWeight: 700 }}>
            {selected.courseCode} &mdash; {selected.courseName}
          </span>
          <span className="badge badge-xs">Semester {selected.semesterNo ?? '?'}</span>
          <span className="badge badge-xs">{selected.sectionNames.join(' + ')}</span>
          <span className="badge badge-xs">{fmtRange12(selected.startTime, selected.endTime)}</span>
          <span className="badge badge-xs">{selected.periodCount} periods</span>
          <span className="badge badge-xs">Click to open Roll Call</span>
        </div>
      )}

      {submittedInfo && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-3"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.10)', border: '1.5px solid rgba(34,197,94,0.35)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
            Roll Call submitted successfully.
          </span>
          {onViewHistory ? (
            <button onClick={() => onViewHistory(submittedInfo.scheduleId, submittedInfo.month)}
              className="btn btn-sm btn-primary cursor-pointer">
              View Roll Call History
            </button>
          ) : (
            <Link href={`/lecturer/roll-call-history?scheduleId=${submittedInfo.scheduleId}&month=${submittedInfo.month}`}
              className="btn btn-sm btn-primary cursor-pointer">
              View Roll Call History
            </Link>
          )}
        </div>
      )}

      {/* ================= Attendance modal ================= */}
      {modalOpen && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={MODAL_BACKDROP}
          onClick={() => { if (!busy) setModalOpen(false); }}>
          <div className="w-full max-w-2xl rounded-xl flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}>

            {/* fixed header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }} className="flex items-start justify-between gap-3">
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Roll Call</h3>
                {selected && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.courseCode} &middot; {selected.courseName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      Semester {selected.semesterNo ?? '?'} &middot; {selected.sectionNames.join(' + ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {new Date(mOccurrence + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      {' \u00B7 '}
                      {fmtRange12(selected.startTime, selected.endTime)}
                      {' \u00B7 '}
                      {selected.periodCount} periods
                    </div>
                  </>
                )}
              </div>
              <button className="btn btn-ghost btn-sm cursor-pointer" onClick={() => { if (!busy) setModalOpen(false); }}>&#10005;</button>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '14px 20px', minHeight: 260 }}>
              {modalPhase === 'confirm' && !modalLoading && selected && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                    Start Roll Call for {selected.courseCode}?
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-light)', marginBottom: 16 }}>
                    Semester {selected.semesterNo} &middot; Section {selected.sectionNames.join(' + ')}
                    &middot; {mOccurrence}
                  </p>
                  <button className="btn btn-primary btn-sm cursor-pointer"
                    onClick={() => { void startRollCall(); }}>
                    Start Roll Call
                  </button>
                </div>
              )}
              {modalPhase === 'form' && modalLoading && (
                <div>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--surface)' }}>
                      <div style={{ width: 140, height: 14, borderRadius: 4, background: 'var(--surface-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--surface-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: 180, height: 14, borderRadius: 4, background: 'var(--surface-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', paddingTop: 12, fontSize: 13, color: 'var(--text-light)' }}>Loading students&hellip;</div>
                </div>
              )}
              {modalPhase === 'form' && !modalLoading && roster && (
                <table className="table w-full">
                  <thead>
                    <tr style={{ fontSize: 11 }}>
                      <th>Student</th><th>Status</th><th>Periods</th><th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                      <tr key={r.studentId}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{r.rollNo}</div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => togglePresent(r.studentId, true)} className="btn btn-xs"
                              style={{ background: r.present ? 'var(--success)' : 'var(--secondary)', color: r.present ? '#fff' : 'var(--text)', border: 'none' }}>Present</button>
                            <button onClick={() => togglePresent(r.studentId, false)} className="btn btn-xs"
                              style={{ background: !r.present ? 'var(--danger)' : 'var(--secondary)', color: !r.present ? '#fff' : 'var(--text)', border: 'none' }}>Absent</button>
                          </div>
                        </td>
                        <td>
                          {r.present && roster.slots.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                              {roster.slots.map((sl) => (
                                <label key={sl.slotId} className="flex items-center gap-1 cursor-pointer" style={{ fontSize: 11 }}
                                  onClick={(e) => { e.preventDefault(); toggleSlot(r.studentId, sl.slotId); }}>
                                  <input type="checkbox" readOnly checked={r.checked.has(sl.slotId)} style={{ pointerEvents: 'none' }} />
                                  {fmt12h(sl.startTime)}
                                </label>
                              ))}
                            </div>
                          ) : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <input value={r.remark}
                            onChange={(e) => { const v = e.target.value; setRows((prev) => prev.map((x) => x.studentId === r.studentId ? { ...x, remark: v } : x)); }}
                            placeholder="late / medical / …"
                            style={{ width: 130, padding: '5px 8px', fontSize: 12, border: '1.5px solid var(--surface-border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }} />
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-6" style={{ color: 'var(--text-light)' }}>
                        No students found for this course and section.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* fixed footer: pagination + actions */}
            <div style={{ borderTop: '1px solid var(--surface-border)', padding: '12px 20px' }} className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
                <button className="btn btn-xs cursor-pointer" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>&lt; Previous</button>
                <span>Page {page} of {Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}</span>
                <button className="btn btn-xs cursor-pointer" disabled={page >= Math.ceil(rows.length / PAGE_SIZE)}
                  onClick={() => setPage((p) => p + 1)}>Next &gt;</button>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm cursor-pointer" onClick={() => { if (!busy) setModalOpen(false); }}>Cancel</button>
                <button onClick={() => { void doSubmit(false); }} disabled={busy || rows.length === 0}
                  className="btn btn-sm gap-2 text-white cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))', border: 'none' }}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Submit Roll Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update-existing confirmation (above modal) */}
      {showUpdateConfirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={MODAL_BACKDROP} onClick={() => setShowUpdateConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl" style={{ background: 'var(--surface)', border: '1.5px solid var(--primary)', padding: 20 }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Roll Call already exists</h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              Attendance has already been submitted for this scheduled class.
              Do you want to update it?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-ghost btn-sm cursor-pointer" onClick={() => setShowUpdateConfirm(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary cursor-pointer"
                onClick={() => { setShowUpdateConfirm(false); void doSubmit(true); }}>
                Update Roll Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ISO day-of-week (1=Monday … 7=Sunday) — matches java.time.DayOfWeek.getValue(). */
const DOW_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
  5: 'Friday', 6: 'Saturday', 7: 'Sunday',
};
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const GRID_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const GRID_COLUMN_HEADERS = ['P1', 'P2', 'P3', 'LUNCH', 'P4', 'P5', 'P6'] as const;
const LUNCH_HEADER_COL = 3;
const GRID_COLUMNS = '96px repeat(7, minmax(122px, 1fr))';
const GRID_CELL_MIN_HEIGHT = 112;

const MAX_PERIOD = 6;

// Modal overlay backdrop: translucent + blurred so the timetable stays visible
// (but soft) behind every dialog. Keep it uniform across the view.
const MODAL_BACKDROP: { background: string; backdropFilter: string; WebkitBackdropFilter: string } = {
  background: 'rgba(9, 25, 35, 0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'] as const;

// Human label for a semester tile: 1 -> "Semester 1 (First year – First
// semester)", 2 -> "Semester 2 (First year – Second semester)", and so on.
const semesterTileLabel = (n: number) => {
  const year = Math.floor((n - 1) / 2) + 1;
  const half = ((n - 1) % 2) + 1;
  const yearWord = ORDINALS[year - 1] ?? `#${year}`;
  return `Semester ${n} (${yearWord} year \u2013 ${half === 1 ? 'First' : 'Second'} semester)`;
};
const GENERATION_FALLBACK_MS = 45000;
// Multi-section scopes solve asynchronously and can legitimately run for
// several minutes on degraded database days (remote pooler, stale pooled
// connections being revalidated, dropped SSE streams). The old 15s grace
// declared "took too long" at ~60s while the server was still solving
// successfully, so give background solves a generous 10-minute budget.
const GENERATION_GRACE_MS = 10 * 60 * 1000;
const SCHEDULE_LOCK_POLL_MS = 4000;
const DRAG_BROADCAST_MS = 150;

const MEMBER_COLORS = [
  'from-primary to-secondary',
  'from-info to-info/70',
  'from-warning to-warning/70',
  'from-success to-success/70',
  'from-error to-error/70',
] as const;

/**
 * Period time labels come from the persisted TimeSlot configuration
 * (GET /api/time-slots), normalized onto the authoritative 09:00-16:00 grid
 * (P1=09:00-10:00 — P6=15:00-16:00, Lunch=12:00-13:00). A hardcoded fallback
 * of the exact persisted values is used only while the request is in flight
 * or when the server is unreachable.
 */
interface TimeSlotLabels {
  periodLabels: string[];
  lunchLabel: string;
}

function useTimeSlotLabels(): TimeSlotLabels {
  const [labels, setLabels] = useState<TimeSlotLabels>({
    periodLabels: [...PERSISTED_PERIOD_LABELS],
    lunchLabel: PERSISTED_LUNCH_LABEL,
  });
  useEffect(() => {
    let on = true;
    getTimetableTimeGrid().then((grid) => {
      if (!on) return;
      setLabels({ periodLabels: grid.periodLabels, lunchLabel: grid.lunchLabel });
    });
    return () => {
      on = false;
    };
  }, []);
  return labels;
}

function generationEventLabel(type: string): string {
  switch (type) {
    case 'GENERATION_STARTED': return 'Timetable generation started';
    case 'GENERATION_COMPLETED': return 'Timetable generated successfully';
    case 'GENERATION_FAILED': return 'Timetable generation failed';
    case 'TIMETABLE_PUBLISHED': return 'Timetable published';
    case 'TIMETABLE_DELETED': return 'Timetable draft deleted';
    case 'SCHEDULE_CREATED': return 'Schedule created';
    case 'SCHEDULE_UPDATED': return 'Schedule updated';
    case 'SCHEDULE_DELETED': return 'Schedule removed';
    case 'SCHEDULE_LOCKED': return 'Editing lock acquired';
    case 'SCHEDULE_UNLOCKED': return 'Editing lock released';
    case 'DRAG_STARTED': return 'Schedule drag started';
    case 'DRAG_MOVED': return 'Schedule dragged';
    case 'DRAG_ENDED': return 'Schedule drag ended';
    case 'LOBBY_MEMBER_JOINED': return 'New member joined the lobby';
    case 'LOBBY_CANCELLED': return 'Generation lobby cancelled';
    case 'TEACHING_GROUP_CREATED': return 'Combined class created';
    case 'TEACHING_GROUP_DELETED': return 'Combined class removed';
    case 'COURSE_REQUIREMENT_CREATED': return 'Meeting requirement added';
    case 'COURSE_REQUIREMENT_UPDATED': return 'Meeting requirement updated';
    case 'COURSE_REQUIREMENT_DELETED': return 'Meeting requirement removed';
    default: return type;
  }
}

const TIMETABLE_EVENT_COLORS: Record<string, string> = {
  GENERATION_STARTED: '#d97706',
  GENERATION_COMPLETED: '#059669',
  GENERATION_FAILED: '#dc2626',
  TIMETABLE_PUBLISHED: '#2872a1',
  TIMETABLE_DELETED: '#dc2626',
  SCHEDULE_CREATED: '#059669',
  SCHEDULE_UPDATED: '#3b82f6',
  SCHEDULE_DELETED: '#dc2626',
  SCHEDULE_LOCKED: '#d97706',
  SCHEDULE_UNLOCKED: '#059669',
  DRAG_STARTED: '#8b5cf6',
  DRAG_MOVED: '#8b5cf6',
  DRAG_ENDED: '#8b5cf6',
  LOBBY_MEMBER_JOINED: '#3b82f6',
  LOBBY_CANCELLED: '#dc2626',
};

function statusLabel(status: GenerationStatus): string {
  switch (status) {
    case 'PENDING': return 'Draft';
    case 'GENERATING': return 'Generating';
    case 'COMPLETED': return 'Generated';
    case 'FAILED': return 'Failed';
    case 'PUBLISHED': return 'Published';
  }
}

function statusColor(status: GenerationStatus): string {
  switch (status) {
    case 'PENDING': return '#64748b';
    case 'GENERATING': return '#d97706';
    case 'COMPLETED': return '#059669';
    case 'FAILED': return '#dc2626';
    case 'PUBLISHED': return '#2872a1';
  }
}

interface TimetableEvent {
  id: string;
  type: string;
  label: string;
  time: number;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  action: () => Promise<void> | void;
}

interface RemoteDragState {
  scheduleId: string;
  staffName: string;
  day: number | null;
  period: number | null;
  schedule?: ScheduleResponse | null;
}

interface PendingSwapState {
  scheduleId: string;
  withScheduleId: string;
  /** cell-swap: the grabbed cell; block-swap: the schedule's original anchor. */
  sourceDay?: number;
  sourcePeriod?: number;
  targetDay: number;
  targetPeriod: number;
  /** cell-swap: the drop-cell occupant the client qualified (backend re-resolves when stale). */
  targetScheduleId?: string;
  conflicts: string[] | null;
  /** true = single-cell (per period) swap via /swap-cell. */
  cell: boolean;
}

interface EditOp {
  kind: 'move' | 'delete' | 'cellSwap';
  scheduleId: string;
  /** cellSwap: the swap partner's post-swap row (undo anchor on the target cell). */
  withScheduleId?: string;
  /** cellSwap: the dragged course's assignment id (survives row re-creation). */
  srcAssignmentId?: string | null;
  /** cellSwap: the partner's assignment id (null = special block). */
  partnerAssignmentId?: string | null;
  /** move: the cell the schedule leaves; delete: the snapshot needed to re-create it. */
  fromDay?: number;
  fromPeriod?: number;
  toDay?: number;
  toPeriod?: number;
  schedule?: ScheduleResponse;
}

function eventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushEvent(
  setHistory: (updater: (prev: TimetableEvent[]) => TimetableEvent[]) => void,
  type: string,
) {
  setHistory((prev) => [
    { id: eventId(), type, label: generationEventLabel(type), time: Date.now() },
    ...prev,
  ].slice(0, 60));
}

const SCHEDULE_TYPE_META: Record<string, { label: string; fg: string; bg: string; cardBg: string; cardBorder: string }> = {
  COURSE: {
    label: 'Lecture',
    fg: 'var(--primary)',
    bg: 'rgba(40,114,161,0.15)',
    cardBg: 'linear-gradient(135deg, rgba(40,114,161,0.14), rgba(40,114,161,0.05))',
    cardBorder: '1.5px solid rgba(40,114,161,0.35)',
  },
  LAB: {
    label: 'Lab',
    fg: '#059669',
    bg: 'rgba(16,185,129,0.15)',
    cardBg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))',
    cardBorder: '1.5px solid rgba(16,185,129,0.35)',
  },
  LMS: {
    label: 'LMS',
    fg: '#7c3aed',
    bg: 'rgba(139,92,246,0.15)',
    cardBg: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.05))',
    cardBorder: '1.5px solid rgba(139,92,246,0.35)',
  },
  ASSIGNMENT: {
    label: 'Assignment',
    fg: '#d97706',
    bg: 'rgba(251,191,36,0.15)',
    cardBg: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.05))',
    cardBorder: '1.5px solid rgba(251,191,36,0.35)',
  },
  BREAK: {
    label: 'Break',
    fg: '#64748b',
    bg: 'rgba(100,116,139,0.15)',
    cardBg: 'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(100,116,139,0.05))',
    cardBorder: '1.5px solid rgba(100,116,139,0.35)',
  },
};

function ScheduleTypeBadge({ type }: { type: string }) {
  const meta = SCHEDULE_TYPE_META[type] ?? SCHEDULE_TYPE_META.COURSE;
  return (
    <span
      className="badge badge-xs"
      style={{
        background: meta.bg,
        color: meta.fg,
        border: 'none',
        fontWeight: 700,
      }}
    >
      {meta.label}
    </span>
  );
}

function ScheduleCard({
  schedule,
  editable,
  onDragStart,
  onDragEnd,
  onClick,
  partPeriod,
}: {
  schedule: ScheduleResponse;
  editable: boolean;
  onDragStart?: (e: DragEvt<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  partPeriod?: number;
}) {
  const cancelled = schedule.scheduleStatus === 'CANCELLED';
  const isSpecial = schedule.scheduleType !== 'COURSE';
  const isLab = schedule.scheduleType === 'COURSE' && schedule.meetingType === 'LAB';
  const metaKey = isLab ? 'LAB' : schedule.scheduleType;
  const meta = SCHEDULE_TYPE_META[metaKey] ?? SCHEDULE_TYPE_META.COURSE;
  const cardBg = cancelled ? 'var(--divider)' : meta.cardBg;
  return (
    <div
      draggable={editable && !isSpecial}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      title={isSpecial
        ? meta.label
        : `${schedule.courseCode} \u00b7 ${schedule.courseName}${schedule.staffNames.length > 0 ? ' \u00b7 ' + schedule.staffNames.join(', ') : schedule.staffName ? ' \u00b7 ' + schedule.staffName : ''}`}
      className={editable && !isSpecial ? 'cursor-grab active:cursor-grabbing' : ''}
      style={{
        background: cardBg,
        border: cancelled ? '1.5px solid var(--surface-border)' : meta.cardBorder,
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        width: '100%',
        minWidth: 0,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        opacity: cancelled ? 0.55 : 1,
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <span
        title={isSpecial ? meta.label : schedule.courseCode}
        style={{
          fontSize: isSpecial ? 11 : 13.5,
          fontWeight: 800,
          color: cancelled ? 'var(--text-lighter)' : 'var(--accent)',
          letterSpacing: '0.2px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {isSpecial ? meta.label.toUpperCase() : schedule.courseCode}
      </span>
      {!isSpecial && !cancelled && (
        <span
          className="badge badge-xs"
          style={{
            background: meta.bg,
            color: meta.fg,
            border: 'none',
            fontWeight: 700,
            lineHeight: 1,
            padding: '1px 5px',
            fontSize: 9.5,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}
        >
          {isLab ? 'Lab' : 'Lecture'}
        </span>
      )}
      {editable && !isSpecial && (
        <GripVertical size={12} style={{ color: 'var(--text-lighter)', position: 'absolute', top: 6, right: 6 }} />
      )}
      {partPeriod != null && (
        <span
          title={`Period P${partPeriod} of P${schedule.startPeriodNo}\u2013P${schedule.endPeriodNo} \u2014 dragging this part re-anchors the whole session`}
          style={{
            position: 'absolute',
            bottom: 4,
            left: 5,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.3px',
            color: cancelled ? 'var(--text-lighter)' : '#fff',
            background: 'rgba(15,23,42,0.35)',
            padding: '1px 5px',
            borderRadius: 999,
            lineHeight: 1.4,
          }}
        >
          P{partPeriod}
        </span>
      )}
      {cancelled && (
        <span className="badge badge-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#dc2626', border: 'none', fontWeight: 700 }}>
          Cancelled
        </span>
      )}
    </div>
  );
}

const dayNameOf = (day: number) => GRID_DAY_NAMES[day - 1] ?? `Day ${day}`;
// Merge schedules returned by move/swap responses into the existing full list
// by id — responses only carry the affected schedules and must never replace
// the whole grid.
const mergeScheduleUpdates = (prev: ScheduleResponse[] | null | undefined, updates: ScheduleResponse[] | null | undefined) => {
  const list = prev ?? [];
  const byId = new Map(list.map((s) => [s.scheduleId, s]));
  for (const s of updates ?? []) byId.set(s.scheduleId, s);
  return [...byId.values()];
};
const slotTextOf = (s: ScheduleResponse) =>
  `${dayNameOf(s.dayOfWeek)} P${s.startPeriodNo}${s.endPeriodNo > s.startPeriodNo ? '-' + s.endPeriodNo : ''}`;
const meetingLabelOf = (s: ScheduleResponse) => {
  const isLab = s.scheduleType === 'COURSE' && s.meetingType === 'LAB';
  const meta = SCHEDULE_TYPE_META[isLab ? 'LAB' : s.scheduleType] ?? SCHEDULE_TYPE_META.COURSE;
  const span = s.endPeriodNo - s.startPeriodNo + 1;
  return `${meta.label} \u2014 ${span} period${span === 1 ? '' : 's'}`;
};

/**
 * One visual frame for legitimately co-located elective courses that share the
 * exact same semester + section + day + period window (the only same-cohort
 * overlap the backend validation allows). Every course code stays visible;
 * codes wrap inside the frame and never escape the cell.
 */
function ElectiveCard({ items, onClick }: { items: ScheduleResponse[]; onClick?: () => void }) {
  const cancelled = items.every((s) => s.scheduleStatus === 'CANCELLED');
  const meta = SCHEDULE_TYPE_META[items[0]?.scheduleType] ?? SCHEDULE_TYPE_META.COURSE;
  const title = items
    .map((s) => `${s.courseCode} \u00b7 ${s.courseName}${s.staffNames.length > 0 ? ' \u00b7 ' + s.staffNames.join(', ') : s.staffName ? ' \u00b7 ' + s.staffName : ''}`)
    .join('\n');
  return (
    <div
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      title={title}
      className={onClick ? 'cursor-pointer' : ''}
      style={{
        background: cancelled ? 'var(--divider)' : meta.cardBg,
        border: cancelled ? '1.5px solid var(--surface-border)' : meta.cardBorder,
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        height: '100%',
        minHeight: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        opacity: cancelled ? 0.55 : 1,
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: cancelled ? 'var(--text-lighter)' : 'var(--accent)',
          letterSpacing: '0.1px',
          lineHeight: 1.45,
          textAlign: 'center',
          maxWidth: '100%',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}
      >
        {items.map((s) => s.courseCode).join(' / ')}
      </span>
      <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-lighter)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
        {items.length} electives
      </span>
    </div>
  );
}

/**
 * Compact Mon–Fri × P1–P6 weekly mini grid. Pass a filtered schedule list and
 * it renders only those sessions (a single course, or a lecturer's whole week).
 * Cells are static (no drag); each spanned cell carries a descriptive tooltip.
 */
function MiniTimetable({ schedules }: { schedules: ScheduleResponse[] }) {
  const PERIODS = [1, 2, 3, 4, 5, 6];
  const MINI_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Non-overlapping sessions per day (a duplicate slot keeps the first).
  const placed = useMemo(() => {
    const list = schedules
      .filter((s) => s.dayOfWeek >= 1 && s.dayOfWeek <= 5 && s.scheduleType === 'COURSE')
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startPeriodNo - b.startPeriodNo);
    const result: ScheduleResponse[] = [];
    for (const s of list) {
      const start = Math.max(1, s.startPeriodNo);
      const end = Math.min(6, s.endPeriodNo);
      const overlaps = result.some(
        (o) =>
          o.dayOfWeek === s.dayOfWeek &&
          Math.max(1, o.startPeriodNo) <= end &&
          Math.min(6, o.endPeriodNo) >= start
      );
      if (overlaps) continue;
      result.push(s);
    }
    return result;
  }, [schedules]);

  const startsByDay = useMemo(() => {
    const map = new Map<number, ScheduleResponse[]>();
    for (const s of placed) {
      const arr = map.get(s.dayOfWeek) ?? [];
      arr.push(s);
      map.set(s.dayOfWeek, arr);
    }
    return map;
  }, [placed]);

  // Continuation periods are consumed by the single spanning cell.
  const coveredByDay = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const s of placed) {
      const start = Math.max(1, s.startPeriodNo);
      const end = Math.min(6, s.endPeriodNo);
      let set = map.get(s.dayOfWeek);
      if (!set) {
        set = new Set<number>();
        map.set(s.dayOfWeek, set);
      }
      for (let p = start + 1; p <= end; p++) set.add(p);
    }
    return map;
  }, [placed]);

  const cardStyle = (s: ScheduleResponse) => {
    const meta = SCHEDULE_TYPE_META[s.scheduleType] ?? SCHEDULE_TYPE_META.COURSE;
    return {
      background: meta.cardBg,
      border: meta.cardBorder,
      color: meta.fg,
    };
  };

  return (
    <div className="w-full">
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(6, minmax(0, 1fr))', gap: 3, marginBottom: 3 }}>
        <div />
        {PERIODS.map((p) => (
          <div
            key={p}
            style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--text-lighter)', textAlign: 'center', letterSpacing: '0.3px' }}
          >
            P{p}
          </div>
        ))}
      </div>
      {MINI_DAYS.map((label, di) => {
        const day = di + 1;
        return (
          <div key={day} style={{ display: 'grid', gridTemplateColumns: '36px repeat(6, minmax(0, 1fr))', gap: 3, marginBottom: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}>
              {label}
            </div>
            {PERIODS.map((p) => {
              // Continuation period — already covered by the session's spanning cell.
              if (coveredByDay.get(day)?.has(p)) return null;
              const s = startsByDay.get(day)?.find((x) => x.startPeriodNo === p);
              if (!s) {
                return (
                  <div
                    key={p}
                    style={{ minHeight: 30, borderRadius: 6, border: '1px solid var(--surface-border)', background: 'var(--secondary-lighter)' }}
                  />
                );
              }
              const spanEnd = Math.min(6, s.endPeriodNo);
              const sectionLabel = (s.sections?.length ? s.sections : s.sectionName ? [s.sectionName] : []).join(' + ') || '';
              const staff = s.staffNames.length > 0 ? s.staffNames.join(', ') : s.staffName || '';
              const meta = SCHEDULE_TYPE_META[s.scheduleType] ?? SCHEDULE_TYPE_META.COURSE;
              const tooltip = `${s.courseCode} \u00b7 ${s.courseName}\n${meta.label}${sectionLabel ? ' \u00b7 Sec ' + sectionLabel : ''}${staff ? ' \u00b7 ' + staff : ''}\n${slotTextOf(s)}`;
              return (
                <div
                  key={p}
                  title={tooltip}
                  style={{
                    gridColumn: `${p + 1} / ${spanEnd + 2}`,
                    minHeight: 30,
                    borderRadius: 6,
                    border: cardStyle(s).border,
                    background: cardStyle(s).background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 3px',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: cardStyle(s).color,
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {s.courseCode}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function WeeklyGridSkeleton() {
  return (
    <div className="w-full overflow-x-auto" role="status" aria-label="Loading timetable">
      <table className="table" style={{ borderRadius: 'var(--radius-lg)' }}>
        <thead>
          <tr>
            <th style={{ width: 96 }}><div className="skeleton h-4 w-14" /></th>
            {GRID_COLUMN_HEADERS.map((h) => (
              <th key={h}><div className="skeleton h-4 w-10" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRID_DAY_NAMES.map((dayName, di) => (
            <tr key={dayName}>
              <th><div className="skeleton h-4 w-16" /></th>
              {GRID_COLUMN_HEADERS.map((h, ci) => {
                const period = periodOfColumn(ci);
                if (h === 'LUNCH') {
                  return (
                    <td key={`${dayName}-lunch`}>
                      <div className="skeleton mx-auto" style={{ width: 10, height: '56px' }} />
                    </td>
                  );
                }
                const show = (di * 7 + period) % 2 === 0;
                return (
                  <td key={`${dayName}-${period}`} className="px-1.5">
                    {show ? (
                      <div className="skeleton" style={{ width: '100%', height: '64px' }} />
                    ) : (
                      <div className="skeleton" style={{ width: '55%', height: '24px', margin: '0 auto' }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface WeeklyTimetableGridProps {
  schedules: ScheduleResponse[];
  editable: boolean;
  periodLabels: string[];
  lunchLabel: string;
  todayIdx?: number;
  /**
   * The caller has already scoped `schedules` to ONE cohort (semester +
   * section). Combined-section rows then legitimately list other sections in
   * their `sections` array, so the grid must NOT re-split them into phantom
   * sibling cohort tables — render a single grid and info panel.
   */
  asSingleCohort?: boolean;
  dragTarget?: { day: number; period: number; span?: number } | null;
  remoteDrag?: RemoteDragState | null;
  dragMode?: 'consecutive' | 'single';
  onDragOver?: (e: DragEvt<HTMLDivElement>, day: number, period: number) => void;
  onDrop?: (e: DragEvt<HTMLDivElement>, day: number, period: number) => void;
  onDragStart?: (e: DragEvt<HTMLDivElement>, schedule: ScheduleResponse, anchorPeriod: number) => void;
  onDragEnd?: () => void;
  onSelectSchedule?: (schedule: ScheduleResponse) => void;
  onSelectElectives?: (items: ScheduleResponse[]) => void;
  onCellClick?: (day: number, period: number) => void;
}const periodOfColumn = (ci: number) => (ci < LUNCH_HEADER_COL ? ci + 1 : ci);

/** Grid column of a period: P1–P3 map to columns 2–4, P4–P6 to 6–8 (lunch is column 5). */
const colIndexOf = (period: number) => (period <= 3 ? period + 1 : period + 2);

/**
 * Visual segments of a session for grid-column spanning. Sessions that cross
 * lunch render as two segments (before + after lunch); all others render as one
 * continuous segment that occupies every period in the window.
 */
const segmentListOf = (s: ScheduleResponse): [number, number][] =>
  s.startPeriodNo <= 3 && s.endPeriodNo >= 4
    ? [[s.startPeriodNo, 3], [4, s.endPeriodNo]]
    : [[s.startPeriodNo, s.endPeriodNo]];

/**
 * Identity of one teaching session so split halves (created by single-cell
 * swaps) can be re-joined visually. Group sessions share a group id, plain
 * sessions share an assignment id; fall back to course+section only when a
 * schedule carries neither.
 */
const sessionKeyOf = (s: ScheduleResponse): string => {
  if (s.teachingGroupId) return `g:${s.teachingGroupId}`;
  if (s.teachingAssignmentId) return `a:${s.teachingAssignmentId}`;
  return `c:${s.courseCode}|${(s.sections ?? []).join(',')}|${s.sectionName ?? ''}`;
};

/**
 * Grouping key for the timetable presentation: semester + section + weekday +
 * period. Schedules from different semesters or sections must never share a
 * visual cell — each cohort gets its own table.
 */
const groupSchedulesByCohort = (schedules: ScheduleResponse[]): { semesterNo: number; section: string; items: ScheduleResponse[] }[] => {
  const map = new Map<string, { semesterNo: number; section: string; items: ScheduleResponse[] }>();
  for (const s of schedules) {
    const semesterNo = typeof s.semesterNo === 'number' ? s.semesterNo : Number(s.semesterNo ?? 0);
    const sections = Array.from(new Set(
      (s.sections && s.sections.length > 0 ? s.sections : s.sectionName ? [s.sectionName] : [])
        .map((x) => String(x).trim())
        .filter(Boolean)
    ));
    for (const section of sections) {
      const key = `${semesterNo}|${section}`;
      const group = map.get(key) ?? { semesterNo, section, items: [] };
      if (!map.has(key)) map.set(key, group);
      group.items.push(s);
    }
  }
  // LMS / ASSIGNMENT fillers are stored section-less (schema requires null
  // assignment/group), so they arrive with no cohort attribution. They belong
  // in EVERY cohort table whose courses do not already occupy their slot -
  // that is exactly the slot the solver verified as free for that section.
  // Fillers must never CREATE a cohort table, only join existing ones.
  // BREAK fillers are intentionally omitted: only LMS and Assignment show in
  // free cells.
  for (const s of schedules) {
    if (s.scheduleType === 'COURSE' || s.scheduleType === 'BREAK') continue;
    for (const group of map.values()) {
      const occupied = group.items.some((c) =>
        c.scheduleType === 'COURSE' &&
        c.dayOfWeek === s.dayOfWeek &&
        c.startPeriodNo <= s.endPeriodNo &&
        c.endPeriodNo >= s.startPeriodNo
      );
      if (!occupied) group.items.push(s);
    }
  }
  return [...map.values()].sort(
    (a, b) => a.semesterNo - b.semesterNo || a.section.localeCompare(b.section)
  );
};

function WeeklyTimetableGrid({
  schedules,
  editable,
  periodLabels,
  todayIdx = -1,
  dragTarget = null,
  remoteDrag = null,
  dragMode = 'consecutive',
  asSingleCohort = false,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onSelectSchedule,
  onSelectElectives,
  onCellClick,
}: WeeklyTimetableGridProps) {
  const groups = useMemo(
    () => (asSingleCohort ? [] : groupSchedulesByCohort(schedules)),
    [schedules, asSingleCohort]
  );

  const renderCohortGrid = (items: ScheduleResponse[]) => (
    <div style={{ display: 'grid', gap: 1, minWidth: 940, gridTemplateColumns: GRID_COLUMNS }}>
      <div
        style={{
          padding: '9px 10px',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-light)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Day
      </div>
      {GRID_COLUMN_HEADERS.map((h, ci) => {
        const isLunch = ci === LUNCH_HEADER_COL;
        const headerPeriod = periodOfColumn(ci);
        return (
          <div
            key={h}
            style={{
              padding: '9px 10px',
              fontSize: 11,
              fontWeight: 800,
              color: isLunch ? '#d97706' : 'var(--primary)',
              textAlign: 'center',
              background: isLunch ? 'rgba(251,191,36,0.12)' : 'var(--secondary-lighter)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            <span>{h}</span>
            <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--text-lighter)' }}>
              {isLunch ? '' : (periodLabels[headerPeriod - 1] ?? '')}
            </span>
          </div>
        );
      })}

      {GRID_DAY_NAMES.map((dayName, di) => {
        const day = di + 1;
        const isToday = di === todayIdx;
        const daySpanStarts = new Map<number, { s: ScheduleResponse; segEnd: number }[]>();
        const dayCovered = new Set<number>();
        const dayContinuers = new Map<number, ScheduleResponse[]>();
        for (const ss of items) {
          if (ss.dayOfWeek !== day) continue;
          for (const [segStart, segEnd] of segmentListOf(ss)) {
            const arr = daySpanStarts.get(segStart) ?? [];
            arr.push({ s: ss, segEnd });
            daySpanStarts.set(segStart, arr);
            for (let p = segStart + 1; p <= segEnd; p++) {
              dayCovered.add(p);
              if (dragMode === 'single') {
                const contArr = dayContinuers.get(p) ?? [];
                contArr.push(ss);
                dayContinuers.set(p, contArr);
              }
            }
          }
        }
        // Block view re-joins adjacent single-cell halves of the SAME session
        // (e.g. an M-1101 split into P3 + P2 by a single-cell swap) into one
        // consecutive cell, so two same-course cells side by side read as what
        // they really are. The lunch boundary (P3 | P4) is never merged — those
        // two cells stay visually separate even though the periods are adjacent.
        const mergedStarts = new Map<number, number>();
        const mergedCovered = new Set<number>();
        if (dragMode !== 'single') {
          for (const [segLo, segHi] of [[1, 3], [4, 6]] as const) {
            for (let p = segLo; p <= segHi; p++) {
              if (mergedCovered.has(p)) continue;
              const startRow = daySpanStarts.get(p);
              if (!startRow || startRow.length !== 1) continue;
              const row = startRow[0].s;
              if (row.courseCode == null || row.startPeriodNo !== row.endPeriodNo) continue;
              let end = p;
              while (end < segHi) {
                const next = daySpanStarts.get(end + 1);
                if (!next || next.length !== 1) break;
                const n = next[0].s;
                if (n.courseCode == null || n.courseCode !== row.courseCode) break;
                if (n.startPeriodNo !== n.endPeriodNo) break;
                if (sessionKeyOf(n) !== sessionKeyOf(row)) break;
                end++;
              }
              if (end > p) {
                mergedStarts.set(p, end);
                for (let q = p + 1; q <= end; q++) mergedCovered.add(q);
              }
            }
          }
        }
        return (
          <Fragment key={dayName}>
            <div
              className="bg-base-100"
              style={{
                gridColumn: 1,
                gridRow: di + 2,
                position: 'sticky',
                left: 0,
                zIndex: 5,
                minHeight: GRID_CELL_MIN_HEIGHT,
                padding: '10px 12px',
                fontSize: 12.5,
                fontWeight: 800,
                color: 'var(--accent)',
                borderRadius: 6,
                borderStyle: 'solid',
                borderWidth: '1.5px',
                borderColor: isToday ? 'var(--primary)' : 'var(--surface-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
                boxShadow: isToday ? '0 2px 10px rgba(40,114,161,0.2)' : '1px 0 0 var(--surface-border)',
              }}
            >
              <span>{dayName}</span>
              {isToday && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Today
                </span>
              )}
            </div>

            {GRID_COLUMN_HEADERS.map((h, ci) => {
              const period = periodOfColumn(ci);
              if (h === 'LUNCH') return null;
              // Continuation periods of a multi-period session are consumed by the
              // one continuous cell that spans them — no separate cell is rendered.
              // In single-cell drag mode they become their own single cell instead.
              if (mergedCovered.has(period)) return null;
              if (dayCovered.has(period)) {
                if (dragMode !== 'single') return null;
                const continuers = dayContinuers.get(period);
                if (!continuers || continuers.length === 0) return null;
                const contTarget = dragTarget?.day === day && dragTarget.period === period;
                const contRemote = remoteDrag?.day === day && remoteDrag.period === period;
                return (
                  <div
                    key={`${day}-${period}`}
                    onDragOver={onDragOver ? (e) => onDragOver(e, day, period) : undefined}
                    onDrop={onDrop ? (e) => onDrop(e, day, period) : undefined}
                    onClick={onCellClick ? () => onCellClick(day, period) : undefined}
                    style={{
                      gridColumn: `${colIndexOf(period)} / ${colIndexOf(period) + 1}`,
                      gridRow: di + 2,
                      minHeight: GRID_CELL_MIN_HEIGHT,
                      minWidth: 0,
                      borderRadius: 6,
                      borderStyle: 'dashed',
                      borderWidth: '1.5px',
                      borderColor: contTarget ? 'var(--primary)' : 'var(--surface-border)',
                      background: contTarget ? 'rgba(40,114,161,0.12)' : 'var(--secondary-lighter)',
                      padding: 5,
                      position: 'relative',
                      zIndex: contTarget ? 3 : 1,
                      overflow: 'visible',
                    }}
                  >
                    {contRemote && (
                      <div
                        className="animate-pulse"
                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 4, width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 1, height: '100%' }}>
                      {continuers.map((s) => (
                        <div key={`${day}-${period}-${s.scheduleId}`} style={{ flex: '1 1 0%', minWidth: 0, position: 'relative' }}>
                          <ScheduleCard
                            schedule={s}
                            editable={editable}
                            partPeriod={period}
                            onDragStart={onDragStart ? (e) => onDragStart(e, s, period) : undefined}
                            onDragEnd={onDragEnd}
                            onClick={onSelectSchedule ? () => onSelectSchedule(s) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              const groupStarts = daySpanStarts.get(period);
              const isTarget =
                dragTarget?.day === day &&
                period >= (dragTarget.period ?? 0) &&
                period <= (dragTarget.period ?? 0) + (dragTarget.span ?? 1) - 1;
              const remoteHere = remoteDrag?.day === day && remoteDrag.period === period;
              if (groupStarts) {
                const segEnd = mergedStarts.has(period)
                  ? mergedStarts.get(period)!
                  : Math.max(...groupStarts.map((x) => x.segEnd));
                const combined =
                  groupStarts.length > 1 &&
                  new Set(groupStarts.map((x) => x.s.courseCode)).size === groupStarts.length;
                // In single-cell mode a co-located elective cluster is also
                // splittable: each course renders as its own draggable part
                // (P1 included) instead of the combined ElectiveCard frame.
                const showCombinedFrame =
                  combined && dragMode === 'consecutive';
                return (
                  <div
                    key={`${day}-${period}`}
                    onDragOver={onDragOver ? (e) => onDragOver(e, day, period) : undefined}
                    onDrop={onDrop ? (e) => onDrop(e, day, period) : undefined}
                    onClick={onCellClick ? () => onCellClick(day, period) : undefined}
                    style={{
                      gridColumn:
                        dragMode === 'single'
                          ? `${colIndexOf(period)} / ${colIndexOf(period) + 1}`
                          : `${colIndexOf(period)} / ${colIndexOf(segEnd) + 1}`,
                      gridRow: di + 2,
                      minHeight: GRID_CELL_MIN_HEIGHT,
                      minWidth: 0,
                      borderRadius: 6,
                      borderStyle: 'solid',
                      borderWidth: '1.5px',
                      borderColor: isTarget ? 'var(--primary)' : 'var(--surface-border)',
                      background: isTarget ? 'rgba(40,114,161,0.12)' : 'var(--secondary-lighter)',
                      padding: 5,
                      position: 'relative',
                      zIndex: isTarget ? 3 : 1,
                      overflow: 'visible',
                    }}
                  >
                    {remoteHere && (
                      <div
                        className="animate-pulse"
                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 4, width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}
                      />
                    )}
                    {showCombinedFrame ? (
                      <ElectiveCard
                        items={groupStarts.map((x) => x.s)}
                        onClick={onSelectElectives ? () => onSelectElectives(groupStarts.map((x) => x.s)) : undefined}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 1, height: '100%' }}>
                        {groupStarts.map(({ s }) => (
                          <div key={s.scheduleId} style={{ flex: '1 1 0%', minWidth: 0, position: 'relative' }}>
                            <ScheduleCard
                              schedule={s}
                              editable={editable}
                              partPeriod={dragMode === 'single' && s.endPeriodNo > s.startPeriodNo ? s.startPeriodNo : undefined}
                              onDragStart={onDragStart ? (e) => onDragStart(e, s, s.startPeriodNo) : undefined}
                              onDragEnd={onDragEnd}
                              onClick={onSelectSchedule ? () => onSelectSchedule(s) : undefined}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={`${day}-${period}`}
                  onDragOver={onDragOver ? (e) => onDragOver(e, day, period) : undefined}
                  onDrop={onDrop ? (e) => onDrop(e, day, period) : undefined}
                  onClick={onCellClick ? () => onCellClick(day, period) : undefined}
                  style={{
                    gridColumn: ci + 2,
                    gridRow: di + 2,
                    minHeight: GRID_CELL_MIN_HEIGHT,
                    minWidth: 0,
                    borderRadius: 6,
                    borderStyle: 'solid',
                    borderWidth: '1.5px',
                    borderColor: isTarget ? 'var(--primary)' : 'var(--surface-border)',
                    background: isTarget ? 'rgba(40,114,161,0.12)' : 'var(--secondary-lighter)',
                    padding: 5,
                    position: 'relative',
                    zIndex: isTarget ? 3 : 1,
                    overflow: 'visible',
                  }}
                >
                  {remoteHere && (
                    <div
                      className="animate-pulse"
                      style={{ position: 'absolute', top: 4, right: 4, zIndex: 4, width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}
                    />
                  )}
                </div>
              );
            })},
          </Fragment>
        );
      })},

      {/* Remote drag: the exact schedule cell another HOD is dragging, live. */}
      {remoteDrag?.schedule && remoteDrag.day != null && remoteDrag.period != null && (() => {
        const s = remoteDrag.schedule;
        const span = dragMode === 'single' ? 1 : s.endPeriodNo - s.startPeriodNo + 1;
        const endPeriod = Math.min(
          remoteDrag.period + span - 1,
          remoteDrag.period <= 3 ? 3 : MAX_PERIOD
        );
        return (
          <div
            className="animate-pulse"
            style={{
              gridColumn: `${colIndexOf(remoteDrag.period)} / ${colIndexOf(endPeriod) + 1}`,
              gridRow: remoteDrag.day + 1,
              zIndex: 40,
              pointerEvents: 'none',
              position: 'relative',
              minHeight: GRID_CELL_MIN_HEIGHT,
              padding: 3,
              borderRadius: 'var(--radius-md)',
              border: '2px dashed #8b5cf6',
              background: 'rgba(139,92,246,0.12)',
              boxSizing: 'border-box',
            }}
          >
            <ScheduleCard schedule={s} editable={false} />
            <span
              className="badge badge-xs"
              style={{
                position: 'absolute',
                top: -8,
                right: 6,
                zIndex: 41,
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              {remoteDrag.staffName}
            </span>
          </div>
        );
      })()}

      {/* Lunch strip */}
      <div
        style={{
          gridColumn: 5,
          gridRow: `2 / ${GRID_DAY_NAMES.length + 2}`,
          alignSelf: 'stretch',
          width: '100%',
          minHeight: GRID_CELL_MIN_HEIGHT * GRID_DAY_NAMES.length,
          zIndex: 1,
          background: 'repeating-linear-gradient(45deg, var(--divider), var(--divider) 6px, var(--secondary-lighter) 6px, var(--secondary-lighter) 12px)',
          borderLeft: '1.5px dashed var(--surface-border)',
          borderRight: '1.5px dashed var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
        }}
      >
        {[...'LUNCH'].reverse().map((ch, li) => (
          <span
            key={`${ch}-${li}`}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-lighter)',
              fontStyle: 'italic',
              lineHeight: 1,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );

  if (groups.length <= 1) {
    return (
      <>
        {renderCohortGrid(schedules)}
        <CourseInfoPanel schedules={schedules} />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map((g) => (
        <div key={`${g.semesterNo}|${g.section}`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
              Semester {g.semesterNo} — Section {g.section}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-lighter)' }}>
              {g.items.length} {g.items.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
            {renderCohortGrid(g.items)}
          </div>
          <CourseInfoPanel schedules={g.items} />
        </div>
      ))}
    </div>
  );
}

function CourseInfoPanel({ schedules }: { schedules: ScheduleResponse[] }) {
  const rows = useMemo(() => {
    const byCode = new Map<string, { code: string; name: string; type: ScheduleResponse['scheduleType']; staff: Set<string> }>();
    for (const s of schedules) {
      if (s.scheduleType !== 'COURSE') continue; // info panel lists curriculum courses only
      const staff = s.staffNames.length > 0 ? s.staffNames.join(', ') : s.staffName;
      const existing = byCode.get(s.courseCode);
      if (existing) {
        if (staff) existing.staff.add(staff);
      } else {
        byCode.set(s.courseCode, { code: s.courseCode, name: s.courseName, type: s.scheduleType, staff: new Set(staff ? [staff] : []) });
      }
    }
    return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [schedules]);

  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 14, border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-soft)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--surface-border)' }}>
        <BookOpen size={13} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
          Course Information
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-lighter)', fontWeight: 600 }}>
          ({rows.length} {rows.length === 1 ? 'course' : 'courses'})
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 14px', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {rows.map((r) => (
          <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <ScheduleTypeBadge type={r.type} />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: 'var(--accent)',
                fontFamily: 'Consolas, Menlo, monospace',
                flexShrink: 0,
              }}
            >
              {r.code}
            </span>
            <span
              title={r.name}
              style={{
                fontSize: 11.5,
                color: 'var(--text)',
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.name}
            </span>
            <span
              title={Array.from(r.staff).join(', ')}
              style={{
                fontSize: 11,
                color: 'var(--text-light)',
                flexShrink: 0,
                maxWidth: 280,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {Array.from(r.staff).join(', ') || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenerationStatusPill({ status }: { status: GenerationStatus }) {
  const generating = status === 'GENERATING';
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        padding: '4px 11px',
        borderRadius: 16,
        background: `${statusColor(status)}1f`,
        color: statusColor(status),
        letterSpacing: '0.3px',
      }}
    >
      {generating && <Loader2 size={11} className="animate-spin" />}
      {statusLabel(status)}
    </span>
  );
}

interface SharedTimetableWorkspaceProps {
  generationId: string;
  onBack: () => void;
  /** Called when the session genuinely does not exist after bounded retries. */
  onNotFound?: (generationId: string) => void;
  /**
   * When provided, the workspace is locked to exactly one generated section's
   * timetable (Semester + Section). The filter dropdowns and generation scope
   * panel are hidden and only that cohort's grid is shown.
   */
  initialSectionScope?: { semesterNo: number; section: string } | null;
  staff: StaffRecord;
}

// ============================================================================
// Roll Call workspace: Today / Schedule / History tabs on ONE page
// ============================================================================

export type RollCallTab = 'today' | 'schedules' | 'history';

function readRollCallTab(): RollCallTab {
  if (typeof window === 'undefined') return 'today';
  const t = new URLSearchParams(window.location.search).get('tab');
  return t === 'schedules' || t === 'history' ? (t as RollCallTab) : 'today';
}

export function RollCallWorkspace() {
  // Tab survives browser refresh: mirrored into the URL query string.
  const [tab, setTab] = useState<RollCallTab>(readRollCallTab);

  const switchTab = (t: RollCallTab) => {
    setTab(t);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const [seed, setSeed] = useState<{ sid: string; month: string } | null>(null);

  const openHistory = (sid: string, month: string) => {
    setSeed({ sid, month });
    switchTab('history');
  };

  const tabs: { id: RollCallTab; label: string }[] = [
    { id: 'today', label: "Today's Roll Call" },
    { id: 'schedules', label: 'Schedule Roll Call' },
    { id: 'history', label: 'Roll Call History' },
  ];

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={'btn btn-sm cursor-pointer ' + (tab === t.id ? 'btn-primary' : 'btn-ghost')}
            style={{ border: '1.5px solid var(--surface-border)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <RollCallSection mode="today" onViewHistory={openHistory} />
      )}
      {tab === 'schedules' && (
        <RollCallSection mode="schedules" onViewHistory={openHistory} />
      )}
      {tab === 'history' && (
        <RollCallHistorySection
          key={(seed?.sid ?? '') + '|' + (seed?.month ?? '')}
          seedScheduleId={seed?.sid}
          seedMonth={seed?.month}
        />
      )}
    </div>
  );
}

export function SharedTimetableWorkspace({ generationId, onBack, onNotFound, initialSectionScope = null, staff }: SharedTimetableWorkspaceProps) {
  const router = useRouter();
  const lastEditStartRef = useRef<string | null>(null);
  const sectionScope = initialSectionScope;
  const [generation, setGeneration] = useState<GenerationSessionResponse | null>(null);
  const [lobby, setLobby] = useState<TimetableLobbyResponse | null>(null);
  const [manage, setManage] = useState<GenerationManageResponse | null>(null);
  const [scope, setScope] = useState<GenerationScopeSemester[] | null>(null);
  const [examTypes, setExamTypes] = useState<ExamTypeResponse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse[] | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('PENDING');
  const [snapshotStatus, setSnapshotStatus] = useState<'SNAPSHOT_PREPARING' | 'SNAPSHOT_READY' | 'SNAPSHOT_INVALID' | 'SNAPSHOT_ERROR' | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotPreparing, setSnapshotPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Record<string, Set<string>>>({});
  const [viewSemester, setViewSemester] = useState<number | 'all'>('all');
  const [viewSection, setViewSection] = useState<string>('all');
  const [scopeLoading, setScopeLoading] = useState(false);
  const [lock, setLock] = useState<TimetableLockResponse | null>(null);
  const [remoteDrag, setRemoteDrag] = useState<RemoteDragState | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: number; period: number; span?: number } | null>(null);
  // How a dragged multi-period session is placed:
  //  'consecutive' - the block stays one spanning cell and drops as its full
  //    consecutive span (drag two -> two cells, drag one -> one cell).
  //  'single' - each period of the session is drawn as its own draggable cell;
  //    grabbing P1 or P2 moves the session so the grabbed cell lands on the
  //    drop cell and the other period follows adjacent (the backend always
  //    keeps the pair together, so this splits the drag handle, not the data).
  const [dragMode, setDragMode] = useState<'consecutive' | 'single'>('consecutive');
  const dragSpanRef = useRef(1);
  const [pendingSwap, setPendingSwap] = useState<PendingSwapState | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<ScheduleResponse | null>(null);
  const [lecturerDetail, setLecturerDetail] = useState<string | null>(null);
  const [electivePick, setElectivePick] = useState<ScheduleResponse[] | null>(null);
  const [moveTarget, setMoveTarget] = useState<ScheduleResponse | null>(null);
  const [undoStack, setUndoStack] = useState<EditOp[]>([]);
  const [redoStack, setRedoStack] = useState<EditOp[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<TimetableEvent[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<'grid' | 'history'>('grid');
  const [showCmr, setShowCmr] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStaffList, setInviteStaffList] = useState<StaffRecord[] | null>(null);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [groups, setGroups] = useState<TeachingGroupResponse[] | null>(null);
  const [assignments, setAssignments] = useState<TeachingAssignmentResponse[] | null>(null);
  const [unitCourses, setUnitCourses] = useState<CourseRecord[] | null>(null);
  const [groupCourseId, setGroupCourseId] = useState('');
  const [groupAssignments, setGroupAssignments] = useState<Set<string>>(new Set());
  const [groupsSaving, setGroupsSaving] = useState(false);
  const [groupsTab, setGroupsTab] = useState<'myUnit' | 'allUnits'>('myUnit');
  const [groupsUnitFilter, setGroupsUnitFilter] = useState('all');
  const [groupsSemFilter, setGroupsSemFilter] = useState('all');
  const [addToGroupId, setAddToGroupId] = useState('');
  const [addGroupAssignments, setAddGroupAssignments] = useState<Set<string>>(new Set());
  const [addGroupsSaving, setAddGroupsSaving] = useState(false);
  const [, setGenerationTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isHod = manage?.isHod === true;
  const canManage = manage?.canManage === true;
  const lockOwned = lock?.locked === true && lock.staffId === staff.staffId;
  const canEdit = canManage && status !== 'PUBLISHED' && lockOwned;
  const activeLobby = lobby && (lobby.status === 'OPEN' || lobby.status === 'GENERATING') ? lobby : null;

  // Latest-callback refs keep loadAll/subscriptions stable across renders.
  const onNotFoundRef = useRef(onNotFound);
  useEffect(() => {
    onNotFoundRef.current = onNotFound;
  }, [onNotFound]);

  const clearGenerationTimer = useCallback(() => {
    setGenerationTimer((prev) => {
      if (prev) clearTimeout(prev);
      return null;
    });
  }, []);

  const refreshSchedules = useCallback(async () => {
    const list = await getGenerationSchedules(generationId);
    setSchedules(list);
  }, [generationId]);

  // Prepare (or reuse) the backend snapshot owned by this generationId. Runs in
  // the background so the workspace renders immediately on entry; the Generate
  // button is gated until the snapshot is READY. On refresh/reconnect this
  // simply re-fetches the already-prepared backend state (reuse, no rebuild).
  //
  // State model (single source of truth derived from the backend):
  //   PREPARING -> error=null, generateDisabled=true
  //   READY     -> error=null, generateDisabled=false
  //   ERROR     -> error=real message, generateDisabled=true
  // The preparation error is cleared on every non-error transition so a stale
  // "Could not prepare" can never keep Generate disabled after backend READY.
  const loadSnapshot = useCallback(async () => {
    setSnapshotStatus('SNAPSHOT_PREPARING');
    setSnapshotPreparing(true);
    setSnapshotError(null);
    try {
      const snap = await prepareSnapshot(generationId);
      setSnapshotStatus(snap.status);
      if (snap.status === 'SNAPSHOT_READY') {
        setSnapshotError(null);
      }
    } catch (e) {
      setSnapshotStatus('SNAPSHOT_ERROR');
      setSnapshotError(e instanceof Error ? e.message : 'Could not prepare timetable data');
    } finally {
      setSnapshotPreparing(false);
    }
  }, [generationId]);

  // Manual recovery: re-runs prepareSnapshot. The backend is authoritative —
  // existing snapshot is reused, a missing one is created. Clears the old error
  // as soon as the backend reports READY (TEST4).
  const retrySnapshot = useCallback(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const scheduleGenerationFallback = useCallback(() => {
    clearGenerationTimer();
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick() {
      try {
        const gen = await getGeneration(generationId);
        setGeneration(gen);
        setStatus(gen.status);
        if (gen.status === 'GENERATING') {
          const started = gen.startedAt ? new Date(gen.startedAt).getTime() : Date.now();
          if (Date.now() - started > GENERATION_FALLBACK_MS + GENERATION_GRACE_MS) {
            setStatus('FAILED');
            setSaveError('Generation took too long — the server may be unreachable. Refresh and try again.');
          } else {
            timer = setTimeout(tick, GENERATION_FALLBACK_MS);
            setGenerationTimer(timer);
          }
        } else {
          // Generation finished but the realtime stream may have missed the
          // completion event (e.g. SSE connected mid-generation). Pull the
          // schedules so the grid appears without a hard refresh.
          clearGenerationTimer();
          refreshSchedules().catch(() => {});
        }
      } catch {
        timer = setTimeout(tick, GENERATION_FALLBACK_MS);
        setGenerationTimer(timer);
      }
    }
    timer = setTimeout(tick, GENERATION_FALLBACK_MS);
    setGenerationTimer(timer);
  }, [generationId, clearGenerationTimer, refreshSchedules]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the exact session referenced by navigation. Bounded retry with
      // the SAME id absorbs transient read races right after commit; it is not
      // a polling loop and never guesses by "latest session".
      let gen: GenerationSessionResponse | null = null;
      let genErr: unknown = null;
      for (let attempt = 0; attempt < 3 && !gen; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 700));
        try {
          gen = await getGeneration(generationId);
        } catch (err) {
          genErr = err;
          // A genuine 404 will not heal; stop retrying immediately.
          if (/not found/i.test(err instanceof Error ? err.message : '')) break;
        }
      }
      if (!gen) {
        const message = genErr instanceof Error ? genErr.message : '';
        if (onNotFoundRef.current && /not found/i.test(message)) {
          onNotFoundRef.current(generationId);
          return;
        }
        throw genErr ?? new Error('Could not load the generation session');
      }
      const [et, lobbies] = await Promise.all([getExamTypes(), getGenerationLobbies()]);
      setGeneration(gen);
      setStatus(gen.status);
      if (gen.status === 'GENERATING') {
        // Entering a workspace mid-generation: the SSE start event may already
        // be gone, so seed the polling fallback now. It also pulls the final
        // schedules the moment generation finishes, no refresh required.
        scheduleGenerationFallback();
      }
      setExamTypes(et);
      // Kick off (non-blocking) snapshot preparation/reuse for this generationId
      // so the workspace renders immediately and Generate stays gated until READY.
      loadSnapshot();
      const initialExamTypeId = et[0]?.examTypeId ?? '';
      setSelectedExamType(initialExamTypeId);
      const [mg, sc, sch] = await Promise.all([
        getGenerationManage(gen.termId),
        getGenerationScope(gen.termId, initialExamTypeId),
        getGenerationSchedules(generationId),
      ]);
      const lob = lobbies.find((l) => l.generationId === generationId) ?? null;
      setManage(mg);
      setScope(sc);
      setSchedules(sch);
      setLobby(lob);
      setSelectedSemesters((prev) => (prev.size > 0 ? prev : sc.length > 0 ? new Set([sc[0].semesterId]) : prev));
      setSelectedSections((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        if (sc.length === 0) return prev;
        return { [sc[0].semesterId]: new Set(sc[0].sections.map((s) => s.sectionId)) };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the generation workspace');
    } finally {
      setLoading(false);
    }
  }, [generationId, loadSnapshot, scheduleGenerationFallback]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial workspace load
    loadAll();
  }, [loadAll]);

  useEffect(() => () => clearGenerationTimer(), [clearGenerationTimer]);

  // Drive the snapshot toward READY on workspace entry. A "missing" snapshot
  // (status null/INVALID) is recovered by calling the authoritative POST
  // prepareSnapshot, never by showing a permanent error. A transient SNAPSHOT_ERROR
  // is self-healed with a single delayed auto-retry; a persistent one exposes a
  // manual "Try again" so the user is never permanently locked out.
  const snapshotRetryRef = useRef(0);
  useEffect(() => {
    if (snapshotPreparing) return;
    if (snapshotStatus === 'SNAPSHOT_PREPARING') return;
    if (snapshotStatus === 'SNAPSHOT_READY') {
      snapshotRetryRef.current = 0;
      return;
    }
    if (snapshotStatus === 'SNAPSHOT_ERROR') {
      if (snapshotRetryRef.current === 0) {
        snapshotRetryRef.current += 1;
        const t = setTimeout(() => loadSnapshot(), 1500);
        return () => clearTimeout(t);
      }
      return;
    }
    // null (initial) or SNAPSHOT_INVALID -> recover by preparing.
    if (snapshotRetryRef.current < 3) {
      snapshotRetryRef.current += 1;
      loadSnapshot();
    }
  }, [snapshotStatus, snapshotPreparing, loadSnapshot]);

  useTimetableRealtimeGeneration(generationId, (event) => {
    if (event.generationId && event.generationId !== generationId) return;
    pushEvent(setHistory, event.type);
    switch (event.type) {
      case TIMETABLE_REALTIME_EVENTS.GENERATION_STARTED:
        setStatus('GENERATING');
        setSaving(false);
        setSaveError(null);
        scheduleGenerationFallback();
        break;
      case TIMETABLE_REALTIME_EVENTS.SNAPSHOT_STATE:
        if (
          event.snapshotStatus === 'SNAPSHOT_READY' ||
          event.snapshotStatus === 'SNAPSHOT_PREPARING' ||
          event.snapshotStatus === 'SNAPSHOT_INVALID' ||
          event.snapshotStatus === 'SNAPSHOT_ERROR'
        ) {
          if (event.snapshotStatus === 'SNAPSHOT_ERROR') {
            setSnapshotStatus('SNAPSHOT_ERROR');
            setSnapshotError(event.snapshotError as string | undefined ?? 'Could not prepare timetable data');
          } else {
            setSnapshotStatus(event.snapshotStatus);
            // Any non-error realtime state clears a stale preparation error, so a
            // previously shown "Could not prepare" cannot persist after recovery.
            setSnapshotError(null);
          }
        }
        break;
      case TIMETABLE_REALTIME_EVENTS.GENERATION_COMPLETED:
        setStatus('COMPLETED');
        setSaving(false);
        setSaveError(null);
        clearGenerationTimer();
        refreshSchedules().catch(() => {});
        break;
      case TIMETABLE_REALTIME_EVENTS.GENERATION_FAILED:
        setStatus('FAILED');
        setSaving(false);
        clearGenerationTimer();
        getGeneration(generationId).then(setGeneration).catch(() => {});
        toast.error('Timetable generation failed — see the reason below');
        break;
      case TIMETABLE_REALTIME_EVENTS.TIMETABLE_PUBLISHED:
        setStatus('PUBLISHED');
        clearGenerationTimer();
        refreshSchedules().catch(() => {});
        toast.success('Timetable published');
        break;
      case TIMETABLE_REALTIME_EVENTS.TIMETABLE_DELETED:
        clearGenerationTimer();
        setStatus('FAILED');
        break;
      case TIMETABLE_REALTIME_EVENTS.SCHEDULE_CREATED:
      case TIMETABLE_REALTIME_EVENTS.SCHEDULE_UPDATED:
      case TIMETABLE_REALTIME_EVENTS.SCHEDULE_DELETED:
        refreshSchedules().catch(() => {});
        break;
      case TIMETABLE_REALTIME_EVENTS.SCHEDULE_LOCKED:
        setLock({
          generationId,
          locked: true,
          staffId: event.staffId ?? null,
          staffName: event.lockOwner ?? null,
          expiresAt: event.expiresAt ?? null,
        });
        break;
      case TIMETABLE_REALTIME_EVENTS.SCHEDULE_UNLOCKED:
        setLock((prev) =>
          prev ? { ...prev, locked: false, staffId: null, staffName: null, expiresAt: null } : prev
        );
        break;
      case TIMETABLE_REALTIME_EVENTS.DRAG_STARTED:
        if (event.staffId && event.staffId !== staff.staffId) {
          setRemoteDrag({
            scheduleId: event.scheduleId ?? '',
            staffName: event.staffName ?? 'Another editor',
            day: event.day ?? null,
            period: event.period ?? null,
            schedule: (schedules ?? []).find((s) => s.scheduleId === event.scheduleId) ?? null,
          });
        }
        break;
      case TIMETABLE_REALTIME_EVENTS.DRAG_MOVED:
        if (event.staffId && event.staffId !== staff.staffId) {
          setRemoteDrag((prev) =>
            prev
              ? { ...prev, staffName: event.staffName ?? prev.staffName, day: event.day ?? null, period: event.period ?? null }
              : prev
          );
        }
        break;
      case TIMETABLE_REALTIME_EVENTS.DRAG_ENDED:
        if (event.staffId !== staff.staffId) setRemoteDrag(null);
        break;
      case TIMETABLE_REALTIME_EVENTS.EDIT_STARTED: {
        // The lobby creator opened the dedicated edit workspace: every joined
        // HOD navigates there too. Dedup repeated deliveries and never navigate
        // when we are already on the edit route.
        if (event.generationId && event.generationId !== generationId) break;
        if (lastEditStartRef.current === generationId) break;
        lastEditStartRef.current = generationId;
        if (typeof window !== 'undefined' && window.location.pathname === '/lecturer/timetable-edit') break;
        router.push(`/lecturer/timetable-edit?generationId=${encodeURIComponent(generationId)}`);
        break;
      }
      case TIMETABLE_REALTIME_EVENTS.LOBBY_CANCELLED:
        setLobby((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
        break;
      case TIMETABLE_REALTIME_EVENTS.TEACHING_GROUP_CREATED:
      case TIMETABLE_REALTIME_EVENTS.TEACHING_GROUP_UPDATED:
      case TIMETABLE_REALTIME_EVENTS.TEACHING_GROUP_DELETED:
        if (showGroups) {
          getTeachingGroups(generation?.termId)
            .then(setGroups)
            .catch(() => {});
        }
        break;
      default:
        break;
    }
  }, () => {
    // Stream (re)connected: SSE has no replay, so re-read the authoritative
    // status and schedules for THIS generation id. This recovers missed
    // GENERATION_* / SCHEDULE_* events after a network drop without any
    // manual refresh.
    getGeneration(generationId)
      .then((gen) => {
        setGeneration(gen);
        setStatus(gen.status);
      })
      .catch(() => {});
    refreshSchedules().catch(() => {});
  });

  useEffect(() => {
    if (!canManage || status === 'PUBLISHED') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const current = await getTimetableLock(generationId);
        if (cancelled) return;
        setLock(current);
        if (current.locked && current.staffId === staff.staffId) {
          const res = await heartbeatTimetableLock(generationId);
          if (!cancelled) setLock(res);
        } else if (!current.locked) {
          const res = await acquireTimetableLock(generationId);
          if (!cancelled) setLock(res);
        }
      } catch {
        // transient — the next poll retries
      }
    };
    tick();
    const interval = setInterval(tick, SCHEDULE_LOCK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [generationId, canManage, status, staff.staffId]);

  const lockOwnedRef = useRef(false);
  useEffect(() => {
    lockOwnedRef.current = lockOwned;
  }, [lockOwned]);

  useEffect(() => {
    return () => {
      if (lockOwnedRef.current) {
        releaseTimetableLock(generationId).catch(() => {});
      }
    };
  }, [generationId]);

  const [releasingLock, setReleasingLock] = useState(false);
  const releaseLock = async () => {
    if (releasingLock) return;
    setReleasingLock(true);
    try {
      await releaseTimetableLock(generationId);
      setLock((prev) => (prev ? { ...prev, locked: false, staffId: null, staffName: null, expiresAt: null } : prev));
    } catch {
      // the next lock poll will reconcile the real lock state
    } finally {
      setReleasingLock(false);
    }
  };

  const lastDragRef = useRef<{ day: number; period: number; at: number } | null>(null);
  const dragMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dragMoveTimerRef.current) clearTimeout(dragMoveTimerRef.current);
  }, []);

  const sendDragMove = useCallback((day: number, period: number) => {
    const last = lastDragRef.current;
    const now = Date.now();
    if (last && last.day === day && last.period === period && now - last.at < DRAG_BROADCAST_MS) return;
    lastDragRef.current = { day, period, at: now };
    if (dragMoveTimerRef.current) return;
    dragMoveTimerRef.current = setTimeout(() => {
      dragMoveTimerRef.current = null;
      const cur = lastDragRef.current;
      if (cur) {
        publishDragStatus(generationId, { action: 'move', scheduleId: null, day: cur.day, period: cur.period }).catch(() => {});
      }
    }, DRAG_BROADCAST_MS);
  }, [generationId]);

  /** Resolve the schedule the user aimed at on a drop cell. Section-less
   * special blocks (Assignment / LMS / exam) are the visible, pinned occupants
   * and win over stacked course rows of the same table; in cell mode any
   * covering session counts, in block mode only sessions starting on the cell. */
  const resolveCellOccupant = (dragged: ScheduleResponse, day: number, period: number, mode: 'cell' | 'block'): ScheduleResponse | null => {
    const source = schedules ?? [];
    const at = (s: ScheduleResponse) =>
      mode === 'cell'
        ? period >= s.startPeriodNo && period <= s.endPeriodNo
        : s.startPeriodNo === period;
    const base = (s: ScheduleResponse) =>
      s.dayOfWeek === day &&
      at(s) &&
      s.scheduleStatus !== 'CANCELLED' &&
      s.scheduleId !== dragged.scheduleId;
    const sameTable = (s: ScheduleResponse) =>
      (dragged.semesterNo === null || s.semesterNo === null || s.semesterNo === dragged.semesterNo) &&
      (dragged.sections.length === 0 || s.sections.length === 0 ||
        s.sections.some((sn) => dragged.sections.includes(sn)));
    const special = source.find((s) => base(s) && !s.courseCode);
    if (special) return special;
    return source.find((s) => base(s) && sameTable(s) && !!s.courseCode) ?? null;
  };

  const handleDragStart = (e: DragEvt<HTMLDivElement>, s: ScheduleResponse, anchorPeriod: number) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    const rel = anchorPeriod - s.startPeriodNo;
    const clampedStart = Math.max(1, s.startPeriodNo);
    const clampedEnd = Math.min(MAX_PERIOD, s.endPeriodNo);
    dragSpanRef.current = clampedEnd - clampedStart + 1;
    e.dataTransfer.setData('text/plain', `${s.scheduleId}|${rel}`);
    e.dataTransfer.effectAllowed = 'move';
    setRemoteDrag({ scheduleId: s.scheduleId, staffName: staff.staffName, day: s.dayOfWeek, period: anchorPeriod });
    publishDragStatus(generationId, { action: 'start', scheduleId: s.scheduleId, day: s.dayOfWeek, period: anchorPeriod }).catch(() => {});
  };

  const handleDragOver = (e: DragEvt<HTMLDivElement>, day: number, period: number) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const span = dragMode === 'single' ? 1 : dragSpanRef.current;
    const fits = period >= 1 && period + span - 1 <= MAX_PERIOD;
    const cur = dragTarget;
    const next = fits ? { day, period, span } : null;
    if (cur && next && cur.day === next.day && cur.period === next.period && cur.span === next.span) return;
    if (!cur && !next) return;
    setDragTarget(next);
    sendDragMove(day, period);
  };

  const moveScheduleTo = useCallback(
    async (scheduleId: string, day: number, period: number) => {
      if (!canEdit || saving) return;
      const dragged = (schedules ?? []).find((s) => s.scheduleId === scheduleId);
      if (!dragged) return;
      // The occupant is the visible pinned special block or the same-table
      // course on the drop cell. A special block or a one-cell course always
      // swaps as a single cell (its whole span is exactly that cell); larger
      // courses swap as a block pinned to the same partner shown here.
      const occupant = resolveCellOccupant(dragged, day, period, 'block');
      if (occupant) {
        const singleCell = dragged.startPeriodNo === dragged.endPeriodNo;
        const specialOccupant = !occupant.courseCode;
        setSaveError(null);
        setPendingSwap({
          scheduleId,
          withScheduleId: occupant.scheduleId,
          targetScheduleId: occupant.scheduleId,
          sourceDay: dragged.dayOfWeek,
          sourcePeriod: singleCell ? dragged.startPeriodNo : period,
          targetDay: day,
          targetPeriod: period,
          conflicts: null,
          cell: specialOccupant || singleCell,
        });
        return;
      }
      setSaving(true);
      setSaveError(null);
      const fromDay = dragged.dayOfWeek;
      const fromPeriod = dragged.startPeriodNo;
      try {
        const res = await swapSchedules(generationId, { scheduleId, targetDay: day, targetPeriod: period, force: false });
        // The backend's plain-move path returns swapped:false but still carries
        // the moved schedule in res.schedules — treat that as success too.
        if (res.swapped || (res.schedules?.length ?? 0) > 0) {
          setSchedules((prev) => mergeScheduleUpdates(prev, res.schedules));
          setUndoStack((prev) => [...prev, { kind: 'move', scheduleId, fromDay, fromPeriod, toDay: day, toPeriod: period }]);
          setRedoStack([]);
          toast.success('Schedule moved');
        } else if ((res.conflicts?.length ?? 0) > 0) {
          setSaveError(`Move blocked — ${(res.conflicts ?? []).join('; ')}`);
        } else {
          toast.error('Could not move schedule');
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not move schedule');
      } finally {
        setSaving(false);
      }
    },
    [canEdit, saving, schedules, generationId]
  );

  const handleDrop = async (e: DragEvt<HTMLDivElement>, day: number, period: number) => {
    if (!canEdit) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const [scheduleId, relPart] = raw.split('|');
    const rel = Number(relPart || '0') || 0;
    setDragTarget(null);
    publishDragStatus(generationId, { action: 'end', scheduleId, day: null, period: null }).catch(() => {});
    setRemoteDrag(null);
    if (!scheduleId) return;
    const dragged = (schedules ?? []).find((s) => s.scheduleId === scheduleId);
    if (!dragged) return;
    const span = Math.min(MAX_PERIOD, dragged.endPeriodNo) - Math.max(1, dragged.startPeriodNo) + 1;
    const grabbedPeriod = dragged.startPeriodNo + rel;

    // Resolve the occupant before the mode branch so the exact cell content
    // (the pinned special block, or the same-table course) is honoured in both
    // modes. A section-less special block or a one-cell course always swaps as a
    // single cell — its whole span IS the grabbed cell — even in the default
    // (block) drag mode.
    const occupant = resolveCellOccupant(dragged, day, period, dragMode === 'single' ? 'cell' : 'block');
    if (occupant) {
      const singleCellCourse = dragged.startPeriodNo === dragged.endPeriodNo;
      const specialOccupant = !occupant.courseCode;
      setSaveError(null);
      if (dragMode === 'single' || specialOccupant || singleCellCourse) {
        // Single-cell exchange: exactly the grabbed period swaps with the drop
        // cell. For multi-period sources this drops the P1-P2 style rule — the
        // grabbed half (start + rel) swaps alone, the rest re-anchors beside it.
        setPendingSwap({
          scheduleId,
          withScheduleId: occupant.scheduleId,
          targetScheduleId: occupant.scheduleId,
          sourceDay: dragged.dayOfWeek,
          sourcePeriod: grabbedPeriod,
          targetDay: day,
          targetPeriod: period,
          conflicts: null,
          cell: true,
        });
      } else {
        // Whole-block exchange between two multi-period courses, pinned to the
        // exact partner shown in the modal.
        setPendingSwap({
          scheduleId,
          withScheduleId: occupant.scheduleId,
          targetScheduleId: occupant.scheduleId,
          sourceDay: dragged.dayOfWeek,
          sourcePeriod: grabbedPeriod,
          targetDay: day,
          targetPeriod: period,
          conflicts: null,
          cell: false,
        });
      }
      return;
    }

    // Empty cell: consecutive mode lands the whole block on the drop cell.
    if (dragMode === 'consecutive') {
      const blockStart = period;
      if (blockStart < 1 || blockStart + span - 1 > MAX_PERIOD) {
        setSaveError('That move would overflow the timetable');
        return;
      }
      await moveScheduleTo(scheduleId, day, blockStart);
      return;
    }

    // Empty cell in single mode: the grabbed cell lands on the drop cell and the
    // rest of the session re-anchors beside it.
    const newStart = period - rel;
    if (newStart < 1 || newStart + span - 1 > MAX_PERIOD) {
      setSaveError('That move would overflow the timetable');
      return;
    }
    await moveScheduleTo(scheduleId, day, newStart);
  };

  const handleGridCellClick = (day: number, period: number) => {
    if (!moveTarget) return;
    const s = moveTarget;
    setMoveTarget(null);
    moveScheduleTo(s.scheduleId, day, period);
  };

  const handleSelectSchedule = (s: ScheduleResponse) => {
    setLecturerDetail(null);
    setSelectedMeeting(s);
  };

  const handleSelectElectives = (items: ScheduleResponse[]) => {
    setElectivePick(items);
  };

  const handleDragEnd = () => {
    setDragTarget(null);
    setRemoteDrag(null);
    publishDragStatus(generationId, { action: 'end', scheduleId: null, day: null, period: null }).catch(() => {});
  };

  const handleSwapConfirm = async (force: boolean) => {
    if (!pendingSwap || saving) return;
    setSaving(true);
    setSaveError(null);
    const source = (schedules ?? []).find((s) => s.scheduleId === pendingSwap.scheduleId);
    const fromDay = source?.dayOfWeek ?? pendingSwap.targetDay;
    const fromPeriod = source?.startPeriodNo ?? pendingSwap.targetPeriod;
    const srcAssignment = source?.teachingAssignmentId ?? null;
    const partner = (schedules ?? []).find((s) => s.scheduleId === pendingSwap.withScheduleId) ?? null;
    const partnerAssignment = partner?.teachingAssignmentId ?? null;
    const opSourceDay = pendingSwap.sourceDay ?? fromDay;
    const opSourcePeriod = pendingSwap.sourcePeriod ?? fromPeriod;
    try {
      const res = pendingSwap.cell
        ? await swapCellSchedules(generationId, {
            scheduleId: pendingSwap.scheduleId,
            sourceDay: opSourceDay,
            sourcePeriod: opSourcePeriod,
            targetDay: pendingSwap.targetDay,
            targetPeriod: pendingSwap.targetPeriod,
            targetScheduleId: pendingSwap.targetScheduleId,
            force,
          })
        : await swapSchedules(generationId, {
            scheduleId: pendingSwap.scheduleId,
            targetDay: pendingSwap.targetDay,
            targetPeriod: pendingSwap.targetPeriod,
            targetScheduleId: pendingSwap.withScheduleId,
            force,
          });
      if (res.swapped || (res.schedules?.length ?? 0) > 0) {
        if (pendingSwap.cell) {
          // The backend replaces both original rows with decomposed parts, so a
          // full refetch is the only consistent way to reflect it.
          await refreshSchedules();
          // Anchor the undo on the re-created live rows: the moved course's part
          // sits on the drop cell, its partner on the grab cell.
          const created = res.schedules ?? [];
          const movedPart = created.find(
            (c) =>
              c.dayOfWeek === pendingSwap.targetDay &&
              c.startPeriodNo <= pendingSwap.targetPeriod &&
              c.endPeriodNo >= pendingSwap.targetPeriod &&
              c.teachingAssignmentId === srcAssignment
          );
          const partnerPart = created.find(
            (c) =>
              c.dayOfWeek === opSourceDay &&
              c.startPeriodNo <= opSourcePeriod &&
              c.endPeriodNo >= opSourcePeriod &&
              c.teachingAssignmentId === partnerAssignment
          );
          setPendingSwap(null);
          setUndoStack((prev) => [
            ...prev,
            {
              kind: 'cellSwap',
              scheduleId: movedPart?.scheduleId ?? pendingSwap.scheduleId,
              withScheduleId: partnerPart?.scheduleId ?? pendingSwap.withScheduleId,
              srcAssignmentId: srcAssignment,
              partnerAssignmentId: partnerAssignment,
              fromDay: opSourceDay,
              fromPeriod: opSourcePeriod,
              toDay: pendingSwap.targetDay,
              toPeriod: pendingSwap.targetPeriod,
            },
          ]);
        } else {
          setSchedules((prev) => mergeScheduleUpdates(prev, res.schedules));
          setPendingSwap(null);
          setUndoStack((prev) => [
            ...prev,
            { kind: 'move', scheduleId: pendingSwap.scheduleId, withScheduleId: pendingSwap.withScheduleId, fromDay, fromPeriod, toDay: pendingSwap.targetDay, toPeriod: pendingSwap.targetPeriod },
          ]);
        }
        setRedoStack([]);
        toast.success(`Swapped ${source?.courseCode ?? 'schedule'} and ${partner?.courseCode ?? 'schedule'}`);
      } else if (!force && (res.conflicts?.length ?? 0) > 0) {
        setPendingSwap({ ...pendingSwap, conflicts: res.conflicts });
      } else {
        const msg = 'Could not swap schedules';
        toast.error(msg);
        setSaveError(msg);
        setPendingSwap(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not swap schedules';
      toast.error(msg);
      setSaveError(msg);
      setPendingSwap(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (s: ScheduleResponse) => {
    if (!canEdit || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await deleteSchedule(s.scheduleId);
      setSchedules((prev) => (prev ? prev.filter((x) => x.scheduleId !== s.scheduleId) : prev));
      setUndoStack((prev) => [...prev, { kind: 'delete', scheduleId: s.scheduleId, schedule: s }]);
      setRedoStack([]);
      if (selectedMeeting?.scheduleId === s.scheduleId) setSelectedMeeting(null);
      if (moveTarget?.scheduleId === s.scheduleId) setMoveTarget(null);
      toast.success('Schedule removed');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove schedule');
    } finally {
      setSaving(false);
    }
  };

  const performUndo = async () => {
    if (undoStack.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    let op = undoStack[undoStack.length - 1];
    try {
      if (op.kind === 'move') {
        const res = await swapSchedules(generationId, {
          scheduleId: op.scheduleId,
          targetDay: op.fromDay ?? 1,
          targetPeriod: op.fromPeriod ?? 1,
          targetScheduleId: op.withScheduleId,
          force: true,
        });
        if ((res.schedules?.length ?? 0) > 0) setSchedules((prev) => mergeScheduleUpdates(prev, res.schedules));
      } else if (op.kind === 'cellSwap') {
        // A cell swap is an involution: exchanging the same two cells again is
        // the inverse operation. Re-create the rows, then re-anchor the redo on
        // the fresh ids so it stays exact.
        const res = await swapCellSchedules(generationId, {
          scheduleId: op.scheduleId,
          sourceDay: op.toDay ?? 1,
          sourcePeriod: op.toPeriod ?? 1,
          targetDay: op.fromDay ?? 1,
          targetPeriod: op.fromPeriod ?? 1,
          targetScheduleId: op.withScheduleId,
          force: true,
        });
        if (res.swapped || (res.schedules?.length ?? 0) > 0) {
          await refreshSchedules();
          const created = res.schedules ?? [];
          const backCourse = created.find(
            (c) =>
              c.dayOfWeek === (op.fromDay ?? 1) &&
              c.startPeriodNo <= (op.fromPeriod ?? 1) &&
              c.endPeriodNo >= (op.fromPeriod ?? 1) &&
              c.teachingAssignmentId === op.srcAssignmentId
          );
          const backPartner = created.find(
            (c) =>
              c.dayOfWeek === (op.toDay ?? 1) &&
              c.startPeriodNo <= (op.toPeriod ?? 1) &&
              c.endPeriodNo >= (op.toPeriod ?? 1) &&
              c.teachingAssignmentId === op.partnerAssignmentId
          );
          op = {
            ...op,
            scheduleId: backCourse?.scheduleId ?? op.scheduleId,
            withScheduleId: backPartner?.scheduleId ?? op.withScheduleId,
          };
        }
      } else if (op.schedule) {
        const created = await createSchedule({
          generationId: op.schedule.generationId,
          teachingAssignmentId: op.schedule.teachingAssignmentId,
          teachingGroupId: op.schedule.teachingGroupId,
          dayOfWeek: op.schedule.dayOfWeek,
          startSlotId: op.schedule.startSlotId,
          endSlotId: op.schedule.endSlotId,
          scheduleType: op.schedule.scheduleType,
          scheduleStatus: op.schedule.scheduleStatus,
          meetingType: op.schedule.meetingType,
        });
        op = { ...op, scheduleId: created.scheduleId };
        setSchedules((prev) => (prev ? [...prev, created] : prev));
      }
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, op]);
      toast.success(op.kind === 'move' ? 'Move undone' : op.kind === 'cellSwap' ? 'Cell swap undone' : 'Schedule restored');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not undo');
    } finally {
      setSaving(false);
    }
  };

  const performRedo = async () => {
    if (redoStack.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    let op = redoStack[redoStack.length - 1];
    try {
      if (op.kind === 'move') {
        const res = await swapSchedules(generationId, {
          scheduleId: op.scheduleId,
          targetDay: op.toDay ?? 1,
          targetPeriod: op.toPeriod ?? 1,
          targetScheduleId: op.withScheduleId,
          force: true,
        });
        if ((res.schedules?.length ?? 0) > 0) setSchedules((prev) => mergeScheduleUpdates(prev, res.schedules));
      } else if (op.kind === 'cellSwap') {
        const res = await swapCellSchedules(generationId, {
          scheduleId: op.scheduleId,
          sourceDay: op.fromDay ?? 1,
          sourcePeriod: op.fromPeriod ?? 1,
          targetDay: op.toDay ?? 1,
          targetPeriod: op.toPeriod ?? 1,
          targetScheduleId: op.withScheduleId,
          force: true,
        });
        if (res.swapped || (res.schedules?.length ?? 0) > 0) {
          await refreshSchedules();
          // Re-anchor the undo op on the fresh live rows for the next undo.
          const created = res.schedules ?? [];
          const fwdCourse = created.find(
            (c) =>
              c.dayOfWeek === (op.toDay ?? 1) &&
              c.startPeriodNo <= (op.toPeriod ?? 1) &&
              c.endPeriodNo >= (op.toPeriod ?? 1) &&
              c.teachingAssignmentId === op.srcAssignmentId
          );
          const fwdPartner = created.find(
            (c) =>
              c.dayOfWeek === (op.fromDay ?? 1) &&
              c.startPeriodNo <= (op.fromPeriod ?? 1) &&
              c.endPeriodNo >= (op.fromPeriod ?? 1) &&
              c.teachingAssignmentId === op.partnerAssignmentId
          );
          op = {
            ...op,
            scheduleId: fwdCourse?.scheduleId ?? op.scheduleId,
            withScheduleId: fwdPartner?.scheduleId ?? op.withScheduleId,
          };
        }
      } else {
        await deleteSchedule(op.scheduleId);
        setSchedules((prev) => (prev ? prev.filter((x) => x.scheduleId !== op.scheduleId) : prev));
      }
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, op]);
      toast.success(op.kind === 'move' ? 'Move redone' : op.kind === 'cellSwap' ? 'Cell swap redone' : 'Schedule removed again');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not redo');
    } finally {
      setSaving(false);
    }
  };

  const toggleSemester = (semesterId: string) => {
    setSelectedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(semesterId)) {
        next.delete(semesterId);
        setSelectedSections((s) => {
          const copy = { ...s };
          delete copy[semesterId];
          return copy;
        });
      } else {
        next.add(semesterId);
        const sem = scope?.find((x) => x.semesterId === semesterId);
        if (sem) {
          setSelectedSections((s) => ({ ...s, [semesterId]: new Set(sem.sections.map((sec) => sec.sectionId)) }));
        }
      }
      return next;
    });
  };

  const toggleSection = (semesterId: string, sectionId: string) => {
    setSelectedSections((prev) => {
      const current = new Set(prev[semesterId] ?? []);
      if (current.has(sectionId)) current.delete(sectionId);
      else current.add(sectionId);
      return { ...prev, [semesterId]: current };
    });
  };

  const handleExamTypeChange = (examTypeId: string) => {
    setSelectedExamType(examTypeId);
    setSelectedSemesters(new Set());
    setSelectedSections({});
    setViewSemester('all');
    if (examTypeId && generation) {
      setScopeLoading(true);
      getGenerationScope(generation.termId, examTypeId)
        .then(setScope)
        .catch(() => setScope([]))
        .finally(() => setScopeLoading(false));
    }
  };

  const handleGenerate = async () => {
    if (!canEdit || saving) return;
    if (!selectedExamType) {
      toast.error('Select an exam type first');
      return;
    }
    if (selectedSemesters.size === 0) {
      toast.error('Select at least one semester');
      return;
    }
    let sectionCount = 0;
    selectedSemesters.forEach((sid) => {
      sectionCount += selectedSections[sid]?.size ?? 0;
    });
    if (sectionCount === 0) {
      toast.error('Select at least one section');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await generateTimetable(generationId, {
        examTypeId: selectedExamType,
        semesters: Array.from(selectedSemesters).map((sid) => ({
          semesterId: sid,
          sectionIds: Array.from(selectedSections[sid] ?? []),
        })),
      });
      setStatus('GENERATING');
      scheduleGenerationFallback();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not start generation');
      toast.error(err instanceof Error ? err.message : 'Could not start generation');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    setConfirmDialog({
      title: 'Publish this timetable?',
      message: 'Publishing makes this the official schedule students and staff see. Schedules can no longer be edited after publishing.',
      confirmLabel: 'Publish',
      action: async () => {
        setSaving(true);
        try {
          await publishGeneration(generationId);
          setStatus('PUBLISHED');
          toast.success('Timetable published');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not publish timetable');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleCancelGeneration = () => {
    setConfirmDialog({
      title: 'Cancel this generation?',
      message: 'All draft schedules will be discarded and this generation marked as failed.',
      confirmLabel: 'Cancel generation',
      tone: 'danger',
      action: async () => {
        setSaving(true);
        try {
          await cancelGeneration(generationId);
          setStatus('FAILED');
          setSchedules([]);
          toast.success('Generation cancelled');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not cancel generation');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const openInvite = async () => {
    setShowInvite(true);
    setInviteStaffList(null);
    try {
      const list = await apiFetch<StaffRecord[]>('/api/staff');
      setInviteStaffList(list);
    } catch {
      setInviteStaffList([]);
    }
  };

  const inviteStaff = async (targetStaffId: string) => {
    if (!activeLobby || inviteBusy) return;
    setInviteBusy(targetStaffId);
    try {
      const updated = await inviteLobbyMember(activeLobby.lobbyId, targetStaffId);
      setLobby(updated);
      toast.success('Invitation sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not invite staff');
    } finally {
      setInviteBusy(null);
    }
  };

  const openGroups = async () => {
    setShowCmr(false);
    setShowGroups(true);
    try {
      if (generation) {
        setGroups(await getTeachingGroups(generation.termId));
        const [ass, courses] = await Promise.all([
          getTeachingAssignments(),
          getCourses({ unitId: staff.unitId }),
        ]);
        setAssignments(ass.filter((a) => a.termId === generation.termId));
        setUnitCourses(courses);
      }
    } catch {
      toast.error('Could not load combined classes');
    }
  };

  const groupCourseAssignments = useMemo(() => {
    if (!groupCourseId) return [];
    return (assignments ?? []).filter((a) => a.courseId === groupCourseId);
  }, [assignments, groupCourseId]);

  const handleCreateGroup = async () => {
    if (!generation || groupsSaving) return;
    if (!groupCourseId || groupAssignments.size < 2) {
      toast.error('Select a course and at least two assignments');
      return;
    }
    setGroupsSaving(true);
    try {
      await createTeachingGroup({
        termId: generation.termId,
        courseId: groupCourseId,
        assignmentIds: Array.from(groupAssignments),
      });
      toast.success('Combined class created');
      setGroupAssignments(new Set());
      setGroups(await getTeachingGroups(generation.termId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create combined class');
    } finally {
      setGroupsSaving(false);
    }
  };

  const handleDeleteGroup = (group: TeachingGroupResponse) => {
    setConfirmDialog({
      title: `Delete combined class ${group.groupName}?`,
      message: `Removes the combined class for ${group.courseCode} (${group.members.length} sections).`,
      confirmLabel: 'Delete',
      tone: 'danger',
      action: async () => {
        try {
          await deleteTeachingGroup(group.groupId);
          toast.success('Combined class deleted');
          if (generation) setGroups(await getTeachingGroups(generation.termId));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not delete combined class');
        }
      },
    });
  };

  // The combined classes belonging to the current HOD's own department. Members
  // already carry unitId/unitName (enriched server-side), so ownership is read
  // from server-supplied data, never from browser-supplied ids.
  const ownGroups = useMemo(
    () => (groups ?? []).filter((g) => g.members.some((m) => m.unitId === staff.unitId)),
    [groups, staff.unitId]
  );

  // Combined classes from OTHER departments (read-only for this HOD) plus the
  // HOD's own, so cross-unit coordination stays visible. Group ownership uses
  // the first member's unit; every member of a group shares the group's course
  // unit, so this is unambiguous.
  const allGroups = useMemo(
    () => groups ?? [],
    [groups]
  );

  // Distinct departments across every combined class (derived from the group's
  // first member — all members of a group share the group's course unit).
  const allGroupUnits = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups ?? []) {
      const m = g.members[0];
      if (m && m.unitId && !map.has(m.unitId)) map.set(m.unitId, m.unitName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [groups]);

  // Semester options for the combined-class filter: prefer the generation
  // scope's semesters, otherwise derive distinct semester numbers from groups.
  const groupSemesters = useMemo(() => {
    const source = scope ?? [];
    const nums = source.length > 0
      ? source.map((sc) => sc.semesterNo)
      : (groups ?? []).map((g) => g.semesterNo);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [scope, groups]);

  const scopeGroupFilter = (g: TeachingGroupResponse) =>
    !scope || scope.some((sc) => sc.semesterNo === g.semesterNo);

  const groupsUnitCount = allGroups.filter(
    (g) =>
      (!scope || scope.some((sc) => sc.semesterNo === g.semesterNo)) &&
      (groupsSemFilter === 'all' || g.semesterNo === Number(groupsSemFilter))
  ).length;

  const groupsSemCount = allGroups.filter(
    (g) =>
      (!scope || scope.some((sc) => sc.semesterNo === g.semesterNo)) &&
      (groupsUnitFilter === 'all' || (g.members[0]?.unitId ?? '') === groupsUnitFilter)
  ).length;

  // Free (unclaimed) assignments in the selected group's course+term that belong
  // to this HOD's own unit and are not yet part of any combined class. These are
  // the candidates for "Add Course".
  const addableAssignments = useMemo(() => {
    if (!addToGroupId) return [];
    const group = (groups ?? []).find((g) => g.groupId === addToGroupId);
    if (!group) return [];
    const taken = (groups ?? []).flatMap((g) => g.members.map((m) => m.assignmentId));
    return (assignments ?? []).filter(
      (a) =>
        a.termId === generation?.termId &&
        a.courseId === group.courseId &&
        a.unitId === staff.unitId &&
        !taken.includes(a.assignmentId)
    );
  }, [addToGroupId, groups, assignments, generation?.termId, staff.unitId]);

  const handleAddMembers = async () => {
    if (!generation || !addToGroupId || addGroupsSaving) return;
    if (addGroupAssignments.size === 0) {
      toast.error('Select at least one section to add');
      return;
    }
    setAddGroupsSaving(true);
    try {
      await addTeachingGroupMembers(addToGroupId, Array.from(addGroupAssignments));
      toast.success('Sections added to combined class');
      setAddGroupAssignments(new Set());
      setAddToGroupId('');
      setGroups(await getTeachingGroups(generation.termId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add sections to combined class');
    } finally {
      setAddGroupsSaving(false);
    }
  };

  const selectedTotal = useMemo(() => {
    let total = 0;
    selectedSemesters.forEach((sid) => {
      total += selectedSections[sid]?.size ?? 0;
    });
    return total;
  }, [selectedSemesters, selectedSections]);

  const isPublished = status === 'PUBLISHED';

  const semesterOptions = useMemo(
    () =>
      [...new Set((schedules ?? []).map((s) => s.semesterNo).filter((n): n is number => n != null))].sort(
        (a, b) => a - b
      ),
    [schedules]
  );
  const sectionOptions = useMemo(
    () => [...new Set((schedules ?? []).flatMap((s) => s.sections ?? []))].sort(),
    [schedules]
  );
  const activeViewSemester = sectionScope ? sectionScope.semesterNo : viewSemester;
  const activeViewSection = sectionScope ? sectionScope.section : viewSection !== 'all' && sectionOptions.includes(viewSection) ? viewSection : 'all';
  const visibleSchedules = useMemo(
    () =>
      (schedules ?? []).filter(
        (s) =>
          s.scheduleStatus !== 'CANCELLED' &&
          (s.scheduleType !== 'COURSE' ||
            ((activeViewSemester === 'all' || s.semesterNo === activeViewSemester) &&
              (activeViewSection === 'all' || (s.sections ?? []).includes(activeViewSection))))
      ),
    [schedules, activeViewSemester, activeViewSection]
  );
  const { periodLabels, lunchLabel } = useTimeSlotLabels();

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '6px 0' }}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <div className="skeleton h-5 w-64" style={{ marginBottom: 8 }} />
            <div className="skeleton h-3.5 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-8 w-32" />
          </div>
        </div>
        <WeeklyGridSkeleton />
      </div>
    );
  }

  if (error && !generation) {
    return (
      <div className="text-center py-20">
        <XCircle size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-xs mb-4" style={{ color: 'var(--text-lighter)' }}>{error}</p>
        <button onClick={onBack} className="btn btn-ghost btn-sm gap-1.5 cursor-pointer" style={{ color: 'var(--primary)' }}>
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn btn-ghost btn-sm btn-circle cursor-pointer"
            style={{ color: 'var(--text-light)' }}
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="flex items-center gap-2" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>
              <CalendarCog size={19} style={{ color: 'var(--primary)' }} />
              Timetable Management
            </h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-light)', marginTop: 2 }}>
              {generation ? `${generation.academicYear} · ${generation.generatedByStaffNo ?? ''}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GenerationStatusPill status={status} />
          {isHod && (
            <button
              onClick={openGroups}
              className="btn btn-ghost btn-sm gap-1.5 cursor-pointer"
              style={{ color: 'var(--primary)', border: '1.5px solid var(--surface-border)' }}
            >
              <Blocks size={13} /> Combined Classes
            </button>
          )}
          {isHod && (
            <button
              onClick={() => { setShowGroups(false); setShowCmr(true); }}
              className="btn btn-ghost btn-sm gap-1.5 cursor-pointer"
              style={{ color: 'var(--primary)', border: '1.5px solid var(--surface-border)' }}
            >
              <BookOpen size={13} /> Requirements
            </button>
          )}
          {status === 'COMPLETED' && canManage && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Publish
            </button>
          )}
          {!isPublished && canManage && (
            <button
              onClick={handleCancelGeneration}
              disabled={saving}
              className="btn btn-ghost btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ color: 'var(--danger)' }}
              title="Cancel generation"
            >
              <XCircle size={13} /> Cancel
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div
          className="flex items-center gap-2 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: 12.5 }}
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="btn btn-ghost btn-xs btn-circle cursor-pointer">
            <X size={12} />
          </button>
        </div>
      )}

      {status === 'FAILED' && generation?.failureReport && !saveError && (
        <div
          className="flex items-start gap-2 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)' }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
          <div className="flex-1" style={{ fontSize: 12.5, color: 'var(--danger)', whiteSpace: 'pre-line' }}>
            {generation.failureReport}
          </div>
        </div>
      )}

      {status === 'GENERATING' && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(217,119,6,0.1)', border: '1.5px solid rgba(217,119,6,0.35)' }}
        >
          <Timer size={15} className="animate-pulse" style={{ color: '#d97706' }} />
          <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 600 }}>
            Generating timetable... this may take a minute. The grid updates automatically when it finishes.
          </div>
        </div>
      )}

      {lock && lock.locked && !lockOwned && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(217,119,6,0.1)', border: '1.5px solid rgba(217,119,6,0.35)' }}
        >
          <Lock size={14} className="shrink-0" style={{ color: '#d97706' }} />
          <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 600 }}>
            {lock.staffName ?? 'another editor'} is currently editing this timetable. Drag and drop is disabled until the lock is released.
          </div>
        </div>
      )}

      {canEdit && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(40,114,161,0.08)', border: '1.5px solid rgba(40,114,161,0.3)' }}
        >
          <Unlock size={14} style={{ color: 'var(--primary)' }} />
          <div style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, flex: '1 1 auto' }}>
            You hold the editing lock — drag schedules to rearrange the draft.
          </div>
          <button
            type="button"
            disabled={releasingLock}
            onClick={releaseLock}
            className="btn btn-xs btn-outline"
            style={{ flex: '0 0 auto', fontWeight: 600 }}
          >
            {releasingLock ? 'Releasing...' : 'Release Lock'}
          </button>
        </div>
      )}

      {remoteDrag && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(139,92,246,0.1)', border: '1.5px solid rgba(139,92,246,0.35)' }}
        >
          <Radio size={14} className="animate-pulse" style={{ color: '#8b5cf6' }} />
          <div style={{ fontSize: 12.5, color: '#7c3aed', fontWeight: 600 }}>
            {remoteDrag.staffName} is dragging {remoteDrag.schedule ? <b>{remoteDrag.schedule.courseCode}</b> : 'a schedule'}
            {remoteDrag.day && remoteDrag.period ? ` to ${DAY_NAMES[remoteDrag.day - 1] ?? ''} P${remoteDrag.period}` : '...'}
          </div>
        </div>
      )}

      {activeLobby && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4 flex-wrap"
          style={{ borderRadius: 'var(--radius-md)', background: 'var(--secondary-lighter)', border: '1.5px solid var(--surface-border)' }}
        >
          <Users size={14} style={{ color: 'var(--primary)' }} />
          <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>
            Lobby led by {activeLobby.leaderName} — {activeLobby.members.filter((m) => m.joined).length} of {activeLobby.members.length} members joined
          </div>
          {isHod && (
            <button
              onClick={openInvite}
              className="btn btn-ghost btn-xs gap-1 ml-auto cursor-pointer"
              style={{ color: 'var(--primary)' }}
            >
              <UserPlus size={12} /> Invite
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--surface)' }}>
        {(['grid', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setWorkspaceTab(tab)}
            className="cursor-pointer"
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: workspaceTab === tab ? 'var(--primary)' : 'var(--text-light)',
              borderBottom: '2.5px solid',
              borderBottomColor: workspaceTab === tab ? 'var(--primary)' : 'transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'grid' ? 'Weekly Grid' : 'Activity'}
          </button>
        ))}
      </div>

      {workspaceTab === 'grid' ? (
        <div className={`grid gap-[18px] ${isHod && !sectionScope ? 'grid-cols-1 xl:grid-cols-[290px_1fr]' : 'grid-cols-1'}`}>
          {isHod && !sectionScope && (
            <div className="bg-base-100 backdrop-blur-xl self-start" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--surface)' }}>
                <Layers size={15} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Generation Scope</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                  Exam Type
                </label>
                <div className="relative mb-4">
                  <select
                    value={selectedExamType}
                    onChange={(e) => handleExamTypeChange(e.target.value)}
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
                    {examTypes.map((et) => (
                      <option key={et.examTypeId} value={et.examTypeId}>{et.examTypeName}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
                </div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
                  Semesters & Sections
                </label>
                {scopeLoading && (
                  <div className="flex items-center gap-2 mb-2" style={{ fontSize: 11.5, color: 'var(--text-lighter)' }}>
                    <Loader2 size={11} className="animate-spin" /> Loading sections for this exam type...
                  </div>
                )}
                {(scope ?? []).length === 0 && !scopeLoading && (
                  <div style={{ fontSize: 12, color: 'var(--text-lighter)' }}>No teaching assignments found for this term</div>
                )}
                {(scope ?? []).map((sem) => {
                  const checked = selectedSemesters.has(sem.semesterId);
                  return (
                    <div key={sem.semesterId} className="mb-3" style={{ border: '1.5px solid var(--surface-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleSemester(sem.semesterId)}
                        className="w-full flex items-center gap-2 cursor-pointer text-left"
                        style={{ padding: '8px 12px', background: checked ? 'rgba(40,114,161,0.08)' : 'var(--divider)', border: 'none', fontSize: 12.5, fontWeight: 700, color: checked ? 'var(--primary)' : 'var(--text)' }}
                      >
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 5,
                            borderStyle: 'solid',
                            borderWidth: '1.5px',
                            borderColor: checked ? 'var(--primary)' : 'var(--surface-border)',
                            background: checked ? 'var(--primary)' : 'transparent',
                            color: '#fff',
                            fontSize: 10,
                          }}
                        >
                          {checked && <Check size={11} strokeWidth={3} />}
                        </span>
                        Semester {sem.semesterNo}
                      </button>
                      {checked && (
                        <div style={{ padding: '8px 12px', display: 'grid', gap: 6, background: 'var(--secondary-lighter)' }}>
                          {sem.sections.length === 0 && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-lighter)' }}>No sections assigned</div>
                          )}
                          {sem.sections.map((sec) => {
                            const secChecked = selectedSections[sem.semesterId]?.has(sec.sectionId) ?? false;
                            return (
                              <label key={sec.sectionId} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--text)' }}>
                                <input
                                  type="checkbox"
                                  checked={secChecked}
                                  onChange={() => toggleSection(sem.semesterId, sec.sectionId)}
                                  style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                                Section {sec.sectionName}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={handleGenerate}
                  disabled={!canEdit || saving || status === 'GENERATING' || snapshotStatus !== 'SNAPSHOT_READY'}
                  className="w-full btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))', marginTop: 6 }}
                >
                  {saving || snapshotStatus === 'SNAPSHOT_PREPARING' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  {status === 'COMPLETED' ? 'Regenerate' : 'Generate Timetable'}
                </button>
                <div className="text-center mt-2" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>
                  {snapshotStatus === 'SNAPSHOT_PREPARING' && 'Preparing timetable data…'}
                  {snapshotStatus === 'SNAPSHOT_INVALID' && 'Preparing timetable data…'}
                  {snapshotStatus === 'SNAPSHOT_ERROR' && (
                    <span style={{ color: 'var(--danger, #e11d48)' }}>
                      {snapshotError || 'Could not prepare timetable data'}
                    </span>
                  )}
                  {snapshotStatus === 'SNAPSHOT_READY' &&
                    `${selectedSemesters.size} semester${selectedSemesters.size === 1 ? '' : 's'} · ${selectedTotal} section${selectedTotal === 1 ? '' : 's'}`}
                </div>
                {snapshotStatus === 'SNAPSHOT_ERROR' && (
                  <button
                    onClick={retrySnapshot}
                    disabled={snapshotPreparing}
                    className="w-full btn btn-sm btn-outline gap-1.5 mt-2 cursor-pointer disabled:opacity-50"
                  >
                    {snapshotPreparing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={15} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                  Weekly Grid {visibleSchedules ? `(${visibleSchedules.length} schedules${activeViewSemester !== 'all' ? ` · Semester ${activeViewSemester}` : ' · overview'}${activeViewSection !== 'all' ? ` · Section ${activeViewSection}` : ''})` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {sectionScope && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(40,114,161,0.12)',
                      color: 'var(--primary)',
                      border: '1.5px solid rgba(40,114,161,0.35)',
                    }}
                    title="This workspace is locked to this generated section. Use Back to return to the full timetable."
                  >
                    <CalendarCog size={10} className="inline mr-1" /> Editing Semester {sectionScope.semesterNo} — {sectionScope.section === 'all' ? 'All sections' : `Section ${sectionScope.section}`}
                  </span>
                )}
                {canEdit && (
                  <div
                    className="flex items-center"
                    style={{
                      gap: 2,
                      padding: 3,
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--surface-border)',
                      background: 'var(--divider)',
                    }}
                    title="Undo and redo the latest schedule moves and removes in this draft."
                  >
                    <button
                      onClick={performUndo}
                      disabled={undoStack.length === 0 || saving}
                      className="cursor-pointer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 5,
                        border: 'none',
                        color: 'var(--text-light)',
                        background: 'transparent',
                        opacity: undoStack.length === 0 || saving ? 0.4 : 1,
                      }}
                    >
                      <Undo2 size={12} /> Undo
                    </button>
                    <button
                      onClick={performRedo}
                      disabled={redoStack.length === 0 || saving}
                      className="cursor-pointer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 5,
                        border: 'none',
                        color: 'var(--text-light)',
                        background: 'transparent',
                        opacity: redoStack.length === 0 || saving ? 0.4 : 1,
                      }}
                    >
                      <Redo2 size={12} /> Redo
                    </button>
                  </div>
                )}
                {canEdit && (
                  <div
                    className="flex items-center"
                    style={{
                      gap: 2,
                      padding: 3,
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--surface-border)',
                      background: 'var(--divider)',
                    }}
                    title="How a multi-period session is placed when dragged. Consecutive drags the whole block as its consecutive cells; Single cells splits a two-period session so P1 or P2 can each be grabbed and dropped on any single cell."
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-light)', padding: '2px 6px 2px 4px' }}>
                      Drag
                    </span>
                    <button
                      onClick={() => setDragMode('consecutive')}
                      className="cursor-pointer"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 5,
                        border: 'none',
                        color: dragMode === 'consecutive' ? '#fff' : 'var(--text-light)',
                        background: dragMode === 'consecutive' ? 'linear-gradient(var(--primary), var(--primary-dark))' : 'transparent',
                      }}
                    >
                      Consecutive
                    </button>
                    <button
                      onClick={() => setDragMode('single')}
                      className="cursor-pointer"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 5,
                        border: 'none',
                        color: dragMode === 'single' ? '#fff' : 'var(--text-light)',
                        background: dragMode === 'single' ? 'linear-gradient(var(--primary), var(--primary-dark))' : 'transparent',
                      }}
                    >
                      Single cells
                    </button>
                  </div>
                )}
                {!sectionScope && semesterOptions.length > 1 && (
                  <select
                    value={String(activeViewSemester)}
                    onChange={(e) => setViewSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="cursor-pointer"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--surface-border)',
                      background: 'var(--divider)',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                    title="Filter the grid by semester — 'All semesters' is an overview mode where each semester is drawn as its own table"
                  >
                    <option value="all">All semesters (overview)</option>
                    {semesterOptions.map((n) => (
                      <option key={n} value={n}>Semester {n}</option>
                    ))}
                  </select>
                )}
                {!sectionScope && sectionOptions.length > 1 && (
                  <select
                    value={activeViewSection}
                    onChange={(e) => setViewSection(e.target.value)}
                    className="cursor-pointer"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--surface-border)',
                      background: 'var(--divider)',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                    title="Filter the grid by section"
                  >
                    <option value="all">All sections</option>
                    {sectionOptions.map((n) => (
                      <option key={n} value={n}>Section {n}</option>
                    ))}
                  </select>
                )}
                {activeViewSemester === 'all' && semesterOptions.length > 1 && !sectionScope && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(251,191,36,0.14)',
                      color: '#b45309',
                      border: '1px dashed rgba(217,119,6,0.4)',
                    }}
                    title="All cohorts are shown as separate tables here — one table per semester and section, so different cohorts never share a cell"
                  >
                    Overview — one table per semester &amp; section
                  </span>
                )}
                {isHod && !canEdit && status !== 'PUBLISHED' && lock?.locked && (
                  <span style={{ fontSize: 11.5, color: '#b45309', fontWeight: 600 }}>
                    <Lock size={11} className="inline mr-1" /> Locked by {lock.staffName ?? 'another editor'}
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 18px', overflowX: 'auto' }}>
              {status === 'GENERATING' ? (
                <WeeklyGridSkeleton />
              ) : (schedules ?? []).length === 0 ? (
                <div className="text-center py-16">
                  <CalendarCog size={32} className="mx-auto mb-3 opacity-30" />
                  <p style={{ fontSize: 12.5, color: 'var(--text-lighter)', margin: 0 }}>
                    No schedules yet{isHod ? ' — configure the scope and generate a timetable' : ' — waiting for the HOD to generate'}
                  </p>
                </div>
              ) : (
                <WeeklyTimetableGrid
                  schedules={visibleSchedules}
                  editable={canEdit}
                  asSingleCohort={activeViewSection !== 'all'}
                  periodLabels={periodLabels}
                  lunchLabel={lunchLabel}
                  dragTarget={dragTarget}
                  remoteDrag={remoteDrag}
                  dragMode={dragMode}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onSelectSchedule={handleSelectSchedule}
                  onSelectElectives={handleSelectElectives}
                  onCellClick={handleGridCellClick}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--surface)' }}>
            <Clock size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Generation Activity</span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            {history.length === 0 && (
              <div className="text-center py-10 text-xs" style={{ color: 'var(--text-lighter)' }}>
                No activity yet — events from the shared workspace appear here
              </div>
            )}
            {history.map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                <span
                  className="shrink-0"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: TIMETABLE_EVENT_COLORS[evt.type] ?? 'var(--text-lighter)' }}
                />
                <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                  {evt.label}
                </span>
                <span className="shrink-0" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>{timeLabel(evt.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedMeeting && (() => {
        const sm = selectedMeeting as ScheduleResponse;
        const meetingStaff = sm.staffNames.length > 0 ? sm.staffNames : sm.staffName ? [sm.staffName] : [];
        const meetingSections = sm.sections?.length ? sm.sections : sm.sectionName ? [sm.sectionName] : [];
        const meetingGroup = sm.teachingGroupId
          ? (groups ?? []).find((g) => g.groupId === sm.teachingGroupId) ?? null
          : null;
        const courseSchedules = (schedules ?? []).filter((s) => s.courseCode === sm.courseCode);
        const isLecturerView = lecturerDetail !== null;
        const lecturerSchedules = isLecturerView
          ? (schedules ?? []).filter((s) => s.staffNames.includes(lecturerDetail as string) || s.staffName === lecturerDetail)
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
            <div className="bg-base-100 w-full max-w-lg" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isLecturerView ? <Users size={15} style={{ color: 'var(--primary)' }} /> : <CalendarCog size={15} style={{ color: 'var(--primary)' }} />}
                  {isLecturerView ? `Lecturer schedule — ${lecturerDetail}` : 'Course details'}
                </div>
                <button onClick={() => setSelectedMeeting(null)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {isLecturerView ? (
                  <>
                    <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--text-light)' }}>
                      {lecturerSchedules.length} session{lecturerSchedules.length === 1 ? '' : 's'} across the week for <b style={{ color: 'var(--text)' }}>{lecturerDetail}</b>.
                    </div>
                    <MiniTimetable schedules={lecturerSchedules} />
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => setLecturerDetail(null)}
                        className="btn btn-sm btn-ghost gap-1.5 cursor-pointer"
                        style={{ color: 'var(--primary)', fontWeight: 600 }}
                      >
                        <ArrowLeft size={13} /> Back to course details
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)' }}>
                        {sm.courseCode}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-light)' }}>{sm.courseName}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '8px 14px', fontSize: 13, marginTop: 14 }}>
                      <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Session</span>
                      <span style={{ color: 'var(--text)' }}>{meetingLabelOf(sm)}</span>
                      <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Day / Period</span>
                      <span style={{ color: 'var(--text)' }}>{slotTextOf(sm)}</span>
                      <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Section</span>
                      <span style={{ color: 'var(--text)' }}>{meetingSections.join(' + ') || '\u2014'}</span>
                      <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Lecturer</span>
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {meetingStaff.length > 0 ? (
                          meetingStaff.map((name) => (
                            <button
                              key={name}
                              onClick={() => setLecturerDetail(name)}
                              title={`Open ${name}'s weekly schedule`}
                              className="btn btn-ghost btn-xs gap-1 cursor-pointer shrink-0"
                              style={{ color: 'var(--primary)', border: '1.5px solid rgba(40,114,161,0.3)', fontWeight: 700 }}
                            >
                              <Users size={11} /> {name}
                            </button>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text)' }}>—</span>
                        )}
                      </span>
                    </div>

                    {meetingGroup && (
                      <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(124,58,237,0.3)', background: 'rgba(139,92,246,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 6 }}>
                          <Blocks size={13} /> Combined class
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                          {meetingGroup.groupName}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-light)' }}>
                          {meetingGroup.courseCode} · Semester {meetingGroup.semesterNo} · {meetingGroup.members.length} sections
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {meetingGroup.members.map((m, i) => (
                            <span
                              key={m.assignmentId}
                              className="badge badge-xs"
                              style={{ background: `rgba(40,114,161,${0.08 + i * 0.03})`, color: 'var(--primary)', border: 'none', fontWeight: 600 }}
                            >
                              Sec {m.sectionName} · {m.staffName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {courseSchedules.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarCog size={13} style={{ color: 'var(--primary)' }} /> Course weekly schedule
                        </div>
                        <MiniTimetable schedules={courseSchedules} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isLecturerView && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--surface)', flexShrink: 0 }}>
                  <button onClick={() => setSelectedMeeting(null)} className="btn btn-ghost btn-sm cursor-pointer" style={{ color: 'var(--text-light)' }}>
                    Close
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setMoveTarget(selectedMeeting);
                        setSelectedMeeting(null);
                      }}
                      disabled={saving}
                      className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
                      style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                    >
                      <Move size={13} />
                      {(sm.endPeriodNo - sm.startPeriodNo + 1 > 1) ? (
                        'Move this 2-period meeting'
                      ) : (
                        'Move this meeting'
                      )}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          title: 'Remove schedule',
                          message: `Remove "${sm.courseCode}" at ${slotTextOf(sm)} from this draft? The timetable cell is freed, and you can restore the meeting with Undo.`,
                          confirmLabel: 'Remove',
                          tone: 'danger',
                          action: () => handleDeleteSchedule(sm),
                        })
                      }
                      disabled={saving}
                      className="btn btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
                      style={{ color: '#dc2626', border: '1.5px solid rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.08)', fontWeight: 700 }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {electivePick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} style={{ color: 'var(--primary)' }} />
                Elective co-location
              </div>
              <button onClick={() => setElectivePick(null)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--surface)', fontSize: 12, color: 'var(--text-light)' }}>
              These elective courses legitimately share this timetable window. Choose the meeting you want to inspect or move.
            </div>
            <div style={{ padding: '8px 20px', display: 'grid' }}>
              {electivePick.map((s) => (
                <div key={s.scheduleId} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {s.courseCode}
                    </div>
                    <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-light)' }}>
                      {s.courseName} · {meetingLabelOf(s)} · {slotTextOf(s)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMeeting(s);
                      setElectivePick(null);
                    }}
                    className="btn btn-sm btn-ghost cursor-pointer"
                    style={{ color: 'var(--primary)', fontWeight: 700 }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px' }}>
              <button onClick={() => setElectivePick(null)} className="btn btn-ghost btn-sm cursor-pointer" style={{ color: 'var(--text-light)' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {moveTarget && canEdit && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" style={{ pointerEvents: 'none' }}>
          <div className="bg-base-100 flex items-center gap-3 px-4 py-2.5" style={{ borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--primary)', boxShadow: 'var(--shadow-lg)', pointerEvents: 'auto' }}>
            <Move size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
              Moving {moveTarget.courseCode} · {meetingLabelOf(moveTarget)} · {slotTextOf(moveTarget)} — click a target period (P1…P6)
            </span>
            <button onClick={() => setMoveTarget(null)} className="btn btn-ghost btn-xs cursor-pointer" style={{ color: 'var(--text-light)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingSwap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={MODAL_BACKDROP}
        >
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={15} style={{ color: 'var(--primary)' }} />
                {pendingSwap.cell ? 'Swap single cells?' : 'Swap schedules?'}
              </div>
              <button onClick={() => setPendingSwap(null)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {(() => {
                const dragged = (schedules ?? []).find((s) => s.scheduleId === pendingSwap.scheduleId);
                const occupant = (schedules ?? []).find((s) => s.scheduleId === pendingSwap.withScheduleId);
                return (
                  <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                    {dragged && (
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '2px 12px', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Moving</span>
                        <span style={{ color: 'var(--text)' }}>
                          <b style={{ color: 'var(--accent)' }}>{dragged.courseCode}</b> · {meetingLabelOf(dragged)} · {slotTextOf(dragged)}
                        </span>
                        <span style={{ color: 'var(--text-lighter)', fontWeight: 600 }}>Exchange</span>
                        <span style={{ color: 'var(--text)' }}>
                          {occupant ? (
                            <><b style={{ color: 'var(--accent)' }}>{occupant.courseCode}</b> · {meetingLabelOf(occupant)} · {slotTextOf(occupant)}</>
                          ) : (
                            '\u2014'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {!pendingSwap.conflicts ? (
                pendingSwap.cell ? (
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>
                    This single period is occupied. Swapping exchanges just these two cells — each session
                    stays contiguous wherever possible (e.g. dragging the P2 half of a P1-P2 session onto P3
                    swaps P2 and P3 only).
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>
                    This cell is occupied by another schedule. Swapping exchanges the two schedules&apos; positions.
                  </p>
                )
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 700 }}>
                    <AlertTriangle size={14} /> Swapping would cause {pendingSwap.conflicts.length} conflict{pendingSwap.conflicts.length === 1 ? '' : 's'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                    {pendingSwap.conflicts.map((c, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--text-light)' }}>{c}</li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: '10px 0 0' }}>
                    You can still force the swap — overlapping classes will be highlighted for manual review.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => setPendingSwap(null)}
                  className="btn btn-ghost btn-sm cursor-pointer"
                  style={{ color: 'var(--text-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSwapConfirm(false)}
                  disabled={saving}
                  className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {pendingSwap.conflicts ? 'Force swap' : 'Swap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{confirmDialog.title}</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>{confirmDialog.message}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-ghost btn-sm cursor-pointer"
                  style={{ color: 'var(--text-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await confirmDialog.action();
                    setConfirmDialog(null);
                  }}
                  disabled={saving}
                  className="btn btn-sm gap-1.5 text-white border-none cursor-pointer disabled:opacity-50"
                  style={{
                    background: confirmDialog.tone === 'danger'
                      ? 'linear-gradient(var(--danger), var(--danger-dark))'
                      : 'linear-gradient(var(--primary), var(--primary-dark))',
                  }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {confirmDialog.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvite && activeLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={15} style={{ color: 'var(--primary)' }} /> Invite to lobby
              </div>
              <button onClick={() => setShowInvite(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto" style={{ padding: '8px 20px' }}>
              {!inviteStaffList && (
                <div className="text-center py-8 text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-lighter)' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading staff...
                </div>
              )}
              {inviteStaffList && inviteStaffList.length === 0 && (
                <div className="text-center py-8 text-xs" style={{ color: 'var(--text-lighter)' }}>No staff found</div>
              )}
              {(inviteStaffList ?? [])
                .filter((s) => s.staffId !== staff.staffId)
                .filter((s) => !activeLobby.members.some((m) => m.staffId === s.staffId))
                .map((s) => (
                  <div key={s.staffId} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize: 10 }}>
                      {initialsOf(s.staffName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{s.staffName}</div>
                      <div className="truncate" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>{s.unitName}</div>
                    </div>
                    <button
                      onClick={() => inviteStaff(s.staffId)}
                      disabled={inviteBusy === s.staffId}
                      className="btn btn-xs btn-ghost gap-1 cursor-pointer disabled:opacity-50"
                      style={{ color: 'var(--primary)' }}
                    >
                      {inviteBusy === s.staffId ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                      Invite
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showGroups && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ background: 'rgba(9, 25, 35, 0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <div className="h-full w-full max-w-[420px] bg-base-100 flex flex-col" style={{ borderLeft: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Blocks size={15} style={{ color: 'var(--primary)' }} /> Combined Classes
              </div>
              <button onClick={() => setShowGroups(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
              {/* My Unit vs All Units tabs (mirrors the CMR drawer pattern) */}
              <div className="flex gap-1 mb-4 p-1" style={{ background: 'var(--divider)', borderRadius: 'var(--radius-md)' }}>
                <button
                  onClick={() => setGroupsTab('myUnit')}
                  className="flex-1 btn btn-xs gap-1 cursor-pointer"
                  style={groupsTab === 'myUnit'
                    ? { background: 'var(--base-100)', color: 'var(--primary)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', fontWeight: 700 }
                    : { background: 'transparent', color: 'var(--text-light)', border: '1px solid transparent' }}
                >
                  {groupsTab === 'myUnit' && <Check size={11} style={{ color: 'var(--primary)' }} />}
                  My Unit
                </button>
                <button
                  onClick={() => setGroupsTab('allUnits')}
                  className="flex-1 btn btn-xs gap-1 cursor-pointer"
                  style={groupsTab === 'allUnits'
                    ? { background: 'var(--base-100)', color: 'var(--primary)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', fontWeight: 700 }
                    : { background: 'transparent', color: 'var(--text-light)', border: '1px solid transparent' }}
                >
                  {groupsTab === 'allUnits' && <Check size={11} style={{ color: 'var(--primary)' }} />}
                  All Units
                </button>
              </div>

              {groupsTab === 'myUnit' ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>Create combined class</div>
                  <div className="relative mb-3">
                    <select
                      value={groupCourseId}
                      onChange={(e) => {
                        setGroupCourseId(e.target.value);
                        setGroupAssignments(new Set());
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
                      <option value="">Select course...</option>
                      {(unitCourses ?? []).map((c) => (
                        <option key={c.courseId} value={c.courseId}>{c.courseCode} — {c.courseName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
                  </div>
                  {groupCourseId && (
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                        Sections to combine ({groupAssignments.size} selected)
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {groupCourseAssignments.length === 0 && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-lighter)' }}>No teaching assignments for this course this term</div>
                        )}
                        {groupCourseAssignments.map((a) => (
                          <label key={a.assignmentId} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--text)' }}>
                            <input
                              type="checkbox"
                              checked={groupAssignments.has(a.assignmentId)}
                              onChange={() => {
                                setGroupAssignments((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(a.assignmentId)) next.delete(a.assignmentId);
                                  else next.add(a.assignmentId);
                                  return next;
                                });
                              }}
                              style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                            />
                            Section {a.sectionName} — {a.staffName}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleCreateGroup}
                    disabled={groupsSaving}
                    className="w-full btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
                    style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                  >
                    {groupsSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Create combined class
                  </button>

                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', margin: '20px 0 10px' }}>My classes (this timetable)</div>
                  {!groups && (
                    <div className="text-center py-6 text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-lighter)' }}>
                      <Loader2 size={14} className="animate-spin" /> Loading...
                    </div>
                  )}
                  {groups && ownGroups.filter(scopeGroupFilter).length === 0 && (
                    <div className="text-center py-6 text-xs" style={{ color: 'var(--text-lighter)' }}>
                      {groups.length === 0 ? 'No combined classes yet' : 'No combined classes from your unit in this timetable\u2019s scope'}
                    </div>
                  )}
                  {ownGroups.filter(scopeGroupFilter).map((g) => (
                    <div key={g.groupId} className="px-3 py-3 mb-2" style={{ borderRadius: 'var(--radius-md)', border: '1.5px solid var(--surface-border)', background: 'var(--divider)' }}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{g.groupName}</span>
                        <button
                          onClick={() => handleDeleteGroup(g)}
                          className="btn btn-ghost btn-xs btn-circle cursor-pointer"
                          style={{ color: 'var(--danger)' }}
                          title="Delete combined class"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-lighter)', marginBottom: 6 }}>
                        {g.courseCode} · Semester {g.semesterNo} · {g.members.length} sections
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {g.members.map((m, i) => (
                          <span
                            key={m.assignmentId}
                            className="badge badge-xs"
                            style={{
                              background: `rgba(40,114,161,${0.08 + i * 0.03})`,
                              color: 'var(--primary)',
                              border: 'none',
                              fontWeight: 600,
                            }}
                          >
                            Sec {m.sectionName} · {m.staffName}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setAddToGroupId((prev) => (prev === g.groupId ? '' : g.groupId));
                          setAddGroupAssignments(new Set());
                        }}
                        className="btn btn-ghost btn-xs gap-1 cursor-pointer mt-2"
                        style={{ color: 'var(--primary)' }}
                      >
                        {addToGroupId === g.groupId ? <X size={11} /> : <Plus size={11} />}
                        {addToGroupId === g.groupId ? 'Cancel' : 'Add Course'}
                      </button>
                      {addToGroupId === g.groupId && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--surface-border)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                            Add sections ({addGroupAssignments.size} selected)
                          </div>
                          {addableAssignments.length === 0 ? (
                            <div style={{ fontSize: 11.5, color: 'var(--text-lighter)' }}>
                              No free sections for {g.courseCode} this term
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
                                {addableAssignments.map((a) => (
                                  <label key={a.assignmentId} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--text)' }}>
                                    <input
                                      type="checkbox"
                                      checked={addGroupAssignments.has(a.assignmentId)}
                                      onChange={() => {
                                        setAddGroupAssignments((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(a.assignmentId)) next.delete(a.assignmentId);
                                          else next.add(a.assignmentId);
                                          return next;
                                        });
                                      }}
                                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                    Section {a.sectionName} — {a.staffName}
                                  </label>
                                ))}
                              </div>
                              <button
                                onClick={handleAddMembers}
                                disabled={addGroupsSaving || addGroupAssignments.size === 0}
                                className="w-full btn btn-xs gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                              >
                                {addGroupsSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                Add to combined class
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600, color: 'var(--text-lighter)', marginBottom: 12 }}>
                    <Eye size={12} style={{ color: 'var(--text-lighter)' }} />
                    <span>Other units are view only — cross-unit read access. Your own classes remain editable.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div className="relative flex-1">
                      <select
                        value={groupsUnitFilter}
                        onChange={(e) => setGroupsUnitFilter(e.target.value)}
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
                        <option value="all">All units ({groupsUnitCount})</option>
                        {allGroupUnits.map(([unitId, unitName]) => (
                          <option key={unitId} value={unitId}>{unitName}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
                    </div>
                    <div className="relative flex-1">
                      <select
                        value={groupsSemFilter}
                        onChange={(e) => setGroupsSemFilter(e.target.value)}
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
                        <option value="all">All semesters ({groupsSemCount})</option>
                        {groupSemesters.map((no) => (
                          <option key={no} value={String(no)}>Semester {no}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
                    </div>
                  </div>
                  {!groups && (
                    <div className="text-center py-6 text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-lighter)' }}>
                      <Loader2 size={14} className="animate-spin" /> Loading...
                    </div>
                  )}
                  {groups && allGroups.filter(scopeGroupFilter).length === 0 && (
                    <div className="text-center py-6 text-xs" style={{ color: 'var(--text-lighter)' }}>
                      {groups.length === 0 ? 'No combined classes yet' : 'No combined classes in this timetable\u2019s scope'}
                    </div>
                  )}
                  {(() => {
                    const unitSections = new Map<string, TeachingGroupResponse[]>();
                    const unitNames = new Map<string, string>();
                    for (const g of allGroups) {
                      if (!scopeGroupFilter(g)) continue;
                      if (groupsUnitFilter !== 'all' && g.members[0]?.unitId !== groupsUnitFilter) continue;
                      if (groupsSemFilter !== 'all' && g.semesterNo !== Number(groupsSemFilter)) continue;
                      const uid = g.members[0]?.unitId ?? '';
                      const uname = g.members[0]?.unitName ?? 'Unknown unit';
                      if (!unitSections.has(uid)) {
                        unitSections.set(uid, []);
                        unitNames.set(uid, uname);
                      }
                      unitSections.get(uid)!.push(g);
                    }
                    if (unitSections.size === 0) {
                      return (
                        <div className="text-center py-6 text-xs" style={{ color: 'var(--text-lighter)' }}>
                          No combined classes match this filter
                        </div>
                      );
                    }
                    return [...unitSections.entries()].map(([uid, list]) => (
                      <Fragment key={uid}>
                        <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-light)' }}>
                          {unitNames.get(uid) ?? 'Unit'}
                          <span style={{ color: 'var(--text-lighter)', fontWeight: 600, letterSpacing: 'normal' }}>({list.length})</span>
                        </div>
                        {list.map((g) => {
                          const isOwn = ownGroups.some((og) => og.groupId === g.groupId);
                          return (
                      <div key={g.groupId} className="px-3 py-3 mb-2" style={{ borderRadius: 'var(--radius-md)', border: '1.5px solid var(--surface-border)', background: 'var(--divider)' }}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{g.groupName}</span>
                          {isOwn && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setAddToGroupId((prev) => (prev === g.groupId ? '' : g.groupId));
                                  setAddGroupAssignments(new Set());
                                }}
                                className="btn btn-ghost btn-xs gap-1 cursor-pointer"
                                style={{ color: 'var(--primary)' }}
                              >
                                {addToGroupId === g.groupId ? <X size={11} /> : <Plus size={11} />}
                                {addToGroupId === g.groupId ? 'Cancel' : 'Add Course'}
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(g)}
                                className="btn btn-ghost btn-xs btn-circle cursor-pointer"
                                style={{ color: 'var(--danger)' }}
                                title="Delete combined class"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-lighter)', marginBottom: 6 }}>
                          {g.courseCode} · Semester {g.semesterNo} · {g.members.length} sections{isOwn ? '' : ' · View only'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {g.members.map((m, i) => (
                            <span
                              key={m.assignmentId}
                              className="badge badge-xs"
                              style={{
                                background: `rgba(40,114,161,${0.08 + i * 0.03})`,
                                color: 'var(--primary)',
                                border: 'none',
                                fontWeight: 600,
                              }}
                              title={m.unitName}
                            >
                              Sec {m.sectionName} · {m.staffName} · {m.unitName}
                            </span>
                          ))}
                        </div>
                        {isOwn && addToGroupId === g.groupId && (
                          <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--surface-border)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                              Add sections ({addGroupAssignments.size} selected)
                            </div>
                            {addableAssignments.length === 0 ? (
                              <div style={{ fontSize: 11.5, color: 'var(--text-lighter)' }}>
                                No free sections for {g.courseCode} this term
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
                                  {addableAssignments.map((a) => (
                                    <label key={a.assignmentId} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--text)' }}>
                                      <input
                                        type="checkbox"
                                        checked={addGroupAssignments.has(a.assignmentId)}
                                        onChange={() => {
                                          setAddGroupAssignments((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(a.assignmentId)) next.delete(a.assignmentId);
                                            else next.add(a.assignmentId);
                                            return next;
                                          });
                                        }}
                                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                      />
                                      Section {a.sectionName} — {a.staffName}
                                    </label>
                                  ))}
                                </div>
                                <button
                                  onClick={handleAddMembers}
                                  disabled={addGroupsSaving || addGroupAssignments.size === 0}
                                  className="w-full btn btn-xs gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
                                  style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
                                >
                                  {addGroupsSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                  Add to combined class
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ));
            })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCmr && generation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: 'rgba(9, 25, 35, 0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="h-full w-full max-w-[440px] bg-base-100 flex flex-col" style={{ borderLeft: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={15} style={{ color: 'var(--primary)' }} /> Meeting Requirements
              </div>
              <button onClick={() => setShowCmr(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CourseRequirementsPanel
                unitId={staff.unitId}
                lobbyId={lobby?.lobbyId ?? null}
                semesters={(scope ?? []).map((sc) => ({ semesterId: sc.semesterId, semesterNo: sc.semesterNo }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Timetable generation — hub (create lobby, waiting room, past activity)
// ============================================================================

function EmptyStateCard({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="bg-base-100 backdrop-blur-xl text-center py-16 px-6" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: 'var(--secondary-lighter)', color: 'var(--text-lighter)' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: 0, maxWidth: 420, marginInline: 'auto' }}>{message}</p>
    </div>
  );
}

function CreateLobbyCard({ onCreate, busy, disabled }: { onCreate: () => void; busy: boolean; disabled?: boolean }) {
  return (
    <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(40,114,161,0.12)', color: 'var(--primary)' }}>
            <CalendarCog size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Start a Generation Session</h3>
            <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '3px 0 0' }}>Create a shared lobby for this term&apos;s timetable</p>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: '0 0 16px', lineHeight: 1.6 }}>
          Invite your teaching staff to join, then generate a conflict-free weekly timetable together.
          The draft is edited collaboratively in real time before publishing.
        </p>
        <button
          onClick={onCreate}
          disabled={busy || disabled}
          className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
          style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create lobby
        </button>
      </div>
    </div>
  );
}

function ActiveLobbyCard({
  lobby,
  isHod,
  staffId,
  busy,
  onJoin,
  onInvite,
  onCancel,
  onStart,
}: {
  lobby: TimetableLobbyResponse;
  isHod: boolean;
  staffId: string;
  busy: string | null;
  onJoin: () => void;
  onInvite: () => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const isMember = lobby.members.some((m) => m.staffId === staffId);
  const hasJoined = lobby.members.some((m) => m.staffId === staffId && m.joined);
  const joined = lobby.members.filter((m) => m.joined);
  const pending = lobby.members.filter((m) => !m.joined);
  const allJoined = lobby.members.length > 0 && pending.length === 0;
  const generating = lobby.status === 'GENERATING';
  return (
    <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1.5px solid rgba(40,114,161,0.35)', boxShadow: '0 4px 20px rgba(40,114,161,0.12)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(40,114,161,0.12)', color: 'var(--primary)' }}>
            {generating ? <Loader2 size={20} className="animate-spin" /> : <Radio size={20} />}
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>
              {lobby.academicYear} Generation Lobby
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '3px 0 0' }}>
              Led by {lobby.leaderName} · {generating ? 'Generating...' : 'Open'}
            </p>
          </div>
        </div>
        <span
          className="badge gap-1"
          style={{
            background: generating ? 'rgba(217,119,6,0.15)' : 'rgba(40,114,161,0.15)',
            color: generating ? '#d97706' : 'var(--primary)',
            border: 'none',
            fontWeight: 700,
          }}
        >
          {generating && <Loader2 size={11} className="animate-spin" />}
          {generating ? 'GENERATING' : 'OPEN'}
        </span>
      </div>
      <div style={{ padding: '18px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
          Members — {joined.length}/{lobby.members.length} joined
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {lobby.members.map((m, i) => (
            <div key={m.memberId} className="flex items-center gap-3 px-3 py-2" style={{ borderRadius: 'var(--radius-md)', background: 'var(--divider)' }}>
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${MEMBER_COLORS[i % MEMBER_COLORS.length]} flex items-center justify-center text-white font-bold shrink-0`} style={{ fontSize: 10 }}>
                {initialsOf(m.staffName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{m.staffName}</div>
                <div className="truncate" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>{m.unitName}</div>
              </div>
              {m.joined ? (
                <span className="badge badge-xs gap-1 shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#059669', border: 'none', fontWeight: 700 }}>
                  <Check size={10} /> Joined
                </span>
              ) : (
                <span className="badge badge-xs shrink-0" style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706', border: 'none', fontWeight: 700 }}>
                  Pending
                </span>
              )}
            </div>
          ))}
          {lobby.members.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-lighter)' }}>No members invited yet</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {!hasJoined && (
            <button
              onClick={onJoin}
              disabled={busy === 'join' || generating}
              className="btn btn-sm gap-1.5 border-none text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))' }}
            >
              {busy === 'join' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Join lobby
            </button>
          )}
          {isHod && (
            <button
              onClick={onInvite}
              disabled={busy === 'invite' || generating}
              className="btn btn-ghost btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ color: 'var(--primary)', border: '1.5px solid var(--surface-border)' }}
            >
              <UserPlus size={13} /> Invite staff
            </button>
          )}
          {isHod && (
            <button
              onClick={onStart}
              disabled={!allJoined || generating}
              className="btn btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
              style={{
                background: allJoined && !generating ? 'linear-gradient(var(--success), #0d9668)' : 'var(--divider)',
                color: allJoined && !generating ? '#fff' : 'var(--text-light)',
                border: 'none',
              }}
              title={allJoined ? 'Create the generation and open the shared workspace' : 'Wait until every member has joined'}
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {generating ? 'Starting...' : 'Start generation'}
            </button>
          )}
          {isHod && (
            <button
              onClick={onCancel}
              disabled={busy === 'cancel' || generating}
              className="btn btn-ghost btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ color: 'var(--danger)' }}
            >
              <XCircle size={13} /> Cancel lobby
            </button>
          )}
          {!isMember && pending.some((m) => m.staffId === staffId) && (
            <span style={{ fontSize: 12, color: 'var(--text-lighter)', alignSelf: 'center' }}>
              You were invited — waiting for the leader to start
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PastLobbiesCard({ lobbies }: { lobbies: TimetableLobbyResponse[] }) {
  return (
    <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} style={{ color: 'var(--primary)' }} /> Past Lobbies
        </h3>
      </div>
      <div style={{ padding: '12px 20px' }}>
        {lobbies.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-lighter)' }}>No past lobbies</div>
        )}
        {lobbies.map((l) => (
          <div key={l.lobbyId} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{l.academicYear}</div>
              <div className="truncate" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>Led by {l.leaderName} · {l.members.length} members</div>
            </div>
            <span
              className="badge badge-xs shrink-0"
              style={{
                background: l.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                color: l.status === 'COMPLETED' ? '#059669' : '#dc2626',
                border: 'none',
                fontWeight: 700,
              }}
            >
              {l.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratedTimetablesCard({
  generations,
  canManage,
  onView,
  onDelete,
}: {
  generations: GenerationSessionResponse[];
  canManage: boolean;
  onView: (generationId: string) => void;
  onDelete: (generation: GenerationSessionResponse) => void;
}) {
  const sorted = [...generations].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return (
    <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={15} style={{ color: 'var(--primary)' }} /> Generation Sessions
        </h3>
      </div>
      <div style={{ padding: '12px 20px' }}>
        {sorted.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-lighter)' }}>No generation sessions yet</div>
        )}
        {sorted.map((g) => (
          <div key={g.generationId} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{g.academicYear}</div>
              <div className="truncate" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>by {g.generatedByStaffNo} · {timeLabel(new Date(g.createdAt).getTime())}</div>
            </div>
            <GenerationStatusPill status={g.status} />
            {canManage && (g.status === 'COMPLETED' || g.status === 'PUBLISHED') && (
              <button
                onClick={() => onView(g.generationId)}
                className="btn btn-ghost btn-xs gap-1 cursor-pointer shrink-0"
                style={{ color: 'var(--primary)' }}
              >
                <Eye size={12} /> View
              </button>
            )}
            {canManage && (g.status === 'PENDING' || g.status === 'FAILED') && (
              <button
                onClick={() => onDelete(g)}
                className="btn btn-ghost btn-xs btn-circle cursor-pointer shrink-0"
                style={{ color: 'var(--danger)' }}
                title="Delete generation"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimetableGenerationSection() {
  const router = useRouter();
  const lastEditStartRef = useRef<string | null>(null);
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [terms, setTerms] = useState<AcademicTermRecord[]>([]);
  const [lobbies, setLobbies] = useState<TimetableLobbyResponse[] | null>(null);
  const [generations, setGenerations] = useState<GenerationSessionResponse[] | null>(null);
  const [manage, setManage] = useState<GenerationManageResponse | null>(null);
  const [activeTermId, setActiveTermId] = useState('');
  const [workspaceGenerationId, setWorkspaceGenerationId] = useState<string | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStaffList, setInviteStaffList] = useState<StaffRecord[] | null>(null);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const isHod = staff ? staff.positions.includes('HOD') : false;
  const activeLobby = lobbies?.find((l) => l.status === 'OPEN' || l.status === 'GENERATING') ?? null;
  const pastLobbies = (lobbies ?? []).filter((l) => l.status === 'CANCELLED' || l.status === 'COMPLETED');
  // Realtime bookkeeping: dedupe MANAGEMENT_STARTED navigation across repeated
  // events, and remember generation ids that no longer exist so the draft
  // auto-entry effect can never navigate into a deleted session (the source of
  // the "Generation session not found" dead end).
  const lastManagementStartRef = useRef<string | null>(null);
  const deadGenerationIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      // Required data: the hub cannot render without the staff profile and the
      // academic term list. Everything else loads in the background below so a
      // slow or failing optional request never blocks the whole page.
      const [staffRecord, termList] = await Promise.all([
        getCurrentStaff(),
        apiFetch<AcademicTermRecord[]>('/api/terms'),
      ]);
      setStaff(staffRecord);
      setTerms(termList);
      const active = termList.find((t) => t.status === 'ACTIVE') ?? termList[0];
      setActiveTermId((prev) => prev || active?.termId || '');
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load timetable generation');
      setLoading(false);
      return;
    }
    // Optional data: lobby status and generation history refresh independently
    // (and via realtime events); their failure must not freeze the hub.
    getGenerationLobbies()
      .then(setLobbies)
      .catch(() => setNotice('Generation lobby status could not be loaded — it will refresh automatically.'));
    getGenerations()
      .then(setGenerations)
      .catch(() => setNotice('Generation history could not be loaded — it will refresh automatically.'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial hub load
    load();
  }, [load]);

  useEffect(() => {
    if (!activeTermId) return;
    getGenerationManage(activeTermId)
      .then(setManage)
      .catch(() => {});
  }, [activeTermId, workspaceGenerationId]);

  useEffect(() => {
    const draftId = manage?.generation?.generationId;
    if (!draftId || workspaceGenerationId || draftDismissed) return;
    // Never auto-enter a generation that is known to be gone.
    if (deadGenerationIdsRef.current.has(draftId)) return;
    setWorkspaceGenerationId(draftId);
  }, [manage, workspaceGenerationId, draftDismissed]);

  const refreshLobbies = useCallback(async () => {
    try {
      const list = await getGenerationLobbies();
      setLobbies(list);
    } catch {
      // transient
    }
  }, []);

  // Discovery channel: SSE is lobby-scoped and membership-gated, so a HOD who
  // has not joined any lobby has no stream and would never learn that a lobby
  // was created or cancelled. Poll the authoritative list lightly — only while
  // no active lobby exists, the tab is visible, and stop once subscribed.
  useEffect(() => {
    if (activeLobby) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      refreshLobbies();
    };
    const interval = setInterval(tick, 8000);
    return () => clearInterval(interval);
  }, [activeLobby, refreshLobbies]);

  // Re-authoritative on tab focus / visibility regain regardless of state.
  useEffect(() => {
    const onFocus = () => refreshLobbies();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshLobbies]);

  useTimetableRealtime(activeLobby?.lobbyId ?? null, (event) => {
    switch (event.type) {
      case TIMETABLE_REALTIME_EVENTS.MANAGEMENT_STARTED:
        if (event.generationId && deadGenerationIdsRef.current.has(event.generationId)) break;
        // Duplicate delivery (e.g. after reconnect) must not re-navigate.
        if (event.generationId && lastManagementStartRef.current === event.generationId) break;
        if (event.generationId) {
          lastManagementStartRef.current = event.generationId;
          setDraftDismissed(false);
          setWorkspaceGenerationId(event.generationId);
          toast.success('Timetable management started — opening the shared workspace');
        } else {
          // Payload without an id: fall back to the authoritative list.
          refreshLobbies();
        }
        break;
      case TIMETABLE_REALTIME_EVENTS.EDIT_STARTED: {
        // The lobby creator opened the dedicated edit workspace: every joined
        // HOD on the hub navigates there too. Dedup repeated deliveries and
        // never navigate when already on the edit route.
        const target = event.generationId;
        if (!target) break;
        if (deadGenerationIdsRef.current.has(target)) break;
        if (lastEditStartRef.current === target) break;
        lastEditStartRef.current = target;
        if (typeof window !== 'undefined' && window.location.pathname === '/lecturer/timetable-edit') break;
        router.push(`/lecturer/timetable-edit?generationId=${encodeURIComponent(target)}`);
        break;
      }
      case TIMETABLE_REALTIME_EVENTS.LOBBY_MEMBER_JOINED:
      case TIMETABLE_REALTIME_EVENTS.LOBBY_CANCELLED:
      case TIMETABLE_REALTIME_EVENTS.GENERATION_STARTED:
      case TIMETABLE_REALTIME_EVENTS.GENERATION_COMPLETED:
      case TIMETABLE_REALTIME_EVENTS.GENERATION_FAILED:
      case TIMETABLE_REALTIME_EVENTS.TIMETABLE_PUBLISHED:
      case TIMETABLE_REALTIME_EVENTS.TIMETABLE_DELETED: {
        const removedId = event.type === TIMETABLE_REALTIME_EVENTS.TIMETABLE_DELETED
          ? event.generationId : null;
        if (removedId) deadGenerationIdsRef.current.add(removedId);
        if (
          removedId &&
          (workspaceGenerationId === removedId || lastManagementStartRef.current === removedId)
        ) {
          lastManagementStartRef.current = null;
        }
        refreshLobbies();
        getGenerations().then(setGenerations).catch(() => {});
        break;
      }
      default:
        break;
    }
  }, () => {
    // Stream (re)connected: SSE has no replay, so merge the authoritative
    // snapshot now. This recovers join/leave/start events missed while the
    // connection was down without requiring any manual refresh.
    refreshLobbies();
    getGenerations().then(setGenerations).catch(() => {});
  });

  const handleCreateLobby = async () => {
    if (!activeTermId || creating) return;
    setCreating(true);
    try {
      const lobby = await createGenerationLobby({ termId: activeTermId });
      setLobbies((prev) => [lobby, ...(prev ?? [])]);
      toast.success('Generation lobby created — invite your staff');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create lobby');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!activeLobby || busy) return;
    setBusy('join');
    try {
      await joinGenerationLobby(activeLobby.lobbyId);
      await refreshLobbies();
      toast.success('You joined the generation lobby');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not join lobby');
    } finally {
      setBusy(null);
    }
  };

  const handleCancelLobby = () => {
    if (!activeLobby) return;
    setConfirmDialog({
      title: 'Cancel this lobby?',
      message: 'All invited members will be notified and the lobby closed.',
      confirmLabel: 'Cancel lobby',
      tone: 'danger',
      action: async () => {
        try {
          await cancelGenerationLobby(activeLobby.lobbyId);
          await refreshLobbies();
          toast.success('Lobby cancelled');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Could not cancel lobby');
        }
      },
    });
  };

  const handleStartGeneration = async () => {
    if (!activeLobby || busy) return;
    setBusy('start');
    try {
      const updated = await generateFromLobby(activeLobby.lobbyId);
      // Open the shared workspace for the creator right away; the realtime
      // MANAGEMENT_STARTED event redirects the other joined HODs.
      if (updated?.generationId) {
        lastManagementStartRef.current = updated.generationId;
        setDraftDismissed(false);
        setWorkspaceGenerationId(updated.generationId);
      }
    } catch (e) {
      // The dispatch may still succeed server-side on slow database days even
      // after the client gives up waiting. Probe the authoritative lobby a few
      // times with the exact identity; only surface an error when it truly
      // never appeared. Never guess by "latest session".
      let recovered: string | null = null;
      for (let attempt = 0; attempt < 3 && !recovered; attempt++) {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          const list = await getGenerationLobbies();
          setLobbies(list);
          const genId = list.find((l) => l.lobbyId === activeLobby.lobbyId)?.generationId ?? null;
          if (genId && !deadGenerationIdsRef.current.has(genId)) recovered = genId;
        } catch {
          // keep probing
        }
      }
      if (recovered) {
        lastManagementStartRef.current = recovered;
        setDraftDismissed(false);
        setWorkspaceGenerationId(recovered);
        toast.success('Timetable management started — opening the shared workspace');
      } else {
        refreshLobbies().catch(() => {});
        toast.error(e instanceof Error ? e.message : 'Could not start generation');
      }
    } finally {
      setBusy(null);
    }
  };

  const openInvite = async () => {
    setShowInvite(true);
    setInviteStaffList(null);
    try {
      const list = await apiFetch<StaffRecord[]>('/api/staff');
      setInviteStaffList(list);
    } catch {
      setInviteStaffList([]);
    }
  };

  const inviteStaff = async (targetStaffId: string) => {
    if (!activeLobby || inviteBusy) return;
    setInviteBusy(targetStaffId);
    try {
      await inviteLobbyMember(activeLobby.lobbyId, targetStaffId);
      await refreshLobbies();
      toast.success('Invitation sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not invite staff');
    } finally {
      setInviteBusy(null);
    }
  };

  const handleViewGeneration = (generationId: string) => {
    setWorkspaceGenerationId(generationId);
  };

  const handleDeleteGeneration = (g: GenerationSessionResponse) => {
    setConfirmDialog({
      title: 'Delete this generation?',
      message: `The ${g.academicYear} generation and its schedules will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      action: async () => {
        try {
          await deleteGeneration(g.generationId);
          setGenerations((prev) => (prev ?? []).filter((x) => x.generationId !== g.generationId));
          toast.success('Generation deleted');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Could not delete generation');
        }
      },
    });
  };

  if (workspaceGenerationId && staff) {
    return (
      <SharedTimetableWorkspace
        key={workspaceGenerationId}
        generationId={workspaceGenerationId}
        onBack={() => {
          setDraftDismissed(true);
          setWorkspaceGenerationId(null);
          load();
        }}
onNotFound={(goneId) => {
            // The referenced session does not exist (e.g. a stale draft id).
            // Record it so no effect navigates there again, then return to the
            // hub — no reload required.
            deadGenerationIdsRef.current.add(goneId);
            if (lastManagementStartRef.current === goneId) lastManagementStartRef.current = null;
            setDraftDismissed(true);
            setWorkspaceGenerationId(null);
            load();
          }}
          staff={staff}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="flex items-center gap-2" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>
            <CalendarCog size={22} style={{ color: 'var(--primary)' }} /> Timetable Generation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-light)', margin: '4px 0 0' }}>
            Create, collaborate and publish the weekly timetable with your teaching staff
          </p>
        </div>
        {terms.length > 0 && (
          <div className="relative">
            <select
              value={activeTermId}
              onChange={(e) => setActiveTermId(e.target.value)}
              className="appearance-none cursor-pointer"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 30px 8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--surface-border)',
                background: 'var(--divider)',
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {terms.map((t) => (
                <option key={t.termId} value={t.termId}>
                  {t.academicYear} {t.status === 'ACTIVE' ? '· Active' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
          </div>
        )}
      </div>

      {error && !staff && (
        <div
          className="flex items-center gap-2 px-4 py-3 mt-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: 12.5 }}
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="btn btn-ghost btn-xs gap-1.5 cursor-pointer" style={{ color: 'var(--primary)' }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {notice && (
        <div
          className="flex items-center gap-2 px-4 py-3 mt-4"
          style={{ borderRadius: 'var(--radius-md)', background: 'rgba(251,191,36,0.12)', border: '1.5px solid rgba(217,119,6,0.35)', color: '#b45309', fontSize: 12.5 }}
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="btn btn-ghost btn-xs cursor-pointer" style={{ color: 'var(--text-light)' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-lighter)' }}>Loading generation hub...</div>
        </div>
      ) : !staff ? (
        <div style={{ marginTop: 18 }}>
          <EmptyStateCard
            icon={<ShieldCheck size={26} />}
            title="Sign in required"
            message="We could not load your staff profile. Please refresh the page to try again."
          />
        </div>
      ) : !isHod ? (
        <div style={{ marginTop: 18 }}>
          <EmptyStateCard
            icon={<ShieldCheck size={26} />}
            title="HOD access required"
            message="Only HOD lecturers can manage timetable generation. If you believe this is an error, contact the system administrator."
          />
        </div>
      ) : !activeTermId ? (
        <div style={{ marginTop: 18 }}>
          <EmptyStateCard
            icon={<CalendarDays size={26} />}
            title="No academic term"
            message="No active academic term was found. The university server must have an active term before a timetable can be generated."
          />
        </div>
      ) : (
        <div style={{ marginTop: 18, display: 'grid', gap: 18 }}>
          {!activeLobby && (
            <CreateLobbyCard onCreate={handleCreateLobby} busy={creating} />
          )}
          {activeLobby && (
            <ActiveLobbyCard
              lobby={activeLobby}
              isHod={isHod}
              staffId={staff.staffId}
              busy={busy}
              onJoin={handleJoin}
              onInvite={openInvite}
              onCancel={handleCancelLobby}
              onStart={handleStartGeneration}
            />
          )}
          <GeneratedTimetablesCard
            generations={generations ?? []}
            canManage={manage?.canManage === true}
            onView={handleViewGeneration}
            onDelete={handleDeleteGeneration}
          />
          <PastLobbiesCard lobbies={pastLobbies} />
        </div>
      )}

      {showInvite && activeLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={15} style={{ color: 'var(--primary)' }} /> Invite to lobby
              </div>
              <button onClick={() => setShowInvite(false)} className="btn btn-ghost btn-sm btn-circle cursor-pointer" style={{ color: 'var(--text-light)' }}>
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto" style={{ padding: '8px 20px' }}>
              {!inviteStaffList && (
                <div className="text-center py-8 text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-lighter)' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading staff...
                </div>
              )}
              {inviteStaffList && inviteStaffList.length === 0 && (
                <div className="text-center py-8 text-xs" style={{ color: 'var(--text-lighter)' }}>No staff found</div>
              )}
              {(inviteStaffList ?? [])
                .filter((s) => s.staffId !== staff?.staffId)
                .filter((s) => !activeLobby.members.some((m) => m.staffId === s.staffId))
                .map((s) => (
                  <div key={s.staffId} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize: 10 }}>
                      {initialsOf(s.staffName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{s.staffName}</div>
                      <div className="truncate" style={{ fontSize: 11, color: 'var(--text-lighter)' }}>{s.unitName}</div>
                    </div>
                    <button
                      onClick={() => inviteStaff(s.staffId)}
                      disabled={inviteBusy === s.staffId}
                      className="btn btn-xs btn-ghost gap-1 cursor-pointer disabled:opacity-50"
                      style={{ color: 'var(--primary)' }}
                    >
                      {inviteBusy === s.staffId ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                      Invite
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_BACKDROP}>
          <div className="bg-base-100 w-full max-w-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{confirmDialog.title}</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>{confirmDialog.message}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-ghost btn-sm cursor-pointer"
                  style={{ color: 'var(--text-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await confirmDialog.action();
                    setConfirmDialog(null);
                  }}
                  className="btn btn-sm gap-1.5 text-white border-none cursor-pointer"
                  style={{
                    background: confirmDialog.tone === 'danger'
                      ? 'linear-gradient(var(--danger), var(--danger-dark))'
                      : 'linear-gradient(var(--primary), var(--primary-dark))',
                  }}
                >
                  <Check size={13} />
                  {confirmDialog.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Timetable — published weekly view (all lecturers)
// ============================================================================

export function TimetableSection() {
  const terms = useUniversityData<AcademicTermRecord[]>(
    useCallback(() => apiFetch<AcademicTermRecord[]>('/api/terms'), [])
  );
  const [termId, setTermId] = useState('');
  useEffect(() => {
    if (!termId && terms.data && terms.data.length > 0) {
      const active = terms.data.find((t) => t.status === 'ACTIVE') ?? terms.data[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- default to active term
      setTermId(active.termId);
    }
  }, [terms.data, termId]);
  const schedules = useUniversityData<ScheduleResponse[]>(
    useCallback(
      () => (termId ? getPublishedSchedules(termId) : Promise.resolve([])),
      [termId]
    )
  );
  // While the first schedule fetch for the chosen term is in flight the grid
  // shows its skeleton. The refresh below re-runs the fetcher immediately for
  // the picked term — the hook otherwise swaps from the placeholder [] only on
  // its next polling cycle.
  const [termFetching, setTermFetching] = useState(false);
  const fetchedTermRef = useRef('');
  useEffect(() => {
    if (!termId || fetchedTermRef.current === termId) return;
    fetchedTermRef.current = termId;
    setTermFetching(true);
    schedules.refresh()
      .then(() => setTermFetching(false))
      .catch(() => setTermFetching(false));
  }, [termId, schedules]);
  const [todayIdx, setTodayIdx] = useState(-1);
  useEffect(() => {
    const d = new Date().getDay();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- compute today column once on mount
    setTodayIdx(d >= 1 && d <= 5 ? d - 1 : -1);
  }, []);

  const published = useMemo(() => schedules.data ?? [], [schedules.data]);
  const cohortGroups = useMemo(() => groupSchedulesByCohort(published), [published]);
  const semesterTiles = useMemo(() => {
    const tiles = new Map<number, { semesterNo: number; groups: { semesterNo: number; section: string; items: ScheduleResponse[] }[] }>();
    for (const g of cohortGroups) {
      const tile = tiles.get(g.semesterNo) ?? {
        semesterNo: g.semesterNo,
        groups: [] as { semesterNo: number; section: string; items: ScheduleResponse[] }[],
      };
      const merged = tile.groups.find((x) => x.section === g.section);
      if (merged) {
        for (const item of g.items) {
          if (!merged.items.some((i) => i.scheduleId === item.scheduleId)) merged.items.push(item);
        }
      } else {
        tile.groups.push(g);
      }
      tiles.set(g.semesterNo, tile);
    }
    return [...tiles.values()]
      .map((t) => ({ ...t, groups: [...t.groups].sort((a, b) => a.section.localeCompare(b.section)) }))
      .sort((a, b) => a.semesterNo - b.semesterNo);
  }, [cohortGroups]);
  const { periodLabels, lunchLabel } = useTimeSlotLabels();
  const timetableSkeleton = terms.loading || termFetching;
  const semCount = published.filter((s) => s.scheduleType === 'COURSE').length;

  return (
    <div>
      {(terms.error && !terms.data) || (schedules.error && !schedules.data) ? (
        <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 12 }}>
          University server unreachable — retrying—
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Timetable</h1>
          <p style={{ fontSize: 14, color: 'var(--text-light)', margin: '4px 0 0' }}>Your weekly lecture and lab schedule</p>
        </div>
        {terms.data && terms.data.length > 0 && (
          <div className="relative">
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="appearance-none cursor-pointer"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 30px 8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--surface-border)',
                background: 'var(--divider)',
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {terms.data.map((t) => (
                <option key={t.termId} value={t.termId}>
                  {t.academicYear} {t.status === 'ACTIVE' ? '· Active' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-lighter)' }} />
          </div>
        )}
      </div>
      <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--surface)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
              Published Weekly Timetable {semCount > 0 ? `(${semCount} schedules)` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-xs" style={{ background: 'rgba(40,114,161,0.15)', color: 'var(--primary)', border: 'none' }}>Lecture</span>
            <span className="badge badge-xs" style={{ background: 'rgba(139,92,246,0.15)', color: '#7c3aed', border: 'none' }}>LMS</span>
            <span className="badge badge-xs" style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706', border: 'none' }}>Assignment</span>
          </div>
        </div>
        <div style={{ padding: '18px' }}>
          {timetableSkeleton ? (
            <WeeklyGridSkeleton />
          ) : published.length === 0 ? (
            <div className="text-center py-16">
              <CalendarCog size={32} className="mx-auto mb-3 opacity-30" />
              <p style={{ fontSize: 12.5, color: 'var(--text-lighter)', margin: 0 }}>
                No timetable published for this term yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {semesterTiles.map((tile) => (
                <div
                  key={tile.semesterNo}
                  style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(40,114,161,0.06)',
                      borderBottom: '1px solid var(--surface)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 12,
                          color: '#fff',
                          background: 'linear-gradient(var(--primary), var(--primary-dark))',
                        }}
                      >
                        {tile.semesterNo}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                        {semesterTileLabel(tile.semesterNo)}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {tile.groups.map((g) => (
                      <div key={g.section}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              letterSpacing: '0.4px',
                              color: 'var(--text)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Section {g.section}
                          </span>
                          <span style={{ flex: '1 1 auto', height: 1, background: 'var(--surface)' }} />
                        </div>
                        <div style={{ border: '1px solid var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'auto' }}>
                          <WeeklyTimetableGrid
                            schedules={g.items}
                            editable={false}
                            asSingleCohort
                            periodLabels={periodLabels}
                            lunchLabel={lunchLabel}
                            todayIdx={todayIdx}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { default as EventsSection } from '@/components/shared/EventsSection';

export function LostFoundSection() {
  return <LostFoundPage />;
}

export function AnnouncementsSection() {
  return <AnnouncementsPage />;
}

export function SettingsSection() {
  const [settingsTab, setSettingsTab] = useState('Profile');
  const [notifPrefs, setNotifPrefs] = useState({ push: true, emailDigest: false, messageAlerts: true, eventReminders: true });
  const { user: session } = useSession();
  const { profile, loading } = useMyProfile();
  const me = session?.email ?? '';
  const name = profile?.name || session?.name || 'User';

  const notifToggles = [
    { key: 'push', label: 'Push Notifications', desc: 'Receive push notifications on your device' },
    { key: 'emailDigest', label: 'Email Digest', desc: 'Receive daily email digest of updates' },
    { key: 'messageAlerts', label: 'Message Alerts', desc: 'Get notified when you receive new messages' },
    { key: 'eventReminders', label: 'Event Reminders', desc: 'Get reminders about upcoming events' },
  ] as const;

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20 }}>Manage your account and preferences</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--surface)' }}>
        {['Profile', 'Notifications', 'Appearance', 'Blocked'].map(t => (
          <button key={t} onClick={() => setSettingsTab(t)}
            style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: settingsTab === t ? 'var(--primary)' : 'var(--text-light)', cursor: 'pointer', borderBottom: '2.5px solid transparent', borderBottomColor: settingsTab === t ? 'var(--primary)' : 'transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>{t}</button>
        ))}
      </div>
      {settingsTab === 'Profile' ? (
        <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--surface)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(to bottom right, var(--secondary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: 'var(--primary)' }}>{initialsOf(name)}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{loading ? 'Loading...' : name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-lighter)', margin: '4px 0 0 0' }}>{loading ? '' : profile?.unit || me}</p>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-lighter)' }}>Loading profile...</div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Full Name</label>
                <input type="text" defaultValue={name} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)', fontSize: 13, color: 'var(--text)' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Email Address</label>
                <input type="email" defaultValue={me} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)', fontSize: 13, color: 'var(--text)' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Department</label>
                <input type="text" defaultValue={profile?.unit || ''} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)', fontSize: 13, color: 'var(--text)' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Phone Number</label>
                <input type="text" defaultValue={profile?.phone || ''} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--secondary)', background: 'var(--secondary-lighter)', fontSize: 13, color: 'var(--text)' }} />
              </div>
            </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 18, borderTop: '1px solid var(--surface)' }}>
              <button style={{ background: 'transparent', color: 'var(--text-light)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-light)'; }}>Cancel</button>
              <button style={{ background: 'linear-gradient(var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(35, 96, 138,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(35, 96, 138,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(35, 96, 138,0.3)'; }}>Save Changes</button>
            </div>
          </div>
        </div>
      ) : settingsTab === 'Appearance' ? (
        <ThemeSwitcher />
      ) : settingsTab === 'Notifications' ? (
        <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>Notification Preferences</h3>
            {notifToggles.map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 2 }}>{desc}</div>
                </div>
                <button onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', background: notifPrefs[key] ? 'var(--primary)' : 'var(--surface-hover)' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'all 0.2s', left: notifPrefs[key] ? 24 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-base-100 backdrop-blur-xl" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--surface)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}><Ban size={16} /> Blocked Users</div>
          </div>
          <div style={{ padding: '16px 22px' }}>
            <BlockedSection bare />
          </div>
        </div>
      )}
    </div>
  );
}
