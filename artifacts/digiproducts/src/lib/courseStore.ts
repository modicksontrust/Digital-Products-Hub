/**
 * In-memory course store.
 * Provides persistence within the same browser session.
 * A future task will replace this with API-backed persistence.
 */

export interface CourseRecord {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  welcomeMessage: string;
  category: string;
  level: string;
  language: string;
  priceCents: number;
  isFree: boolean;
  slug: string;
  showOnBio: boolean;
  status: "draft" | "published" | "archived";
  // Info page
  salesHeadline: string;
  promoVideo: string;
  targetAudience: string;
  learningOutcomes: string[];
  courseDescription: string;
  // Certificate
  certificateEnabled: boolean;
  certTemplate: string;
  certBgColor: string;
  certAccentColor: string;
  certOrg: string;
  certSignature: string;
  certShowDate: boolean;
  certShowBranding: boolean;
  // Meta
  createdAt: string;
  updatedAt: string;
}

export interface ModuleRecord {
  id: string;
  title: string;
  expanded: boolean;
  lessons: LessonRecord[];
}

export interface LessonRecord {
  id: string;
  title: string;
  type: "video" | "text" | "download" | "quiz";
  duration: string;
  free: boolean;
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  progress: number;
  completed: boolean;
}

interface CourseStoreEntry {
  course: CourseRecord;
  modules: ModuleRecord[];
  students: StudentRecord[];
}

const store = new Map<string, CourseStoreEntry>();
// Ordered list of IDs for the index page
const order: string[] = [];

function generateId(): string {
  return `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCourse(data: Omit<CourseRecord, "id" | "createdAt" | "updatedAt" | "status">): CourseRecord {
  const id = generateId();
  const now = new Date().toISOString();
  const record: CourseRecord = { ...data, id, status: "draft", createdAt: now, updatedAt: now };
  store.set(id, { course: record, modules: [], students: [] });
  order.push(id);
  return record;
}

export function getCourse(id: string): CourseStoreEntry | undefined {
  return store.get(id);
}

export function updateCourse(id: string, data: Partial<CourseRecord>): CourseRecord | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  const updated: CourseRecord = { ...entry.course, ...data, updatedAt: new Date().toISOString() };
  store.set(id, { ...entry, course: updated });
  return updated;
}

export function updateModules(id: string, modules: ModuleRecord[]): void {
  const entry = store.get(id);
  if (!entry) return;
  store.set(id, { ...entry, modules });
}

export function addStudent(courseId: string, student: Omit<StudentRecord, "id" | "enrolledAt" | "progress" | "completed">): StudentRecord {
  const entry = store.get(courseId);
  const newStudent: StudentRecord = {
    id: `student-${Date.now().toString(36)}`,
    enrolledAt: new Date().toISOString(),
    progress: 0,
    completed: false,
    ...student,
  };
  if (entry) {
    store.set(courseId, { ...entry, students: [...entry.students, newStudent] });
  }
  return newStudent;
}

export function duplicateCourse(id: string): CourseRecord | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  const now = new Date().toISOString();
  const newId = generateId();
  const copy: CourseRecord = {
    ...entry.course,
    id: newId,
    title: `Copy of ${entry.course.title}`,
    slug: `${entry.course.slug}-copy-${newId.slice(-4)}`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  store.set(newId, { course: copy, modules: entry.modules.map(m => ({ ...m, id: `${m.id}-c` })), students: [] });
  order.push(newId);
  return copy;
}

export function archiveCourse(id: string): boolean {
  const entry = store.get(id);
  if (!entry) return false;
  store.set(id, { ...entry, course: { ...entry.course, status: "archived", updatedAt: new Date().toISOString() } });
  return true;
}

export function listCourses(): CourseRecord[] {
  return order.map((id) => store.get(id)?.course).filter((c): c is CourseRecord => !!c && c.status !== "archived");
}
