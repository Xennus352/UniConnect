'use client';

import PageLayout from '@/components/shared/PageLayout';
import { DepartmentLecturersSection } from '@/components/lecturer/DepartmentLecturers';

export default function LecturersPage() {
  return (
    <PageLayout role="lecturer">
      <DepartmentLecturersSection />
    </PageLayout>
  );
}