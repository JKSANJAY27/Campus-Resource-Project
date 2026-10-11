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
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import { compareCareerPathways, getPersistedStudentId } from '../api/client';
import Header from '../components/Header';
import Card from '../components/Card';
import MetricBadge from '../components/MetricBadge';
import SkillPill from '../components/SkillPill';
import QuickNavModal from '../components/QuickNavModal';
import { LoadingState, ErrorState, EmptyState } from '../components/StateFeedback';
import type { PathwayComparison } from '../types';

export default function RoleComparisonScreen() {
  const { roles } = useLocalSearchParams<{ roles: string }>();
  const [comparison, setComparison] = useState<PathwayComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadComparison = useCallback(async () => {
    try {
      const studentId = await getPersistedStudentId();
      if (!studentId) {
        router.replace('/');
        return;
      }

      const roleIds = roles ? roles.split(',').filter(Boolean) : ['role_frontend_developer', 'role_backend_developer'];
      if (roleIds.length === 0) {
        setError('No roles specified for comparison.');
        setLoading(false);
        return;
      }

      const result = await compareCareerPathways(roleIds, studentId);
      setComparison(result);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to generate pathway comparison');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roles]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const onRefresh = () => {
    setRefreshing(true);
    loadComparison();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Side-by-Side Comparison" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Comparing multi-role prerequisite graphs and study effort…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error || !comparison) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Side-by-Side Comparison" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <ErrorState message={error || 'Comparison data unavailable'} onRetry={loadComparison} />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Pathway Comparison"
        subtitle={`Comparing ${comparison.comparedRolesCount} Career Options`}
        showBack
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
        {/* Top Highlights Banner */}
        <Card elevated style={styles.highlightCard}>
          <Text style={styles.cardHeading}>🏆 Comparison Highlights</Text>
          <View style={styles.highlightRow}>
            <View style={styles.highlightBox}>
              <Text style={styles.highlightLabel}>Highest Compatibility</Text>
              <Text style={styles.highlightRoleName}>
                {comparison.highestCompatibilityRole?.title || 'N/A'}
              </Text>
              <MetricBadge
                label="Match"
                scoreValue={comparison.highestCompatibilityRole?.score || 0}
                variant="score"
              />
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightBox}>
              <Text style={styles.highlightLabel}>Fastest Learning Path</Text>
              <Text style={styles.highlightRoleName}>
                {comparison.lowestEffortRole?.title || 'N/A'}
              </Text>
              <Text style={[styles.highlightRoleName, { color: '#22D3EE' }]}>
                ~{comparison.lowestEffortRole?.estimatedWeeks || 0} weeks
              </Text>
            </View>
          </View>
        </Card>

        {/* Side-by-Side Comparative Cards */}
        <Text style={styles.sectionTitle}>⚖️ Role Pathways Breakdown</Text>
        {comparison.pathways.map((p) => (
          <Card
            key={p.roleId}
            onPress={() => router.push(`/role/${p.roleId}`)}
            style={styles.pathwayCard}
          >
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pathwayTitle}>{p.roleTitle}</Text>
                <Text style={styles.pathwayFit}>{p.fitLevel}</Text>
              </View>
              <MetricBadge
                label="Match"
                scoreValue={p.compatibilityScore}
                variant="score"
              />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.gridCell}>
                <Text style={styles.cellVal}>{p.missingSkillsCount}</Text>
                <Text style={styles.cellLabel}>Missing Skills</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={[styles.cellVal, { color: p.missingPrerequisitesCount > 0 ? '#F43F5E' : '#10B981' }]}>
                  {p.missingPrerequisitesCount}
                </Text>
                <Text style={styles.cellLabel}>Prereq Gaps</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellVal}>{p.coursesCount}</Text>
                <Text style={styles.cellLabel}>Courses</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellVal}>~{p.estimatedWeeks}w</Text>
                <Text style={styles.cellLabel}>Duration</Text>
              </View>
            </View>

            {p.recommendedNextCourse && (
              <View style={styles.nextCourseBox}>
                <Text style={styles.nextCourseTitle}>Recommended First Step:</Text>
                <Text style={styles.nextCourseName}>
                  📖 {p.recommendedNextCourse.code}: {p.recommendedNextCourse.title}
                </Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={styles.detailsPrompt}>Open Detailed Learning Path →</Text>
            </View>
          </Card>
        ))}

        {/* Common Skill Gaps Shared Across Roles */}
        {comparison.commonSkillGaps && comparison.commonSkillGaps.length > 0 && (
          <Card style={styles.commonSkillsCard}>
            <Text style={styles.cardHeading}>🔗 Common High-Leverage Skills</Text>
            <Text style={styles.subtext}>
              Mastering these common skills unlocks progress across multiple target roles simultaneously:
            </Text>
            <View style={styles.pillsWrap}>
              {comparison.commonSkillGaps.map((cg) => (
                <SkillPill
                  key={cg.skillId}
                  name={`${cg.name} (${cg.sharedAcrossRolesCount} roles)`}
                  isCore
                  evidenceTier="missing"
                />
              ))}
            </View>
          </Card>
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
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
  highlightCard: {
    padding: Spacing.base,
  },
  cardHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  highlightBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  highlightLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  highlightRoleName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  highlightDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border.default,
    marginHorizontal: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  pathwayCard: {
    padding: Spacing.base,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pathwayTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
  },
  pathwayFit: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  gridCell: {
    alignItems: 'center',
  },
  cellVal: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  cellLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  nextCourseBox: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  nextCourseTitle: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  nextCourseName: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  detailsPrompt: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  commonSkillsCard: {
    padding: Spacing.base,
  },
  subtext: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
