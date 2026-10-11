import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import {
  getCareerRoleById,
  getCareerToLearningPath,
  getCareerRoleJobs,
  getRoleMarketSummary,
  getPersistedStudentId,
  saveCareerPathway,
  removeSavedCareerPathway,
  getSavedPathways,
  setActiveGoal,
} from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import SkillPill from '../../components/SkillPill';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState } from '../../components/StateFeedback';
import type {
  CareerRole,
  CareerToLearningPath,
  NormalizedJob,
  RoleJobMarketSummary,
} from '../../types';

export default function RoleDetailScreen() {
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const [role, setRole] = useState<CareerRole | null>(null);
  const [pathway, setPathway] = useState<CareerToLearningPath | null>(null);
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [marketSummary, setMarketSummary] = useState<RoleJobMarketSummary | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'requirements' | 'pathway' | 'courses' | 'jobs'>('requirements');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadRoleData = useCallback(async () => {
    if (!roleId) return;
    try {
      const sId = await getPersistedStudentId();
      if (sId) setStudentId(sId);

      const [r, pathData, jobList, marketData, savedList] = await Promise.all([
        getCareerRoleById(roleId).catch(() => null),
        sId ? getCareerToLearningPath(roleId, sId).catch(() => null) : Promise.resolve(null),
        getCareerRoleJobs(roleId, 5).catch(() => []),
        getRoleMarketSummary(roleId, 5).catch(() => null),
        sId ? getSavedPathways(sId).catch(() => []) : Promise.resolve([]),
      ]);

      if (r) setRole(r);
      if (pathData) setPathway(pathData);
      setJobs(jobList || []);
      setMarketSummary(marketData);
      if (savedList && Array.isArray(savedList)) {
        setIsSaved(savedList.some((s) => s.roleId === roleId));
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load role details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleId]);

  useEffect(() => {
    loadRoleData();
  }, [loadRoleData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRoleData();
  };

  const handleToggleSave = async () => {
    if (!studentId || !role) return;
    try {
      if (isSaved) {
        await removeSavedCareerPathway(studentId, role.roleId);
        setIsSaved(false);
      } else {
        await saveCareerPathway(studentId, role.roleId, role.title);
        setIsSaved(true);
      }
    } catch (err: any) {
      Alert.alert('Bookmark Failed', err.message || 'Unable to update bookmark');
    }
  };

  const handleSetAsTargetGoal = async () => {
    if (!role) return;
    try {
      await setActiveGoal({
        roleId: role.roleId,
        roleTitle: role.title,
        completedStepCount: pathway?.matchingSkills.length || 0,
        totalSteps: (pathway?.matchingSkills.length || 0) + (pathway?.missingSkills.length || 0) || 6,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('Target Set', `"${role.title}" is now your active career target goal!`);
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Role Explorer" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Loading role specifications, skill requirements & learning graph…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error || !role) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Role Explorer" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <ErrorState
          title="Could not load role"
          message={error || `Role "${roleId}" not found`}
          onRetry={loadRoleData}
        />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title={role.title}
        subtitle={role.category}
        showBack
        rightAction={{
          icon: isSaved ? '★' : '☆',
          onPress: handleToggleSave,
          accessibilityLabel: 'Toggle bookmark role',
        }}
        onOpenNav={() => setQuickNavVisible(true)}
      />

      {/* Tabs Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requirements' && styles.tabBtnActive]}
          onPress={() => setActiveTab('requirements')}
        >
          <Text style={[styles.tabText, activeTab === 'requirements' && styles.tabTextActive]}>
            Requirements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pathway' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pathway')}
        >
          <Text style={[styles.tabText, activeTab === 'pathway' && styles.tabTextActive]}>
            Learning Path
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'courses' && styles.tabBtnActive]}
          onPress={() => setActiveTab('courses')}
        >
          <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>
            Courses & Projects
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'jobs' && styles.tabBtnActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            Jobs ({jobs.length})
          </Text>
        </TouchableOpacity>
      </View>

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
        {/* Role Meta Banner */}
        <Card elevated style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleName}>{role.title}</Text>
              <Text style={styles.roleCategoryText}>{role.category}</Text>
            </View>
            {pathway && (
              <MetricBadge
                label="Compatibility"
                scoreValue={pathway.compatibilityScore}
                variant="score"
              />
            )}
          </View>

          <Text style={styles.roleDesc}>{role.summary || role.description}</Text>

          <View style={styles.badgesRow}>
            <MetricBadge label={`Demand: ${role.demandLevel}`} variant="demand" />
            <MetricBadge label={`Growth: ${role.growthRate}`} variant="neutral" />
            {role.averageSalaryRange && (
              <MetricBadge
                label={`Avg: ₹${(role.averageSalaryRange.min / 100000).toFixed(1)}L - ₹${(role.averageSalaryRange.max / 100000).toFixed(1)}L`}
                variant="neutral"
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.setGoalBtn}
            onPress={handleSetAsTargetGoal}
          >
            <Text style={styles.setGoalText}>🎯 Set as Active Target Goal</Text>
          </TouchableOpacity>
        </Card>

        {/* TAB 1: REQUIREMENTS & SKILL GAP */}
        {activeTab === 'requirements' && (
          <View style={styles.tabContent}>
            {/* Skill Gap Analysis Box */}
            {pathway && (
              <Card style={styles.gapCard} accentBorder={Colors.brand.from}>
                <Text style={styles.sectionHeading}>📊 Personalized Skill Fit</Text>
                <View style={styles.gapStatsRow}>
                  <View style={styles.gapStat}>
                    <Text style={[styles.gapStatVal, { color: '#10B981' }]}>
                      {pathway.matchingSkills.length}
                    </Text>
                    <Text style={styles.gapStatLabel}>Satisfied Skills</Text>
                  </View>
                  <View style={styles.gapDivider} />
                  <View style={styles.gapStat}>
                    <Text style={[styles.gapStatVal, { color: '#F43F5E' }]}>
                      {pathway.skillGapsCount}
                    </Text>
                    <Text style={styles.gapStatLabel}>Skill Gaps</Text>
                  </View>
                  <View style={styles.gapDivider} />
                  <View style={styles.gapStat}>
                    <Text style={[styles.gapStatVal, { color: Colors.brand.to }]}>
                      {pathway.estimatedEffort?.estimatedWeeks || 8}w
                    </Text>
                    <Text style={styles.gapStatLabel}>Estimated Study</Text>
                  </View>
                </View>

                {pathway.prerequisiteBottlenecks && pathway.prerequisiteBottlenecks.length > 0 && (
                  <View style={styles.bottleneckBox}>
                    <Text style={styles.bottleneckTitle}>⚠️ Prerequisite Bottlenecks:</Text>
                    {pathway.prerequisiteBottlenecks.map((b, idx) => (
                      <Text key={idx} style={styles.bottleneckItem}>
                        • {b.skillName} blocks learning {b.blocksSkillName}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
            )}

            {/* Core Required Skills */}
            <Card style={styles.skillsCard}>
              <Text style={styles.sectionHeading}>⭐ Mandatory Core Requirements</Text>
              <Text style={styles.subtext}>
                Essential capabilities evaluated for candidate shortlisting:
              </Text>
              <View style={styles.pillsWrap}>
                {role.requiredSkills.map((sk) => {
                  const isMatched = pathway?.matchingSkills.some((m) => m.skillId === sk.skillId);
                  return (
                    <SkillPill
                      key={sk.skillId}
                      name={sk.name}
                      isCore
                      evidenceTier={isMatched ? 'proven_experience' : 'missing'}
                    />
                  );
                })}
              </View>
            </Card>

            {/* Preferred Skills */}
            {role.preferredSkills.length > 0 && (
              <Card style={styles.skillsCard}>
                <Text style={styles.sectionHeading}>💡 Recommended Preferred Skills</Text>
                <Text style={styles.subtext}>
                  Valuable specializations that differentiate applications:
                </Text>
                <View style={styles.pillsWrap}>
                  {role.preferredSkills.map((sk) => {
                    const isMatched = pathway?.matchingSkills.some((m) => m.skillId === sk.skillId);
                    return (
                      <SkillPill
                        key={sk.skillId}
                        name={sk.name}
                        evidenceTier={isMatched ? 'course_completed' : undefined}
                      />
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Market In-Demand Skills Summary */}
            {marketSummary && marketSummary.topSkillsInDemand.length > 0 && (
              <Card style={styles.skillsCard}>
                <Text style={styles.sectionHeading}>📈 Live Job Market Demand</Text>
                <Text style={styles.subtext}>
                  Skills requested most frequently in current industry postings ({marketSummary.sampleSize} sampled listings):
                </Text>
                <View style={styles.marketList}>
                  {marketSummary.topSkillsInDemand.map((ms) => (
                    <View key={ms.skillId} style={styles.marketRow}>
                      <Text style={styles.marketName}>{ms.name}</Text>
                      <View style={styles.marketBar}>
                        <View style={[styles.marketBarFill, { width: `${ms.percentage}%` }]} />
                      </View>
                      <Text style={styles.marketPct}>{ms.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        )}

        {/* TAB 2: LEARNING PATHWAY ROADMAP */}
        {activeTab === 'pathway' && (
          <View style={styles.tabContent}>
            <Card style={styles.pathwayMetaCard}>
              <Text style={styles.sectionHeading}>🗺️ Recommended Learning Sequence</Text>
              <Text style={styles.subtext}>
                Traversed topologically across Neo4j prerequisites. Satisfies baseline dependencies before advanced topics:
              </Text>
              {pathway?.estimatedEffort && (
                <View style={styles.effortNoteBox}>
                  <Text style={styles.effortNoteText}>
                    ⏱️ Estimated effort: {pathway.estimatedEffort.totalHours} total study hours (~{pathway.estimatedEffort.estimatedWeeks} weeks at {pathway.estimatedEffort.hoursPerWeek} hrs/week). {pathway.estimatedEffort.breakdownNote}
                  </Text>
                </View>
              )}
            </Card>

            {pathway?.learningSequence && pathway.learningSequence.length > 0 ? (
              pathway.learningSequence.map((step) => (
                <Card key={step.step} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{step.step}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepSkillName}>{step.skillName}</Text>
                      <Text style={styles.stepCategory}>{step.category} · {step.tier}</Text>
                    </View>
                    {step.isCore && <MetricBadge label="Core" variant="demand" />}
                  </View>

                  <Text style={styles.stepReason}>{step.reason}</Text>

                  {step.prerequisites && step.prerequisites.length > 0 && (
                    <Text style={styles.stepPrereq}>
                      Prerequisites: {step.prerequisites.join(', ')}
                    </Text>
                  )}

                  {step.suggestedCourses && step.suggestedCourses.length > 0 && (
                    <View style={styles.stepCourseBox}>
                      <Text style={styles.stepCourseHeading}>Recommended Campus Course:</Text>
                      {step.suggestedCourses.map((c) => (
                        <Text key={c.id} style={styles.stepCourseName}>
                          📖 {c.code}: {c.title} ({c.credits} credits)
                        </Text>
                      ))}
                    </View>
                  )}
                </Card>
              ))
            ) : (
              <Card style={styles.stepCard}>
                <Text style={styles.stepReason}>
                  All prerequisite requirements for this role are already fulfilled in your profile!
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* TAB 3: RECOMMENDED COURSES & PROJECTS */}
        {activeTab === 'courses' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>📚 Recommended Campus Courses</Text>
            {pathway?.recommendedCourses && pathway.recommendedCourses.length > 0 ? (
              pathway.recommendedCourses.map((c) => (
                <Card key={c.courseId} style={styles.courseItemCard}>
                  <View style={styles.courseHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseCode}>{c.code}</Text>
                      <Text style={styles.courseTitle}>{c.title}</Text>
                    </View>
                    <MetricBadge label={`${c.credits} Credits`} variant="neutral" />
                  </View>
                  <Text style={styles.courseMeta}>
                    Level: {c.difficulty || 'Intermediate'} · Bridges targeted gaps
                  </Text>
                </Card>
              ))
            ) : (
              <Text style={styles.subtext}>No outstanding courses required for this role.</Text>
            )}

            <Text style={[styles.tabSectionTitle, { marginTop: Spacing.xl }]}>
              🛠️ Hands-on Portfolio Projects
            </Text>
            {pathway?.recommendedProjects && pathway.recommendedProjects.length > 0 ? (
              pathway.recommendedProjects.map((p) => (
                <Card key={p.projectId} style={styles.projectItemCard}>
                  <Text style={styles.projectTitle}>{p.title}</Text>
                  <Text style={styles.projectDomain}>Domain: {p.domain || 'Software Engineering'}</Text>
                  <Text style={styles.projectProofNote}>
                    Demonstrating practical code in this project elevates skills from academic-only to proven commercial competence.
                  </Text>
                </Card>
              ))
            ) : (
              <Text style={styles.subtext}>No specific projects designated.</Text>
            )}
          </View>
        )}

        {/* TAB 4: MATCHING LIVE JOBS */}
        {activeTab === 'jobs' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>
              💼 Live Job Listings ({jobs.length})
            </Text>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <Card
                  key={job.id}
                  onPress={() => router.push(`/job/${job.id}`)}
                  style={styles.jobCard}
                >
                  <View style={styles.jobTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                      <Text style={styles.jobCompany}>{job.company} · {job.location}</Text>
                    </View>
                    <MetricBadge label={job.workArrangement} variant="demand" />
                  </View>
                  {job.salary?.raw && (
                    <Text style={styles.jobSalary}>{job.salary.raw}</Text>
                  )}
                  <View style={styles.jobFooterRow}>
                    <Text style={styles.jobProvider}>Source: {job.sourceName || job.provider}</Text>
                    <Text style={styles.jobMatchLink}>Analyze Fit →</Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.jobCard}>
                <Text style={styles.subtext}>
                  No current live listings for this role. Check back soon or search using custom keywords.
                </Text>
              </Card>
            )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.brand.from,
  },
  tabText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.brand.to,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  metaCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  roleName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
  },
  roleCategoryText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  roleDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginVertical: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  setGoalBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: Colors.brand.from,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  setGoalText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  tabContent: {
    gap: Spacing.md,
  },
  tabSectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  sectionHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm + 1,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtext: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  gapCard: {
    padding: Spacing.base,
  },
  gapStatsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  gapStat: { alignItems: 'center' },
  gapStatVal: {
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
  },
  gapStatLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  gapDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.default,
  },
  bottleneckBox: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#F43F5E',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  bottleneckTitle: {
    color: '#F43F5E',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  bottleneckItem: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  skillsCard: {
    padding: Spacing.base,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  marketList: {
    gap: Spacing.sm,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  marketName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    width: 120,
  },
  marketBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.bg.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  marketBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.from,
    borderRadius: 3,
  },
  marketPct: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  pathwayMetaCard: {
    padding: Spacing.base,
  },
  effortNoteBox: {
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#22D3EE',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  effortNoteText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  stepCard: {
    padding: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.from,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.from,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
  },
  stepSkillName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  stepCategory: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  stepReason: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.xs,
  },
  stepPrereq: {
    color: '#F59E0B',
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  stepCourseBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepCourseHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepCourseName: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
  },
  courseItemCard: {
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  courseCode: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  courseTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  },
  courseMeta: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  projectItemCard: {
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  projectTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginBottom: 2,
  },
  projectDomain: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 6,
  },
  projectProofNote: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  jobCard: {
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  jobTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  },
  jobCompany: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  jobSalary: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  jobFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  jobProvider: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  jobMatchLink: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});
