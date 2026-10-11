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
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import {
  getSavedPathways,
  removeSavedCareerPathway,
  getSavedJobs,
  toggleSaveJob,
  getPersistedStudentId,
} from '../api/client';
import Header from '../components/Header';
import Card from '../components/Card';
import MetricBadge from '../components/MetricBadge';
import QuickNavModal from '../components/QuickNavModal';
import { LoadingState, EmptyState } from '../components/StateFeedback';
import type { SavedPathway, NormalizedJob } from '../types';

export default function SavedItemsScreen() {
  const [activeTab, setActiveTab] = useState<'roles' | 'jobs'>('roles');
  const [savedRoles, setSavedRoles] = useState<SavedPathway[]>([]);
  const [savedJobs, setSavedJobs] = useState<NormalizedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadSavedItems = useCallback(async () => {
    try {
      const sId = await getPersistedStudentId();
      if (sId) setStudentId(sId);

      const [roleList, jobList] = await Promise.all([
        sId ? getSavedPathways(sId).catch(() => []) : Promise.resolve([]),
        getSavedJobs().catch(() => []),
      ]);

      setSavedRoles(roleList || []);
      setSavedJobs(jobList || []);
    } catch (err: any) {
      console.warn('Failed to load saved items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSavedItems();
  }, [loadSavedItems]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedItems();
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!studentId) return;
    try {
      await removeSavedCareerPathway(studentId, roleId);
      setSavedRoles((prev) => prev.filter((r) => r.roleId !== roleId));
    } catch (err: any) {
      Alert.alert('Remove Failed', err.message || 'Unable to remove saved role');
    }
  };

  const handleRemoveJob = async (job: NormalizedJob) => {
    await toggleSaveJob(job);
    setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Saved Roles & Jobs" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Loading your bookmarks…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Saved Roles & Jobs"
        subtitle="Bookmarked Pathways & Postings"
        showBack
        onOpenNav={() => setQuickNavVisible(true)}
      />

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'roles' && styles.tabBtnActive]}
          onPress={() => setActiveTab('roles')}
        >
          <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>
            Saved Roles ({savedRoles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'jobs' && styles.tabBtnActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            Saved Jobs ({savedJobs.length})
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
        {activeTab === 'roles' && (
          <>
            {savedRoles.length === 0 ? (
              <EmptyState
                emoji="⭐"
                title="No saved roles"
                message="You haven't bookmarked any career roles yet. Discover roles and tap the star icon to save them."
                actionLabel="Explore Roles"
                onAction={() => router.push('/(tabs)/discovery')}
              />
            ) : (
              savedRoles.map((role) => (
                <Card
                  key={role.id || role.roleId}
                  onPress={() => router.push(`/role/${role.roleId}`)}
                  style={styles.itemCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{role.roleTitle}</Text>
                      <Text style={styles.itemSubtitle}>
                        Saved {new Date(role.savedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveRole(role.roleId)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {role.notes ? (
                    <Text style={styles.notesText}>Note: {role.notes}</Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewLink}>Open Requirements & Learning Path →</Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === 'jobs' && (
          <>
            {savedJobs.length === 0 ? (
              <EmptyState
                emoji="💼"
                title="No saved jobs"
                message="You haven't saved any job listings yet. Search live jobs and tap the star icon to bookmark opportunities."
                actionLabel="Browse Live Jobs"
                onAction={() => router.push('/(tabs)/jobs')}
              />
            ) : (
              savedJobs.map((job) => (
                <Card
                  key={job.id}
                  onPress={() => router.push(`/job/${job.id}`)}
                  style={styles.itemCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{job.title}</Text>
                      <Text style={styles.itemSubtitle}>
                        {job.company} · {job.location}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveJob(job)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tagsRow}>
                    <MetricBadge label={job.workArrangement} variant="demand" />
                    {job.salary?.raw && (
                      <Text style={styles.salary}>{job.salary.raw}</Text>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewLink}>Check Profile Fit Analysis →</Text>
                  </View>
                </Card>
              ))
            )}
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
    gap: Spacing.md,
  },
  itemCard: {
    padding: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  itemTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  notesText: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginVertical: Spacing.xs,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  salary: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  viewLink: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});
