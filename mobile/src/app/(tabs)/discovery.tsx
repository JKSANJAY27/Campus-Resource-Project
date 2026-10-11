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
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import {
  getCareerRecommendations,
  getPersistedStudentId,
  saveCareerPathway,
  getSavedPathways,
  removeSavedCareerPathway,
} from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import SkillPill from '../../components/SkillPill';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateFeedback';
import type { RoleRecommendation } from '../../types';

export default function CareerDiscoveryScreen() {
  const [recommendations, setRecommendations] = useState<RoleRecommendation[]>([]);
  const [savedRoleIds, setSavedRoleIds] = useState<Set<string>>(new Set());
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [fitFilter, setFitFilter] = useState<'all' | 'high' | 'moderate' | 'emerging'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);
  const [studentId, setStudentId] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const id = await getPersistedStudentId();
      if (!id) {
        router.replace('/');
        return;
      }
      setStudentId(id);

      const [recRes, savedList] = await Promise.all([
        getCareerRecommendations(id),
        getSavedPathways(id).catch(() => []),
      ]);

      setRecommendations(recRes.recommendations || []);
      setSavedRoleIds(new Set(savedList.map((s) => s.roleId)));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load career recommendations');
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
    loadData();
  };

  const handleToggleSave = async (role: RoleRecommendation) => {
    if (!studentId) return;
    const isSaved = savedRoleIds.has(role.roleId);
    try {
      if (isSaved) {
        await removeSavedCareerPathway(studentId, role.roleId);
        setSavedRoleIds((prev) => {
          const next = new Set(prev);
          next.delete(role.roleId);
          return next;
        });
      } else {
        await saveCareerPathway(studentId, role.roleId, role.title);
        setSavedRoleIds((prev) => new Set(prev).add(role.roleId));
      }
    } catch (err: any) {
      Alert.alert('Bookmark Failed', err.message || 'Unable to update bookmark');
    }
  };

  const toggleSelectForComparison = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        if (next.size >= 4) {
          Alert.alert('Limit Reached', 'You can compare up to 4 roles simultaneously.');
          return prev;
        }
        next.add(roleId);
      }
      return next;
    });
  };

  const handleLaunchComparison = () => {
    if (selectedRoleIds.size < 2) {
      Alert.alert('Select Roles', 'Please select at least 2 roles to compare side-by-side.');
      return;
    }
    const roleIdsParam = Array.from(selectedRoleIds).join(',');
    router.push(`/compare?roles=${roleIdsParam}`);
  };

  const filteredRoles = recommendations.filter((r) => {
    if (fitFilter === 'high') return r.fitLevel === 'High Fit';
    if (fitFilter === 'moderate') return r.fitLevel === 'Moderate Fit';
    if (fitFilter === 'emerging') return r.fitLevel === 'Emerging Fit';
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Career Discovery" onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Discovering suitable career roles based on your verified skills & completed coursework…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Career Discovery"
        subtitle="AI-Free Role Recommendations & Alignment"
        rightAction={{
          icon: comparisonMode ? '✓ Done' : '⚖️ Compare',
          onPress: () => {
            if (comparisonMode && selectedRoleIds.size >= 2) {
              handleLaunchComparison();
            } else {
              setComparisonMode(!comparisonMode);
            }
          },
          accessibilityLabel: 'Toggle comparison mode',
        }}
        onOpenNav={() => setQuickNavVisible(true)}
      />

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.chip, fitFilter === 'all' && styles.chipActive]}
            onPress={() => setFitFilter('all')}
          >
            <Text style={[styles.chipText, fitFilter === 'all' && styles.chipTextActive]}>
              All Roles ({recommendations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, fitFilter === 'high' && styles.chipActive]}
            onPress={() => setFitFilter('high')}
          >
            <Text style={[styles.chipText, fitFilter === 'high' && styles.chipTextActive]}>
              High Fit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, fitFilter === 'moderate' && styles.chipActive]}
            onPress={() => setFitFilter('moderate')}
          >
            <Text style={[styles.chipText, fitFilter === 'moderate' && styles.chipTextActive]}>
              Moderate Fit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, fitFilter === 'emerging' && styles.chipActive]}
            onPress={() => setFitFilter('emerging')}
          >
            <Text style={[styles.chipText, fitFilter === 'emerging' && styles.chipTextActive]}>
              Emerging Fit
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Comparison Action Notification */}
      {comparisonMode && (
        <View style={styles.compareBanner}>
          <Text style={styles.compareBannerText}>
            Selected {selectedRoleIds.size} of 4 roles for side-by-side comparison
          </Text>
          <TouchableOpacity
            style={[styles.compareLaunchBtn, selectedRoleIds.size < 2 && styles.compareLaunchBtnDisabled]}
            onPress={handleLaunchComparison}
          >
            <Text style={styles.compareLaunchText}>Compare Now ({selectedRoleIds.size})</Text>
          </TouchableOpacity>
        </View>
      )}

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
        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="No matching roles"
            message="No roles found matching the active filter criteria."
            actionLabel="Reset Filter"
            onAction={() => setFitFilter('all')}
          />
        ) : (
          filteredRoles.map((role) => {
            const isSaved = savedRoleIds.has(role.roleId);
            const isSelected = selectedRoleIds.has(role.roleId);

            return (
              <Card
                key={role.roleId}
                onPress={() => {
                  if (comparisonMode) {
                    toggleSelectForComparison(role.roleId);
                  } else {
                    router.push(`/role/${role.roleId}`);
                  }
                }}
                style={styles.roleCard}
                accentBorder={isSelected ? Colors.brand.from : undefined}
              >
                {/* Header Row */}
                <View style={styles.roleHeaderRow}>
                  {comparisonMode && (
                    <TouchableOpacity
                      onPress={() => toggleSelectForComparison(role.roleId)}
                      style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                    >
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleCategory}>{role.category}</Text>
                  </View>
                  <View style={styles.headerRight}>
                    <MetricBadge
                      label="Match"
                      scoreValue={role.compatibilityScore}
                      variant="score"
                    />
                    <TouchableOpacity
                      onPress={() => handleToggleSave(role)}
                      style={styles.saveBtn}
                      accessibilityLabel="Save role"
                    >
                      <Text style={styles.saveIcon}>{isSaved ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Summary */}
                <Text style={styles.roleSummary} numberOfLines={2}>
                  {role.summary}
                </Text>

                {/* Compatibility Progress Bar */}
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, Math.max(5, role.compatibilityScore))}%`,
                        backgroundColor:
                          role.compatibilityScore >= 75
                            ? '#10B981'
                            : role.compatibilityScore >= 50
                            ? '#F59E0B'
                            : '#F43F5E',
                      },
                    ]}
                  />
                </View>

                {/* Metrics Breakdown */}
                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>
                    <Text style={styles.statProvenVal}>
                      {role.matchingSkills.length}
                    </Text>{' '}
                    matching skills
                  </Text>
                  <Text style={styles.statLabel}>
                    <Text style={styles.statMissingVal}>
                      {role.skillGapsCount}
                    </Text>{' '}
                    missing skills
                  </Text>
                  {role.alignedJobsCount > 0 && (
                    <Text style={styles.statLabel}>
                      <Text style={styles.statJobsVal}>{role.alignedJobsCount}</Text> jobs
                    </Text>
                  )}
                </View>

                {/* Matching Skills Pills Preview */}
                {role.matchingSkills.length > 0 && (
                  <View style={styles.skillsSection}>
                    <Text style={styles.skillsSectionTitle}>Matching Skills:</Text>
                    <View style={styles.skillsWrap}>
                      {role.matchingSkills.slice(0, 4).map((s) => (
                        <SkillPill
                          key={s.skillId}
                          name={s.name}
                          evidenceTier={s.competenceType}
                          isCore={s.isCore}
                        />
                      ))}
                      {role.matchingSkills.length > 4 && (
                        <Text style={styles.moreText}>
                          +{role.matchingSkills.length - 4} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Missing Skills Pills Preview */}
                {role.missingSkills.length > 0 && (
                  <View style={styles.skillsSection}>
                    <Text style={[styles.skillsSectionTitle, { color: '#F43F5E' }]}>
                      Missing Skills to Acquire:
                    </Text>
                    <View style={styles.skillsWrap}>
                      {role.missingSkills.slice(0, 3).map((s) => (
                        <SkillPill
                          key={s.skillId}
                          name={s.name}
                          evidenceTier="missing"
                          isCore={s.isCore}
                        />
                      ))}
                      {role.missingSkills.length > 3 && (
                        <Text style={styles.moreText}>
                          +{role.missingSkills.length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Bottom Action Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.exploreLink}>Explore Detailed Skill Gap & Learning Sequence →</Text>
                </View>
              </Card>
            );
          })
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
  filterBar: {
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingVertical: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chipActive: {
    backgroundColor: Colors.brand.from,
    borderColor: Colors.brand.from,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  compareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99,102,241,0.2)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.from,
  },
  compareBannerText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  compareLaunchBtn: {
    backgroundColor: Colors.brand.from,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  compareLaunchBtnDisabled: {
    opacity: 0.5,
  },
  compareLaunchText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  roleCard: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.active,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: Colors.brand.from,
  },
  checkIcon: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  roleTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  roleCategory: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveBtn: {
    padding: 4,
  },
  saveIcon: {
    fontSize: 20,
    color: '#F59E0B',
  },
  roleSummary: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.xs,
  },
  barContainer: {
    height: 6,
    backgroundColor: Colors.bg.secondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  statProvenVal: {
    color: '#10B981',
    fontWeight: '700',
  },
  statMissingVal: {
    color: '#F43F5E',
    fontWeight: '700',
  },
  statJobsVal: {
    color: Colors.brand.to,
    fontWeight: '700',
  },
  skillsSection: {
    marginTop: Spacing.xs,
  },
  skillsSectionTitle: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  moreText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginBottom: 6,
  },
  cardFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    alignItems: 'center',
  },
  exploreLink: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});
