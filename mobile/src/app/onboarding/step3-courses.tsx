/**
 * Onboarding Step 3 — Course selection
 * Searchable catalogue from the backend.
 * Each course can be marked completed/in-progress/planned with a grade.
 * Selecting a completed course contributes course_exposure skills (server-side).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import SearchablePicker, { PickerItem } from '../../components/SearchablePicker';
import Input from '../../components/Input';
import { getCourses } from '../../api/client';
import type { StudentCompletedCourse, CourseStatus } from '../../types';

const TOTAL_STEPS = 7;
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F', 'In Progress'];

export default function Step3Courses() {
  const { state, update } = useOnboarding();
  const [courses, setCourses] = useState<StudentCompletedCourse[]>(state.completedCourses);
  const [pickerVisible, setPickerVisible] = useState(false);
  // Grade/status editor modal
  const [editCourse, setEditCourse] = useState<StudentCompletedCourse | null>(null);

  // Load from backend catalogue
  const loadCourses = useCallback(async (search: string): Promise<PickerItem[]> => {
    try {
      const res = await getCourses({ search, limit: 40 });
      return (res.courses || []).map((c: any) => ({
        id: c.courseId || c._id,
        title: `${c.code} — ${c.title}`,
        subtitle: c.department,
        meta: c.credits ? `${c.credits} cr` : undefined,
      }));
    } catch {
      // Fallback sample data when backend is offline
      return SAMPLE_COURSES.filter(
        (c) =>
          !search ||
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.subtitle?.toLowerCase().includes(search.toLowerCase())
      );
    }
  }, []);

  function handleSelectCourse(item: PickerItem) {
    if (courses.find((c) => c.courseId === item.id)) return; // already added
    const [code, ...rest] = item.title.split(' — ');
    const newCourse: StudentCompletedCourse = {
      courseId: item.id,
      code,
      title: rest.join(' — '),
      department: item.subtitle || '',
      credits: 3,
      grade: 'A',
      completedSemester: state.currentSemester,
      status: 'completed',
    };
    setCourses((prev) => [...prev, newCourse]);
    setEditCourse(newCourse);
  }

  function updateCourse(courseId: string, changes: Partial<StudentCompletedCourse>) {
    setCourses((prev) =>
      prev.map((c) => (c.courseId === courseId ? { ...c, ...changes } : c))
    );
  }

  function removeCourse(courseId: string) {
    setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
  }

  function handleNext() {
    update({ completedCourses: courses });
    router.push('/onboarding/step4-skills');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepProgress current={3} total={TOTAL_STEPS} label="Courses" />

        <Text style={styles.title}>Courses you've taken</Text>
        <Text style={styles.subtitle}>
          Search and add courses from the catalogue. Completed courses contribute skill exposure evidence automatically — but don't imply mastery.
        </Text>

        <Button
          label="+ Add Course from Catalogue"
          variant="secondary"
          onPress={() => setPickerVisible(true)}
          style={styles.addBtn}
        />

        {courses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyText}>No courses added yet</Text>
            <Text style={styles.emptyHint}>You can also skip and add later</Text>
          </View>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <TouchableOpacity
                key={course.courseId}
                style={styles.courseCard}
                onPress={() => setEditCourse(course)}
                activeOpacity={0.8}
              >
                <View style={styles.courseHeader}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{course.code}</Text>
                    <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                    <Text style={styles.courseDept} numberOfLines={1}>{course.department}</Text>
                  </View>
                  <View style={styles.courseBadge}>
                    <View style={[styles.statusDot, course.status === 'completed' ? styles.dotComplete : course.status === 'in_progress' ? styles.dotProgress : styles.dotPlanned]} />
                    <Text style={styles.courseGrade}>{course.grade}</Text>
                  </View>
                </View>
                <View style={styles.courseFooter}>
                  <Tag label={course.status.replace('_', ' ')} scheme="course" />
                  <Tag label={`Sem ${course.completedSemester}`} scheme="neutral" />
                  <TouchableOpacity onPress={() => removeCourse(course.courseId)} style={styles.removeBtn}>
                    <Text style={styles.removeIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.btnRow}>
          <Button label="← Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.backBtn} />
          <Button label="Continue →" onPress={handleNext} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>

      {/* Course catalogue picker */}
      <SearchablePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectCourse}
        selectedIds={courses.map((c) => c.courseId)}
        title="Course Catalogue"
        placeholder="Search by code or name…"
        loadItems={loadCourses}
        multiSelect
      />

      {/* Grade / status editor modal */}
      {editCourse ? (
        <CourseEditModal
          course={editCourse}
          onSave={(changes) => {
            updateCourse(editCourse.courseId, changes);
            setEditCourse(null);
          }}
          onClose={() => setEditCourse(null)}
          maxSemester={state.currentSemester}
        />
      ) : null}
    </SafeAreaView>
  );
}

