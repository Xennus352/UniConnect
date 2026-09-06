'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/shared/PageLayout';
import { getCurrentStaff } from '@/components/shared/api';
import type { StaffRecord } from '@/components/shared/api';
import { SharedTimetableWorkspace } from '@/components/lecturer/sections';

function TimetableEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generationId = searchParams.get('generationId') ?? '';
  const scopeSemester = Number(searchParams.get('semesterNo') ?? '');
  const scopeSection = searchParams.get('section');
  const initialSectionScope =
    !Number.isNaN(scopeSemester) && scopeSection
      ? { semesterNo: scopeSemester, section: scopeSection }
      : null;

  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentStaff()
      .then((s) => {
        if (cancelled) return;
        setStaff(s);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load your staff profile');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const backToHub = () => {
    router.push('/lecturer/timetable-generation');
  };

  let body: React.ReactNode;
  if (!generationId) {
    body = (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>Missing timetable</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-lighter)' }}>No generation was provided for this edit workspace.</div>
        <button onClick={backToHub} className="btn btn-sm mt-2 cursor-pointer" style={{ color: 'var(--primary)' }}>
          Back to Timetable Generation
        </button>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <div style={{ fontSize: 13, color: 'var(--text-lighter)' }}>Loading edit workspace...</div>
      </div>
    );
  } else if (error || !staff) {
    body = (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>Could not load edit workspace</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-lighter)' }}>{error ?? 'Sign in required to edit timetables.'}</div>
        <button onClick={backToHub} className="btn btn-sm mt-2 cursor-pointer" style={{ color: 'var(--primary)' }}>
          Back to Timetable Generation
        </button>
      </div>
    );
  } else {
    body = (
      <SharedTimetableWorkspace
        key={generationId}
        generationId={generationId}
        onBack={() => {
          toast.success('Editing closed');
          backToHub();
        }}
        onNotFound={(goneId) => {
          toast.error('This timetable no longer exists');
          backToHub();
          void goneId;
        }}
        initialSectionScope={initialSectionScope}
        staff={staff}
      />
    );
  }

  return (
    <PageLayout role="lecturer">
      {body}
    </PageLayout>
  );
}

export default function TimetableEditPage() {
  return (
    <Suspense fallback={<PageLayout role="lecturer"><div className="py-24 text-center text-sm" style={{ color: 'var(--text-lighter)' }}>Loading edit page...</div></PageLayout>}>
      <TimetableEditContent />
    </Suspense>
  );
}
