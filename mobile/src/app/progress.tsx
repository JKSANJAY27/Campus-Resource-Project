import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import {
  getStudentSummary,
  getPersistedStudentId,
  getActiveGoal,
  getCareerToLearningPath,
  ActiveCareerGoal,
} from '../api/client';
import Header from '../components/Header';
import Card from '../components/Card';
import MetricBadge from '../components/MetricBadge';
import QuickNavModal from '../components/QuickNavModal';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import type { ProfileSummaryResponse, CareerToLearningPath } from '../types';

export default function LearningProgressScreen() {
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [activeGoal, setActiveGoal] = useState<ActiveCareerGoal | null>(null);
  const [pathway, setPathway] = useState<CareerToLearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadProgressData = useCallback(async () => {
    try {
      const studentId = await getPersistedStudentId();
      if (!studentId) {
        router.replace('/');
        return;
      }

      const [sum, goal] = await Promise.all([
        getStudentSummary(studentId),
        getActiveGoal(),
      ]);

      setProfile(sum);
      setActiveGoal(goal);

      const targetRoleId = goal?.roleId || 'role_backend_developer';
      const pathData = await getCareerToLearningPath(targetRoleId, studentId).catch(() => null);
      if (pathData) setPathway(pathData);

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Learning Progress" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Tracking milestone completion & competence progression…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Learning Progress" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <ErrorState message={error} onRetry={loadProgressData} />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  const breakdown = profile?.competenceBreakdown;
  const provenCount = breakdown?.projectDemonstrated?.count || 0;
  const courseCount = breakdown?.courseExposure?.count || 0;
  const selfCount = breakdown?.selfReported?.count || 0;
  const totalCount = provenCount + courseCount + selfCount || 1;

  const provenPct = Math.round((provenCount / totalCount) * 100);
  const coursePct = Math.round((courseCount / totalCount) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Learning Progress"
        subtitle="Skill Mastery & Milestone Tracker"
        showBack
        rightAction={{
          icon: '🎯',
          onPress: () => router.push('/(tabs)/discovery'),
          accessibilityLabel: 'Change goal',
        }}
        onOpenNav={() => setQuickNavVisible(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.from}
          />
        }
      >
        {/* Active Target Career Goal */}
        <Card elevated style={styles.goalCard} accentBorder={Colors.brand.from}>
          <View style={styles.goalHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalEyebrow}>CURRENT TARGET GOAL</Text>
              <Text style={styles.goalTitle}>
                {activeGoal?.roleTitle || pathway?.roleTitle || 'Backend Developer'}
              </Text>
            </View>
            <MetricBadge
              label="Match"
              scoreValue={pathway?.compatibilityScore || 70}
              variant="score"
            />
          </View>

          <Text style={styles.goalDesc}>
            {pathway?.roleSummary || 'Engineering scalable backend APIs, database management, and cloud microservices.'}
          </Text>

          {/* Goal Milestone Bar */}
          <View style={styles.goalProgressContainer}>
            <View style={styles.goalProgressHeader}>
              <Text style={styles.progressLabel}>Role Readiness</Text>
              <Text style={styles.progressPct}>
                {pathway ? `${pathway.matchingSkills.length} of ${pathway.matchingSkills.length + pathway.skillGapsCount} skills verified` : '65% Complete'}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${pathway?.compatibilityScore || 65}%` },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.push('/(tabs)/learning')}
          >
            <Text style={styles.continueBtnText}>Open Sequential Roadmap →</Text>
          </TouchableOpacity>
        </Card>

        {/* Skill Evidence Quality Breakdown */}
        <Card style={styles.evidenceCard}>
          <Text style={styles.cardHeading}>Evidence Quality Distribution</Text>
          <Text style={styles.subtext}>
            Employers require verified project code rather than just academic classroom attendance:
          </Text>

          {/* Horizontal multi-color bar */}
          <View style={styles.multiBar}>
            <View style={[styles.multiSegment, { width: `${provenPct}%`, backgroundColor: '#10B981' }]} />
            <View style={[styles.multiSegment, { width: `${coursePct}%`, backgroundColor: '#A78BFA' }]} />
            <View style={[styles.multiSegment, { flex: 1, backgroundColor: '#F59E0B' }]} />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Proven Project ({provenCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.legendText}>Academic Only ({courseCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Self-Reported ({selfCount})</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 Tip: Building 1 hands-on GitHub project demonstrating skills from courses will elevate your compatibility score from academic exposure to proven commercial tier.
            </Text>
          </View>
        </Card>

        {/* Semester Milestones */}
        <Card style={styles.milestoneCard}>
          <Text style={styles.cardHeading}>Academic & Project Milestones</Text>

          <View style={styles.milestoneRow}>
            <View style={[styles.milestoneIcon, styles.milestoneDone]}>
              <Text style={styles.milestoneCheck}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>Foundational Coursework</Text>
              <Text style={styles.milestoneSub}>
                Completed {profile?.completedCoursesCount || 0} university courses across computer science.
              </Text>
            </View>
          </View>

          <View style={styles.milestoneRow}>
            <View style={[styles.milestoneIcon, (profile?.customProjects?.length || 0) > 0 ? styles.milestoneDone : styles.milestonePending]}>
              <Text style={styles.milestoneCheck}>
                {(profile?.customProjects?.length || 0) > 0 ? '✓' : '○'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>Hands-on Portfolio Projects</Text>
              <Text style={styles.milestoneSub}>
                {profile?.customProjects?.length || 0} demonstrated projects on profile.
              </Text>
            </View>
          </View>

          <View style={styles.milestoneRow}>
            <View style={[styles.milestoneIcon, (profile?.certifications?.length || 0) > 0 ? styles.milestoneDone : styles.milestonePending]}>
              <Text style={styles.milestoneCheck}>
                {(profile?.certifications?.length || 0) > 0 ? '✓' : '○'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>Industry Certifications</Text>
              <Text style={styles.milestoneSub}>
                {profile?.certifications?.length || 0} verified credentials added.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <QuickNavModal
        visible={quickNavVisible}
        onClose={() => setQuickNavVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
  goalCard: {
    padding: Spacing.base,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  goalEyebrow: {
    color: Colors.brand.to,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  goalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
    marginTop: 2,
  },
  goalDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.sm,
  },
  goalProgressContainer: {
    marginVertical: Spacing.sm,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  progressPct: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.bg.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.from,
    borderRadius: 4,
  },
  continueBtn: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  continueBtnText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  evidenceCard: {
    padding: Spacing.base,
  },
  cardHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtext: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  multiBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.bg.secondary,
    marginBottom: Spacing.md,
  },
  multiSegment: {
    height: '100%',
  },
  legendRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  tipBox: {
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#22D3EE',
  },
  tipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  milestoneCard: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  milestoneIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  milestoneDone: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  milestonePending: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  milestoneCheck: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  milestoneTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
  milestoneSub: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    lineHeight: 16,
  },
});
