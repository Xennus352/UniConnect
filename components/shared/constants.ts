import type { NavItem, FeedItemData, EventItemData, MessageData, InboxItemData, StudentData, LecturerData, StaffData, Email, ExamResultItem, ChatMessage, Contact, Notification } from './types';

export type UserRole = 'student' | 'lecturer' | 'student-affair' | 'admin';

export interface LoginCredential {
  role: UserRole;
  label: string;
  email: string;
  password: string;
  name: string;
  path: string;
}

export const LOGIN_CREDENTIALS: LoginCredential[] = [
  { role: 'student', label: 'Student', email: 'kyawthu100@gmail.com', password: 'ucstgo@2026', name: 'Kyaw Thu', path: '/student' },
  { role: 'lecturer', label: 'Lecturer', email: 'dawmya@gmail.com', password: 'ucstgo@2026', name: 'Daw Mya', path: '/lecturer' },
  { role: 'student-affair', label: 'Student Affairs', email: 'kohtet@gmail.com', password: 'ucstgo@2026', name: 'Student Affairs Office', path: '/student-affair' },
  { role: 'admin', label: 'System Admin', email: 'nyiminyan0099@gmail.com', password: '@dmin123', name: 'Mg Kyaw', path: '/admin' },
];

export const MAIN_NAV: Record<UserRole, NavItem[]> = {
  student: [
    {
      section: 'Main Menu',
      items: [
        { icon: 'Newspaper', label: 'Feed', id: 'feed' },
        { icon: 'MessageSquare', label: 'Messages', id: 'messages' },
        { icon: 'Clapperboard', label: 'Activity', id: 'activity' },
        { icon: 'Bell', label: 'Notifications', id: 'notifications' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { icon: 'CalendarDays', label: 'Timetable', id: 'timetable' },
        { icon: 'FileText', label: 'Exam Results', id: 'exam-results' },
        { icon: 'ClipboardCheck', label: 'Roll Call', id: 'roll-call' },
      ],
    },
    {
      section: 'University',
      items: [
        { icon: 'CalendarCheck', label: 'Events', id: 'events' },
        { icon: 'Megaphone', label: 'Announcements', id: 'announcements' },
        { icon: 'Search', label: 'Lost & Found', id: 'lost-found' },
      ],
    },
    {
      section: 'System',
      items: [
        { icon: 'User', label: 'My Profile', id: 'profile' },
        { icon: 'Settings', label: 'Settings', id: 'settings' },
      ],
    },
  ],
  lecturer: [
    {
      section: 'Main Menu',
      items: [
        { icon: 'Newspaper', label: 'Feed', id: 'feed' },
        { icon: 'MessageSquare', label: 'Messages', id: 'messages' },
        { icon: 'Clapperboard', label: 'Activity', id: 'activity' },
        { icon: 'Bell', label: 'Notifications', id: 'notifications' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { icon: 'GraduationCap', label: 'Students', id: 'students' },
        { icon: 'BookOpen', label: 'Courses', id: 'courses' },
        { icon: 'Users', label: 'Lecturers', id: 'lecturers' },
        { icon: 'ClipboardCheck', label: 'Roll Call', id: 'roll-call' },
        { icon: 'CalendarDays', label: 'Timetable', id: 'timetable' },
        { icon: 'CalendarCog', label: 'Timetable Generation', id: 'timetable-generation' },
      ],
    },
    {
      section: 'University',
      items: [
        { icon: 'CalendarCheck', label: 'Events', id: 'events' },
        { icon: 'Megaphone', label: 'Announcements', id: 'announcements' },
        { icon: 'Search', label: 'Lost & Found', id: 'lost-found' },
      ],
    },
    {
      section: 'System',
      items: [
        { icon: 'User', label: 'My Profile', id: 'profile' },
        { icon: 'Settings', label: 'Settings', id: 'settings' },
      ],
    },
  ],
  admin: [
    {
      section: 'Main Menu',
      items: [
        { icon: 'LayoutDashboard', label: 'Dashboard', id: 'dashboard' },
        { icon: 'Newspaper', label: 'Feed', id: 'feed' },
        { icon: 'MessageSquare', label: 'Messages', id: 'messages' },
        { icon: 'Clapperboard', label: 'Activity', id: 'activity' },
        { icon: 'Bell', label: 'Notifications', id: 'notifications' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { icon: 'FileText', label: 'Exam Results', id: 'exam-results' },
        { icon: 'ClipboardCheck', label: 'Roll Call', id: 'roll-call' },
        { icon: 'CalendarDays', label: 'Timetable', id: 'timetable' },
      ],
    },
    {
      section: 'University',
      items: [
        { icon: 'CalendarCheck', label: 'Events', id: 'events' },
        { icon: 'Megaphone', label: 'Announcements', id: 'announcements' },
        { icon: 'Search', label: 'Lost & Found', id: 'lost-found' },
      ],
    },
    {
      section: 'ADMINISTRATIVE',
      items: [
        { icon: 'ShieldCheck', label: 'Student Affairs', id: 'student-affairs' },
        { icon: 'Coins', label: 'Finance', id: 'finance' },
        { icon: 'Landmark', label: 'Administrative', id: 'administrative' },
      ],
    },
    {
      section: 'User Management',
      items: [
        { icon: 'GraduationCap', label: 'User \u2013 Students', id: 'user-students' },
        { icon: 'Presentation', label: 'User \u2013 Lecturers', id: 'user-lecturers' },
        { icon: 'ShieldCheck', label: 'User \u2013 Student Affairs', id: 'user-student-affairs' },
        { icon: 'Coins', label: 'User \u2013 Finance', id: 'user-finance' },
        { icon: 'Landmark', label: 'User \u2013 Administrative Officers', id: 'user-administrative-officers' },
        { icon: 'UserCog', label: 'User \u2013 Admins', id: 'user-admins' },
      ],
    },
    {
      section: 'System',
      items: [
        { icon: 'ShieldCheck', label: 'Moderation', id: 'moderation' },
        { icon: 'User', label: 'My Profile', id: 'profile' },
        { icon: 'Settings', label: 'Settings', id: 'settings' },
      ],
    },
  ],
  'student-affair': [
    {
      section: 'Main Menu',
      items: [
        { icon: 'LayoutDashboard', label: 'Dashboard', id: 'dashboard' },
        { icon: 'Newspaper', label: 'Feed', id: 'feed' },
        { icon: 'MessageSquare', label: 'Messages', id: 'messages' },
        { icon: 'Clapperboard', label: 'Activity', id: 'activity' },
        { icon: 'Bell', label: 'Notifications', id: 'notifications' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { icon: 'FileText', label: 'Exam Results', id: 'exam-results' },
      ],
    },
    {
      section: 'University',
      items: [
        { icon: 'GraduationCap', label: 'Students', id: 'students' },
        { icon: 'CalendarCheck', label: 'Events', id: 'events' },
        { icon: 'Megaphone', label: 'Announcements', id: 'announcements' },
        { icon: 'Search', label: 'Lost & Found', id: 'lost-found' },
      ],
    },
    {
      section: 'System',
      items: [
        { icon: 'ShieldCheck', label: 'Moderation', id: 'moderation' },
        { icon: 'User', label: 'My Profile', id: 'profile' },
        { icon: 'Settings', label: 'Settings', id: 'settings' },
      ],
    },
  ],
};

export const MOCK_FEED: FeedItemData[] = [
  {
    id: '1', author: { initials: 'DR', name: 'Dr. Aung Myint', role: 'Department Head', color: 'from-primary to-primary-dark/80' }, isVerified: true, timeAgo: '2 hours ago',
    content: 'Final examination schedule for Semester 2 has been published. Please check your academic portal for detailed timetable and room assignments. Good luck everyone!',
    image: '/assets/images/teaching.jpg',
    tags: [{ label: 'Official', color: 'badge-info', emoji: 'ðŸ“¢' }, { label: 'Academic', color: 'badge-secondary', emoji: 'ðŸŽ“' }],
    likes: 42, comments: 8, shares: 0, isLiked: true,
  },
  {
    id: '2', author: { initials: 'SA', name: 'Student Affairs Office', role: 'Official', color: 'from-warning to-warning-dark/80' }, isVerified: true, timeAgo: '5 hours ago',
    content: 'Annual University Sports Day registration is now open! All students are encouraged to participate. Events include football, basketball, badminton, and track. Deadline: August 5th.',
    image: '/assets/images/mainCU.jpg',
    tags: [{ label: 'Event', color: 'badge-success', emoji: 'ðŸŽ‰' }],
    likes: 128, comments: 24, shares: 0,
  },
  {
    id: '3', author: { initials: 'FN', name: 'Finance Office', role: 'Official', color: 'from-success to-success-dark/80' }, isVerified: true, timeAgo: '1 day ago',
    content: 'Scholarship stipend for outstanding students will be distributed starting next Monday. Eligible students please prepare your bank account details and submit via the Finance portal.',
    image: '/assets/images/projectShow.jpg',
    tags: [{ label: 'Finance', color: 'badge-warning', emoji: 'ðŸ’°' }, { label: 'Official', color: 'badge-info', emoji: 'ðŸ“¢' }],
    likes: 89, comments: 15, shares: 12,
  },
];

export const MOCK_EVENTS: EventItemData[] = [
  { id: '1', day: '31', month: 'JUL', title: 'CS Department Meeting', description: 'Room 302 • 10:00 AM', action: 'Join' },
  { id: '2', day: '02', month: 'AUG', title: 'Project Defense Day', description: 'Main Hall • 9:00 AM', action: 'Join' },
  { id: '3', day: '05', month: 'AUG', title: 'Sports Day Registration Close', description: 'Online • 11:59 PM', action: 'Remind' },
  { id: '4', day: '10', month: 'AUG', title: 'Career Fair 2026', description: 'Campus Center • All Day', action: 'RSVP' },
];

export const MOCK_MESSAGES: MessageData[] = [
  { id: '1', user: { initials: 'ZL', name: 'Zayar Lin', role: '', color: 'from-warning to-error' }, preview: 'Hey, did you finish the DB assignment?', time: '2m ago', unread: true },
  { id: '2', user: { initials: 'SL', name: 'Su Lae Bo Bo', role: '', color: 'from-success to-info' }, preview: 'Meeting at 3 PM today', time: '1h ago', unread: true },
  { id: '3', user: { initials: 'KP', name: 'Khaing Zin Phyo', role: '', color: 'from-purple-500 to-pink-500' }, preview: 'Thanks for the notes! Really helpful.', time: '3h ago' },
  { id: '4', user: { initials: 'DR', name: 'Dr. Aung Myint', role: '', color: 'from-primary to-secondary' }, preview: 'Your project proposal looks great!', time: 'Yesterday' },
];

export const MOCK_INBOX: InboxItemData[] = [
  { id: '1', sender: { initials: 'UA', name: 'University Admin', role: '', color: 'from-primary to-primary-dark/80' }, subject: 'Exam Schedule Released', preview: 'The final examination schedule for the semester has been published...', time: '10m ago', unread: true, starred: true },
  { id: '2', sender: { initials: 'PA', name: 'Prof. Anderson', role: '', color: 'from-purple-500 to-pink-500' }, subject: 'Project Feedback', preview: 'Great work on your midterm project! Here are some suggestions for improvement...', time: '1h ago', unread: true },
  { id: '3', sender: { initials: 'LS', name: 'Library Services', role: '', color: 'from-success to-info' }, subject: 'Book Due Reminder', preview: 'This is a reminder that the following books are due for return...', time: '3h ago' },
  { id: '4', sender: { initials: 'SU', name: 'Student Union', role: '', color: 'from-warning to-warning-dark/80' }, subject: 'Upcoming Events This Week', preview: 'Check out the exciting events we have planned for this week...', time: '5h ago', unread: true, starred: true },
  { id: '5', sender: { initials: 'CS', name: 'Career Services', role: '', color: 'from-primary to-secondary' }, subject: 'Internship Opportunity', preview: 'We have an exciting internship opportunity at Google for CS students...', time: '1d ago' },
  { id: '6', sender: { initials: 'SC', name: 'Scholarship Committee', role: '', color: 'from-error to-error-dark/80' }, subject: 'Application Status Update', preview: 'Your scholarship application has been received and is under review...', time: '2d ago' },
];




export const MOCK_EMAILS: Email[] = [
  { id: 1, from: 'University Admin', subject: 'Exam Schedule Released', preview: 'The final examination schedule for Semester 2 has been published...', body: 'Dear Student,\n\nThe final examination schedule for Semester 2 (2025-2026) has been published on the academic portal. Please log in to check your personalized exam timetable, including dates, venues, and seat numbers.\n\nBest regards,\nUniversity Administration', time: '10m ago', read: false, starred: true, avatar: 'UA', role: 'Administration' },
  { id: 2, from: 'Prof. Anderson', subject: 'Project Feedback', preview: 'Great work on your midterm project! Here are some suggestions for improvement...', body: 'Hi everyone,\n\nI have reviewed your midterm project submissions. Overall, the quality was impressive. For those who scored below 70%, I have attached detailed feedback. Please schedule a meeting with me to discuss improvements before the final submission.\n\nBest,\nProf. Anderson', time: '1h ago', read: false, starred: false, avatar: 'PA', role: 'Professor' },
  { id: 3, from: 'Library Services', subject: 'Book Due Reminder', preview: 'This is a reminder that the following books are due for return...', body: 'Dear Student,\n\nThis is a reminder that you have 3 books due for return within the next 5 days. Please return or renew them to avoid late fees.\n\n- Introduction to Algorithms (due Jul 25)\n- Database Systems Concepts (due Jul 28)\n- Artificial Intelligence: A Modern Approach (due Aug 1)\n\nThank you,\nLibrary Services', time: '3h ago', read: true, starred: false, avatar: 'LS', role: 'Library' },
  { id: 4, from: 'Student Union', subject: 'Upcoming Events This Week', preview: 'Check out the exciting events we have planned for this week...', body: 'Hello everyone!\n\nWe have an exciting week ahead! Here are the events:\n\nWednesday: Movie Night - Main Auditorium at 6 PM\nFriday: Talent Show Registration Deadline\nSaturday: Sports Tournament - University Grounds\n\nStay tuned for more updates!\n\nStudent Union', time: '5h ago', read: false, starred: true, avatar: 'SU', role: 'Student Union' },
  { id: 5, from: 'Career Services', subject: 'Internship Opportunity', preview: 'We have an exciting internship opportunity at Google for CS students...', body: 'Dear Students,\n\nGoogle is now accepting internship applications for Summer 2026! Positions available in Software Engineering, Data Science, and Product Management.\n\nRequirements:\n- Currently enrolled in CS, IT, or related field\n- Minimum GPA: 3.0\n- Strong programming skills\n\nApply by August 15th.\n\nCareer Services', time: '1d ago', read: true, starred: false, avatar: 'CS', role: 'Career Services' },
  { id: 6, from: 'Scholarship Committee', subject: 'Application Status Update', preview: 'Your scholarship application has been received and is under review...', body: 'Dear Applicant,\n\nYour scholarship application for the Academic Excellence Award (2026-2027) has been received and is currently under review. We will notify you of the decision within 2-3 weeks.\n\nApplication ID: SCH-2026-0842\n\nBest regards,\nScholarship Committee', time: '2d ago', read: true, starred: false, avatar: 'SC', role: 'Committee' },
  { id: 7, from: 'IT Support', subject: 'System Maintenance Tonight', preview: 'The university portal will be down for maintenance from 2-4 AM...', body: 'Dear Users,\n\nScheduled maintenance will be performed on the university portal tonight from 2:00 AM to 4:00 AM. During this time, the portal and related services will be unavailable.\n\nWe apologize for any inconvenience.\n\nIT Support Team', time: '3d ago', read: true, starred: false, avatar: 'IT', role: 'IT Support' },
  { id: 8, from: 'Registrar Office', subject: 'Graduation Application Deadline', preview: 'Final reminder: Graduation applications must be submitted by July 30...', body: 'Dear Graduating Students,\n\nThis is a final reminder that graduation applications for the 2026 ceremony must be submitted by July 30, 2026. Late submissions will not be accepted.\n\nPlease ensure all academic requirements are fulfilled before applying.\n\nRegistrar Office', time: '4d ago', read: true, starred: false, avatar: 'RO', role: 'Registrar' },
];

export const MOCK_EXAM_RESULTS: ExamResultItem[] = [
  { id: 1, studentName: 'Aung Kaung Khant', regNumber: 'UCS-1001', programme: 'B.Sc. Computer Science', semester: 'Semester 2', session: '2025-2026', gpa: '3.85', pdfUrl: '#', status: 'ready' },
  { id: 2, studentName: 'Su Mon Aung', regNumber: 'UCS-1002', programme: 'B.Sc. Computer Science', semester: 'Semester 2', session: '2025-2026', gpa: '3.72', pdfUrl: '#', status: 'ready' },
  { id: 3, studentName: 'Zaw Myint Oo', regNumber: 'UCS-1003', programme: 'B.Sc. Software Engineering', semester: 'Semester 2', session: '2025-2026', gpa: '3.45', pdfUrl: '#', status: 'ready' },
  { id: 4, studentName: 'Hla Hla Win', regNumber: 'UCS-1004', programme: 'B.Sc. Computer Science', semester: 'Semester 2', session: '2025-2026', gpa: '3.91', pdfUrl: '#', status: 'ready' },
  { id: 5, studentName: 'Kyaw Swar Hein', regNumber: 'UCS-1005', programme: 'B.Sc. Information Technology', semester: 'Semester 2', session: '2025-2026', gpa: '3.22', pdfUrl: '#', status: 'pending' },
];

export const MOCK_CHAT_CONTACTS: Contact[] = [
  { id: 1, name: 'Zayar Lin', avatar: 'ZL', role: 'Student', online: true, lastSeen: 'Online', unread: 2 },
  { id: 2, name: 'Su Lae Bo Bo', avatar: 'SL', role: 'Student', online: true, lastSeen: 'Online', unread: 1 },
  { id: 3, name: 'Khaing Zin Phyo', avatar: 'KP', role: 'Student', online: false, lastSeen: '2h ago', unread: 0 },
  { id: 4, name: 'Dr. Aung Myint', avatar: 'DR', role: 'Professor', online: false, lastSeen: '1h ago', unread: 0 },
  { id: 5, name: 'Mg Kyaw', avatar: 'MK', role: 'Student', online: true, lastSeen: 'Online', unread: 3 },
  { id: 6, name: 'Thiri Htet', avatar: 'TH', role: 'Student', online: false, lastSeen: 'Yesterday', unread: 0 },
];

export const MOCK_CHAT_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, sender: 'other', text: 'Hey, did you finish the DB assignment?', time: '10:32 AM' },
    { id: 2, sender: 'me', text: 'Almost done! Just working on the last query.', time: '10:33 AM' },
    { id: 3, sender: 'other', text: 'Nice! Can you help me with the JOIN part?', time: '10:34 AM' },
    { id: 4, sender: 'me', text: 'Sure, I will send you my notes.', time: '10:35 AM' },
    { id: 5, sender: 'other', text: 'Thanks a lot!', time: '10:36 AM' },
  ],
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'like', message: 'Sarah Chen liked your post', time: '5m ago', read: false },
  { id: 2, type: 'comment', message: 'Prof. Anderson commented on your project', time: '15m ago', read: false },
  { id: 3, type: 'follow', message: 'Mg Kyaw started following you', time: '1h ago', read: false },
  { id: 4, type: 'event', message: 'Career Fair starts in 2 days', time: '2h ago', read: true },
  { id: 5, type: 'like', message: 'Thiri Htet liked your photo', time: '4h ago', read: false },
  { id: 6, type: 'comment', message: 'Su Lae Bo Bo replied to your thread', time: '5h ago', read: true },
  { id: 7, type: 'event', message: 'Sports Day registration closes tomorrow', time: '6h ago', read: true },
  { id: 8, type: 'like', message: 'Khaing Zin Phyo liked your comment', time: '1d ago', read: true },
];

export const MOCK_USERS = [
  { initials: "ZL", name: "Zayar Lin", color: "from-warning to-error" },
  { initials: "SL", name: "Su Lae Bo Bo", color: "from-success to-info" },
  { initials: "KP", name: "Khaing Zin Phyo", color: "from-purple-500 to-pink-500" },
  { initials: "DR", name: "Dr. Aung Myint", color: "from-primary to-secondary" },
  { initials: "SA", name: "Student Affairs", color: "from-warning to-warning-dark/80" },
  { initials: "FN", name: "Finance Office", color: "from-success to-success-dark/80" },
  { initials: "RE", name: "Rector's Office", color: "from-error to-error-dark/80" },
  { initials: "IT", name: "IT Support", color: "from-warning to-warning-dark/80" },
  { initials: "MK", name: "Mg Kyaw", color: "from-primary to-primary-dark/80" },
  { initials: "TH", name: "Thiri Htet", color: "from-pink-500 to-rose-500" },
  { initials: "AK", name: "Aung Kaung", color: "from-cyan-500 to-blue-500" },
  { initials: "PY", name: "Phyu Phyu", color: "from-emerald-500 to-teal-500" },
  { initials: "SH", name: "San Htoo", color: "from-violet-500 to-purple-500" },
];
