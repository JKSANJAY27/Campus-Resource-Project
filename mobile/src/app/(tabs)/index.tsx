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
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import {
  getStudentSummary,
  getPersistedStudentId,
  getCareerRecommendations,
  searchJobs,
  getActiveGoal,
  ActiveCareerGoal,
} from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState } from '../../components/StateFeedback';
import type { ProfileSummaryResponse, RoleRecommendation, NormalizedJob } from '../../types';

export default function HomeDashboardScreen() {
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [topRole, setTopRole] = useState<RoleRecommendation | null>(null);
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [activeGoal, setActiveGoal] = useState<ActiveCareerGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const studentId = await getPersistedStudentId();
      if (!studentId) {
        router.replace('/');
        return;
      }

      // Fetch student summary, recommendations, active goal, and jobs in parallel
      const [sumRes, recRes, jobRes, goal] = await Promise.all([
        getStudentSummary(studentId).catch(() => null),
        getCareerRecommendations(studentId).catch(() => null),
        searchJobs({ limit: 3 }).catch(() => ({ jobs: [] })),
        getActiveGoal(),
      ]);

      if (sumRes) {
        setProfile(sumRes);
      }
      if (recRes && recRes.recommendations && recRes.recommendations.length > 0) {
        setTopRole(recRes.recommendations[0]);
      }
      if (jobRes && jobRes.jobs) {
        setJobs(jobRes.jobs);
      }
      setActiveGoal(goal);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Home Dashboard" onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Loading your career intelligence dashboard…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Home Dashboard" onOpenNav={() => setQuickNavVisible(true)} />
        <ErrorState
          title="Could not connect to backend"
          message={error}
          onRetry={loadDashboardData}
        />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Campus Career"
        subtitle="Intelligent Career & Learning Platform"
        rightAction={{
          icon: '⚙️',
          onPress: () => router.push('/settings'),
          accessibilityLabel: 'Settings',
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
        {/* Welcome Student Greeting Card */}
        <Card elevated style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
              </Text>
            </View>
            <View style={styles.welcomeInfo}>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.studentName}>{profile?.name || 'Student Candidate'}</Text>
              <Text style={styles.metaText}>
                {profile?.department || 'Computer Science'} · Sem {profile?.currentSemester || 6}
                {profile?.cgpa ? ` · CGPA ${profile.cgpa}` : ''}
              </Text>
            </View>
          </View>

          {/* Competence Evidence Snapshot */}
          <View style={styles.evidenceSnapshot}>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#10B981' }]}>
                {profile?.competenceBreakdown?.projectDemonstrated?.count || 0}
              </Text>
              <Text style={styles.statLabel}>Proven (Projects)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#A78BFA' }]}>
                {profile?.competenceBreakdown?.courseExposure?.count || 0}
              </Text>
              <Text style={styles.statLabel}>Academic (Courses)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#F59E0B' }]}>
                {profile?.competenceBreakdown?.selfReported?.count || 0}
              </Text>
              <Text style={styles.statLabel}>Self-Reported</Text>
            </View>
          </View>
        </Card>

        {/* Top Recommended Career Role Spotlight */}
        {topRole && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🎯 Top Recommended Role</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discovery')}>
                <Text style={styles.seeAllText}>View All Roles →</Text>
              </TouchableOpacity>
            </View>

            <Card
              onPress={() => router.push(`/role/${topRole.roleId}`)}
              style={styles.spotlightCard}
              accentBorder={Colors.brand.from}
            >
              <View style={styles.roleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>{topRole.title}</Text>
                  <Text style={styles.roleCategory}>{topRole.category}</Text>
                </View>
                <MetricBadge
                  label="Match"
                  scoreValue={topRole.compatibilityScore}
                  variant="score"
                />
              </View>

              <Text style={styles.roleSummary} numberOfLines={2}>
                {topRole.summary}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>
                    {topRole.matchingSkills.length}
                  </Text>
                  <Text style={styles.metricSub}>Matched Skills</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#F43F5E' }]}>
                    {topRole.skillGapsCount}
                  </Text>
                  <Text style={styles.metricSub}>Skill Gaps</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>
                    {topRole.growthRate || '+22%'}
                  </Text>
                  <Text style={styles.metricSub}>Industry Growth</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.ctaPrompt}>Explore Requirements & Learning Path →</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Quick Navigation Hub to All 10 Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧭 Platform Quick Access</Text>
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/(tabs)/discovery')}
            >
              <Text style={styles.gridEmoji}>🎯</Text>
              <Text style={styles.gridTitle}>Career Discovery</Text>
              <Text style={styles.gridSub}>Roles & Compatibility</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/role/role_backend_developer')}
            >
              <Text style={styles.gridEmoji}>🗺️</Text>
              <Text style={styles.gridTitle}>Explore Role</Text>
              <Text style={styles.gridSub}>Detailed Requirements</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/(tabs)/learning')}
            >
              <Text style={styles.gridEmoji}>📚</Text>
              <Text style={styles.gridTitle}>Learning Paths</Text>
              <Text style={styles.gridSub}>Prerequisites & Sequence</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/(tabs)/jobs')}
            >
              <Text style={styles.gridEmoji}>💼</Text>
              <Text style={styles.gridTitle}>Live Jobs</Text>
              <Text style={styles.gridSub}>Browse & Filter Postings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/job-analysis')}
            >
              <Text style={styles.gridEmoji}>🔬</Text>
              <Text style={styles.gridTitle}>Job Skill Analysis</Text>
              <Text style={styles.gridSub}>Paste JD & Compare Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/saved')}
            >
              <Text style={styles.gridEmoji}>⭐</Text>
              <Text style={styles.gridTitle}>Saved Items</Text>
              <Text style={styles.gridSub}>Bookmarked Roles & Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/progress')}
            >
              <Text style={styles.gridEmoji}>📈</Text>
              <Text style={styles.gridTitle}>Learning Progress</Text>
              <Text style={styles.gridSub}>Goal & Skill Mastery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.gridEmoji}>👤</Text>
              <Text style={styles.gridTitle}>My Profile</Text>
              <Text style={styles.gridSub}>Skills, Courses & Projects</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Learning Goal Tracker */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🏆 Active Goal</Text>
            <TouchableOpacity onPress={() => router.push('/progress')}>
              <Text style={styles.seeAllText}>Manage Goal →</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View>
                <Text style={styles.goalRoleTitle}>
                  {activeGoal?.roleTitle || topRole?.title || 'Backend Developer'}
                </Text>
                <Text style={styles.goalTargetNote}>
                  Target: Complete required skills before Semester {profile?.currentSemester ? profile.currentSemester + 1 : 7}
                </Text>
              </View>
              <Text style={styles.goalEmoji}>🚀</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: activeGoal
                      ? `${Math.min(100, (activeGoal.completedStepCount / Math.max(1, activeGoal.totalSteps)) * 100)}%`
                      : '45%',
                  },
                ]}
              />
            </View>

            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {activeGoal
                  ? `${activeGoal.completedStepCount} of ${activeGoal.totalSteps} milestones reached`
                  : 'Pathway initialized · 4 milestones remaining'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/learning')}>
                <Text style={styles.continueLink}>Continue Learning →</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Live Jobs Spotlight */}
        {jobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>💼 Relevant Live Jobs</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                <Text style={styles.seeAllText}>Explore All Jobs →</Text>
              </TouchableOpacity>
            </View>

            {jobs.map((job) => (
              <Card
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                style={styles.jobItemCard}
              >
                <View style={styles.jobTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobItemTitle} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text style={styles.jobItemCompany}>
                      {job.company} · {job.location}
                    </Text>
                  </View>
                  <MetricBadge label={job.workArrangement} variant="demand" />
                </View>

                {job.salary?.raw && (
                  <Text style={styles.jobItemSalary}>{job.salary.raw}</Text>
                )}

                <View style={styles.jobFooter}>
                  <Text style={styles.jobAttribution}>
                    Via {job.sourceName || job.provider}
                  </Text>
                  <Text style={styles.jobAnalyzeLink}>Check Match →</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  welcomeCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 2,
    borderColor: Colors.brand.from,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
  },
  welcomeInfo: { flex: 1 },
  greetingText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
  },
  studentName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  metaText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  evidenceSnapshot: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,15,30,0.5)',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statVal: {
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border.default,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAllText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  spotlightCard: {
    padding: Spacing.base,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  roleTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
  },
  roleCategory: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  roleSummary: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  metricItem: { alignItems: 'center' },
  metricVal: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  metricSub: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  ctaPrompt: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridItem: {
    width: '48%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  gridEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  gridTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridSub: {
    color: Colors.text.secondary,
    fontSize: 11,
  },
  goalCard: {
    padding: Spacing.base,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalRoleTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  goalTargetNote: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  goalEmoji: {
    fontSize: 28,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.bg.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.from,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  continueLink: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  jobItemCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  jobItemTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  },
  jobItemCompany: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  jobItemSalary: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  jobAttribution: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  jobAnalyzeLink: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});