function CourseEditModal({
  course,
  onSave,
  onClose,
  maxSemester,
}: {
  course: StudentCompletedCourse;
  onSave: (changes: Partial<StudentCompletedCourse>) => void;
  onClose: () => void;
  maxSemester: number;
}) {
  const [grade, setGrade] = useState(course.grade);
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [semester, setSemester] = useState(course.completedSemester);

  const statuses: CourseStatus[] = ['completed', 'in_progress', 'planned'];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{course.code}</Text>
          <Text style={modal.sub}>{course.title}</Text>

          <Text style={modal.fieldLabel}>Status</Text>
          <View style={modal.chipRow}>
            {statuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[modal.chip, status === s && modal.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[modal.chipText, status === s && modal.chipTextActive]}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.fieldLabel}>Grade</Text>
          <View style={modal.chipRow}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[modal.chip, grade === g && modal.chipActive]}
                onPress={() => setGrade(g)}
              >
                <Text style={[modal.chipText, grade === g && modal.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.fieldLabel}>Semester Completed</Text>
          <View style={modal.chipRow}>
            {Array.from({ length: Math.max(maxSemester, 8) }, (_, i) => i + 1).map((s) => (
              <TouchableOpacity
                key={s}
                style={[modal.chip, semester === s && modal.chipActive]}
                onPress={() => setSemester(s)}
              >
                <Text style={[modal.chipText, semester === s && modal.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modal.btnRow}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label="Save"
              onPress={() => onSave({ grade, status, completedSemester: semester })}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Fallback sample catalogue (used when backend is offline)
const SAMPLE_COURSES: PickerItem[] = [
  { id: 'c_ds', title: 'CS201 — Data Structures', subtitle: 'Computer Science', meta: '4 cr' },
  { id: 'c_algo', title: 'CS301 — Algorithms', subtitle: 'Computer Science', meta: '4 cr' },
  { id: 'c_dbms', title: 'CS401 — Database Management Systems', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_os', title: 'CS402 — Operating Systems', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_cn', title: 'CS403 — Computer Networks', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_ml', title: 'CS501 — Machine Learning', subtitle: 'Computer Science', meta: '4 cr' },
  { id: 'c_web', title: 'CS502 — Web Development', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_se', title: 'CS503 — Software Engineering', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_ai', title: 'CS601 — Artificial Intelligence', subtitle: 'Computer Science', meta: '4 cr' },
  { id: 'c_cv', title: 'CS602 — Computer Vision', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_dsa', title: 'CS701 — Advanced Data Structures', subtitle: 'Computer Science', meta: '3 cr' },
  { id: 'c_math1', title: 'MA101 — Engineering Mathematics I', subtitle: 'Mathematics', meta: '4 cr' },
  { id: 'c_math2', title: 'MA201 — Engineering Mathematics II', subtitle: 'Mathematics', meta: '4 cr' },
  { id: 'c_prob', title: 'MA301 — Probability & Statistics', subtitle: 'Mathematics', meta: '3 cr' },
  { id: 'c_phy', title: 'PH101 — Engineering Physics', subtitle: 'Physics', meta: '3 cr' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xl },
  addBtn: { marginBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.sizes.md, fontWeight: '600' },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: Spacing.xs },
  courseList: { gap: Spacing.md, marginBottom: Spacing.xl },
  courseCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadow.card,
  },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  courseInfo: { flex: 1 },
  courseCode: { color: Colors.brand.to, fontSize: Typography.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  courseTitle: { color: Colors.text.primary, fontSize: Typography.sizes.base, fontWeight: '600', marginTop: 2 },
  courseDept: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: 2 },
  courseBadge: { alignItems: 'flex-end', gap: Spacing.xs },
  courseGrade: { color: Colors.text.primary, fontWeight: '700', fontSize: Typography.sizes.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotComplete: { backgroundColor: Colors.accent.green },
  dotProgress: { backgroundColor: Colors.accent.amber },
  dotPlanned: { backgroundColor: Colors.text.muted },
  courseFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  removeBtn: { marginLeft: 'auto' },
  removeIcon: { fontSize: 16 },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.base },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.bg.overlay },
  sheet: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginBottom: Spacing.base },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.base },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default, backgroundColor: Colors.bg.card },
  chipActive: { borderColor: Colors.brand.from, backgroundColor: 'rgba(99,102,241,0.15)' },
  chipText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  chipTextActive: { color: Colors.brand.to, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.xl },
});
