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
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import {
  getCareerToLearningPath,
  getCareerRoles,
  getPersistedStudentId,
  getActiveGoal,
} from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateFeedback';
import type { CareerToLearningPath, CareerRole } from '../../types';

export default function LearningPathsScreen() {
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role_backend_developer');
  const [pathway, setPathway] = useState<CareerToLearningPath | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);
  const [studentId, setStudentId] = useState<string>('');

  const loadData = useCallback(async (roleIdToLoad?: string) => {
    try {
      const sId = await getPersistedStudentId();
      if (!sId) {
        router.replace('/');
        return;
      }
      setStudentId(sId);

      const [allRoles, goal] = await Promise.all([
        getCareerRoles(),
        getActiveGoal(),
      ]);

      setRoles(allRoles);

      const targetId = roleIdToLoad || goal?.roleId || allRoles[0]?.roleId || 'role_backend_developer';
      setSelectedRoleId(targetId);

      const pathData = await getCareerToLearningPath(targetId, sId);
      setPathway(pathData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load learning path');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedRoleId);
  };

  const handleSelectRole = async (rId: string) => {
    setSelectedRoleId(rId);
    setLoading(true);
    try {
      const pathData = await getCareerToLearningPath(rId, studentId);
      setPathway(pathData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load selected path');
    } finally {
      setLoading(false);
    }
  };

  const toggleStepCompletion = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
      }
      return next;
    });
  };

  if (loading && !pathway) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Learning Paths" onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Calculating sequential learning path respecting Neo4j graph prerequisites…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Learning Paths"
        subtitle="Prerequisite-Aware Sequences & Milestones"
        rightAction={{
          icon: '🗺️',
          onPress: () => router.push(`/role/${selectedRoleId}`),
          accessibilityLabel: 'Explore active role requirements',
        }}
        onOpenNav={() => setQuickNavVisible(true)}
      />

      {/* Role Switcher Horizontal Scroll */}
      <View style={styles.rolePickerBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rolePickerScroll}
        >
          {roles.map((r) => {
            const isSelected = r.roleId === selectedRoleId;
            return (
              <TouchableOpacity
                key={r.roleId}
                onPress={() => handleSelectRole(r.roleId)}
                style={[styles.roleChip, isSelected && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                  {r.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        {error && !pathway ? (
          <ErrorState message={error} onRetry={() => loadData(selectedRoleId)} />
        ) : !pathway ? (
          <EmptyState
            emoji="📚"
            title="No pathway data"
            message="Unable to generate a learning path for the selected role."
          />
        ) : (
          <>
            {/* Overview Card */}
            <Card elevated style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overviewTitle}>{pathway.roleTitle}</Text>
                  <Text style={styles.overviewFit}>{pathway.fitLevel} · Skill gap roadmap</Text>
                </View>
                <MetricBadge
                  label="Match"
                  scoreValue={pathway.compatibilityScore}
                  variant="score"
                />
              </View>

              <Text style={styles.overviewDesc}>{pathway.roleSummary}</Text>

              {/* Effort & Timeline Stats */}
              {pathway.estimatedEffort && (
                <View style={styles.effortRow}>
                  <View style={styles.effortBox}>
                    <Text style={styles.effortVal}>~{pathway.estimatedEffort.estimatedWeeks} wks</Text>
                    <Text style={styles.effortLabel}>Estimated Duration</Text>
                  </View>
                  <View style={styles.effortDivider} />
                  <View style={styles.effortBox}>
                    <Text style={styles.effortVal}>{pathway.estimatedEffort.totalHours} hrs</Text>
                    <Text style={styles.effortLabel}>Total Study Effort</Text>
                  </View>
                  <View style={styles.effortDivider} />
                  <View style={styles.effortBox}>
                    <Text style={styles.effortVal}>{pathway.estimatedEffort.hoursPerWeek} hrs/wk</Text>
                    <Text style={styles.effortLabel}>Recommended Pace</Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Sequence Steps */}
            <Text style={styles.sectionTitle}>
              🪜 Recommended Milestone Sequence ({pathway.learningSequence.length} Steps)
            </Text>
            <Text style={styles.sequenceGuidance}>
              Graph algorithm ensures foundational dependencies are satisfied before subsequent technologies:
            </Text>

            {pathway.learningSequence.map((step) => {
              const isDone = completedSteps.has(step.step);

              return (
                <Card
                  key={step.step}
                  style={styles.stepCard}
                  accentBorder={isDone ? '#10B981' : undefined}
                >
                  <View style={styles.stepTopRow}>
                    <TouchableOpacity
                      style={[styles.stepCheckbox, isDone && styles.stepCheckboxDone]}
                      onPress={() => toggleStepCompletion(step.step)}
                    >
                      {isDone && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepSkillTitle, isDone && styles.stepSkillTitleDone]}>
                        Step {step.step}: {step.skillName}
                      </Text>
                      <Text style={styles.stepMeta}>{step.category} · {step.tier}</Text>
                    </View>

                    {step.isCore && <MetricBadge label="Core" variant="demand" />}
                  </View>

                  <Text style={styles.stepReasonText}>{step.reason}</Text>

                  {step.prerequisites && step.prerequisites.length > 0 && (
                    <Text style={styles.prereqNote}>
                      🔒 Requires completion of: {step.prerequisites.join(', ')}
                    </Text>
                  )}

                  {/* Course recommendation for this step */}
                  {step.suggestedCourses && step.suggestedCourses.length > 0 && (
                    <View style={styles.recItemBox}>
                      <Text style={styles.recHeading}>Campus Course Addressing Gap:</Text>
                      {step.suggestedCourses.map((c) => (
                        <Text key={c.id} style={styles.recName}>
                          📖 {c.code}: {c.title} ({c.credits} cr · {c.difficulty})
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Project recommendation for this step */}
                  {step.suggestedProjects && step.suggestedProjects.length > 0 && (
                    <View style={styles.recItemBox}>
                      <Text style={[styles.recHeading, { color: '#10B981' }]}>
                        Hands-on Portfolio Project:
                      </Text>
                      {step.suggestedProjects.map((p) => (
                        <Text key={p.id} style={[styles.recName, { color: '#10B981' }]}>
                          🛠️ {p.title} ({p.difficulty})
                        </Text>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
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
  rolePickerBar: {
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingVertical: Spacing.sm,
  },
  rolePickerScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  roleChipActive: {
    backgroundColor: Colors.brand.from,
    borderColor: Colors.brand.from,
  },
  roleChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
  overviewCard: {
    padding: Spacing.base,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  overviewTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
  },
  overviewFit: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  overviewDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.md,
  },
  effortRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  effortBox: { alignItems: 'center' },
  effortVal: {
    color: '#22D3EE',
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  effortLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  effortDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.default,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  sequenceGuidance: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  stepCard: {
    padding: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.from,
  },
  stepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkMark: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  stepSkillTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  stepSkillTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.text.muted,
  },
  stepMeta: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  stepReasonText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.xs,
  },
  prereqNote: {
    color: '#F59E0B',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  recItemBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  recHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  recName: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
});
