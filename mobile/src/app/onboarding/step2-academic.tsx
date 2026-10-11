/**
 * Onboarding Step 2 — Academic details
 * Collects: degree, branch, department, institution, graduation year,
 * current semester, CGPA
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Input from '../../components/Input';
import Button from '../../components/Button';

const TOTAL_STEPS = 7;

const DEGREES = ['B.Tech', 'B.E.', 'M.Tech', 'M.E.', 'B.Sc', 'M.Sc', 'MCA', 'BCA', 'MBA', 'Ph.D'];
const COMMON_BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Artificial Intelligence & ML',
  'Data Science',
];

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i - 2);
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Step2Academic() {
  const { state, update } = useOnboarding();
  const [degree, setDegree] = useState(state.degree);
  const [branch, setBranch] = useState(state.branch);
  const [department, setDepartment] = useState(state.department);
  const [institution, setInstitution] = useState(state.institution);
  const [graduationYear, setGraduationYear] = useState(state.graduationYear);
  const [currentSemester, setCurrentSemester] = useState(state.currentSemester);
  const [cgpa, setCgpa] = useState(state.cgpa > 0 ? String(state.cgpa) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!degree) e.degree = 'Please select a degree';
    if (!branch.trim()) e.branch = 'Branch is required';
    if (!institution.trim()) e.institution = 'Institution name is required';
    if (cgpa && (isNaN(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 10))
      e.cgpa = 'CGPA must be between 0 and 10';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    update({
      degree,
      branch: branch.trim(),
      department: department.trim() || branch.trim(),
      institution: institution.trim(),
      graduationYear,
      currentSemester,
      cgpa: cgpa ? Number(cgpa) : 0,
    });
    router.push('/onboarding/step3-courses');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StepProgress current={2} total={TOTAL_STEPS} label="Academic Details" />

        <Text style={styles.title}>Academic background</Text>
        <Text style={styles.subtitle}>
          Your degree and institution help us tailor course and role recommendations.
        </Text>

        {/* Degree picker */}
        <Text style={styles.fieldLabel}>
          Degree <Text style={styles.req}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {DEGREES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, degree === d && styles.chipActive]}
              onPress={() => setDegree(d)}
            >
              <Text style={[styles.chipText, degree === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.degree ? <Text style={styles.errText}>{errors.degree}</Text> : null}

        {/* Branch picker */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.base }]}>
          Branch / Specialization <Text style={styles.req}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {COMMON_BRANCHES.map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.chip, branch === b && styles.chipActive]}
              onPress={() => setBranch(b)}
            >
              <Text style={[styles.chipText, branch === b && styles.chipTextActive]} numberOfLines={1}>
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Input
          placeholder="Or type your branch…"
          value={branch}
          onChangeText={setBranch}
          error={errors.branch}
          containerStyle={{ marginTop: Spacing.sm }}
        />

        <Input
          label="Department (if different from branch)"
          placeholder="e.g. Dept. of CSE"
          value={department}
          onChangeText={setDepartment}
          hint="Leave blank to use branch name"
        />

        <Input
          label="Institution / University"
          placeholder="e.g. NIT Srinagar"
          value={institution}
          onChangeText={setInstitution}
          error={errors.institution}
          required
        />

        {/* Graduation Year */}
        <Text style={styles.fieldLabel}>
          Expected Graduation Year <Text style={styles.req}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {GRAD_YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.chip, graduationYear === y && styles.chipActive]}
              onPress={() => setGraduationYear(y)}
            >
              <Text style={[styles.chipText, graduationYear === y && styles.chipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Current Semester */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.base }]}>
          Current Semester <Text style={styles.req}>*</Text>
        </Text>
        <View style={styles.semRow}>
          {SEMESTERS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.semBtn, currentSemester === s && styles.semBtnActive]}
              onPress={() => setCurrentSemester(s)}
            >
              <Text style={[styles.semText, currentSemester === s && styles.semTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="CGPA / GPA (optional)"
          placeholder="e.g. 8.7"
          value={cgpa}
          onChangeText={setCgpa}
          keyboardType="decimal-pad"
          error={errors.cgpa}
          hint="Out of 10. Leave blank to fill later."
        />

        <View style={styles.btnRow}>
          <Button
            label="← Back"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            style={styles.backBtn}
          />
          <Button label="Continue →" onPress={handleNext} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing['2xl'] },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm, letterSpacing: 0.3 },
  req: { color: Colors.accent.rose },
  errText: { color: Colors.accent.rose, fontSize: Typography.sizes.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  chipScroll: { marginBottom: Spacing.sm },
  chipRow: { gap: Spacing.sm, paddingRight: Spacing.xl },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  chipActive: { borderColor: Colors.brand.from, backgroundColor: 'rgba(99,102,241,0.15)' },
  chipText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '500' },
  chipTextActive: { color: Colors.brand.to },
  semRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.base },
  semBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semBtnActive: { borderColor: Colors.brand.from, backgroundColor: 'rgba(99,102,241,0.15)' },
  semText: { color: Colors.text.secondary, fontWeight: '600', fontSize: Typography.sizes.base },
  semTextActive: { color: Colors.brand.to },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.base },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
