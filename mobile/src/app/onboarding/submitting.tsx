/**
 * Submitting screen — calls the onboard API, shows loading and success/error state.
 * On success: persists studentId and navigates to profile.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import Button from '../../components/Button';
import { onboardStudent, persistStudentId } from '../../api/client';

type Phase = 'loading' | 'success' | 'error';

export default function SubmittingScreen() {
  const { state, reset } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [studentId, setStudentId] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    submit();
  }, []);

  useEffect(() => {
    if (phase !== 'loading') {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [phase]);

  async function submit() {
    try {
      // Generate a studentId from the email prefix + timestamp for uniqueness
      const id = `stu_${state.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase()}_${Date.now().toString(36)}`;

      const payload = {
        studentId: id,
        name: state.name,
        email: state.email,
        rollNumber: state.rollNumber,
        degree: state.degree,
        branch: state.branch,
        department: state.department || state.branch,
        institution: state.institution,
        graduationYear: state.graduationYear,
        currentSemester: state.currentSemester,
        cgpa: state.cgpa || undefined,
        interests: state.interests,
        careerInterests: state.careerInterests,
        preferredLocations: state.preferredLocations,
        workArrangement: state.workArrangement,
        roleLevelPreference: state.roleLevelPreference,
        completedCourses: state.completedCourses.map((c) => ({
          courseId: c.courseId,
          grade: c.grade,
          completedSemester: c.completedSemester,
          status: c.status,
        })),
        skills: state.skills.map((s) => ({
          skillId: s.skillId,
          level: s.level,
          competenceType: s.competenceType,
          evidenceDescription: s.evidenceDescription,
        })),
        customProjects: state.customProjects.map((p) => ({
          title: p.title,
          description: p.description,
          technologiesUsed: p.technologiesUsed,
          skillsDemonstrated: p.skillsDemonstrated,
          role: p.role,
          link: p.link,
        })),
        certifications: state.certifications,
      };

      await onboardStudent(payload);
      await persistStudentId(id);
      setStudentId(id);
      setPhase('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please check your connection.');
      setPhase('error');
    }
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
          <Text style={styles.loadingTitle}>Setting up your profile…</Text>
          <Text style={styles.loadingHint}>Processing courses, skills, and career preferences</Text>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <Text key={i} style={styles.stepItem}>⏳ {s}</Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
          <View style={styles.successRing}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Profile Created!</Text>
          <Text style={styles.successSub}>
            Your campus career profile is ready. Skill mappings from your courses have been applied.
          </Text>
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>Your Student ID</Text>
            <Text style={styles.idValue}>{studentId}</Text>
          </View>
          <Button
            label="View My Profile →"
            onPress={() => {
              reset();
              router.replace('/profile');
            }}
            size="lg"
            style={styles.profileBtn}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Error state
  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Submission Failed</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <View style={styles.errorBtns}>
          <Button
            label="Try Again"
            onPress={() => {
              setPhase('loading');
              setErrorMsg('');
              submit();
            }}
            size="md"
            style={{ flex: 1 }}
          />
          <Button
            label="Go Back"
            variant="ghost"
            onPress={() => router.back()}
            size="md"
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const STEPS = [
  'Syncing profile to MongoDB',
  'Building skill dependency graph in Neo4j',
  'Caching profile in Redis',
  'Recording activity in Cassandra',
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  spinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.brand.from,
    borderTopColor: 'transparent',
    marginBottom: Spacing.xl,
  },
  loadingTitle: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.text.primary, textAlign: 'center', marginBottom: Spacing.sm },
  loadingHint: { fontSize: Typography.sizes.base, color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing['2xl'] },
  steps: { gap: Spacing.sm, alignSelf: 'stretch' },
  stepItem: { color: Colors.text.muted, fontSize: Typography.sizes.sm },

  successRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 2,
    borderColor: Colors.accent.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  successSub: { fontSize: Typography.sizes.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  idBox: { backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.base, width: '100%', marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border.default },
  idLabel: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: '600', marginBottom: Spacing.xs },
  idValue: { color: Colors.brand.to, fontSize: Typography.sizes.sm, fontWeight: '700', fontFamily: 'monospace' },
  profileBtn: { width: '100%' },

  errorEmoji: { fontSize: 60, marginBottom: Spacing.xl },
  errorTitle: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.accent.rose, marginBottom: Spacing.sm },
  errorMsg: { fontSize: Typography.sizes.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing['2xl'] },
  errorBtns: { flexDirection: 'row', gap: Spacing.base, width: '100%' },
});
