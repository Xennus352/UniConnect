'use client';

import PageLayout from '@/components/shared/PageLayout';
import { DepartmentCoursesSection } from '@/components/lecturer/DepartmentCourses';

export default function CoursesPage() {
  return (
    <PageLayout role="lecturer">
      <DepartmentCoursesSection />
    </PageLayout>
  );
}