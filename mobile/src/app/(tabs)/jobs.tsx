import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import { searchJobs, toggleSaveJob, getSavedJobs } from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateFeedback';
import type { NormalizedJob } from '../../types';

export default function LiveJobsScreen() {
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [keyword, setKeyword] = useState('');
  const [workArrangement, setWorkArrangement] = useState<string>('any');
  const [experienceLevel, setExperienceLevel] = useState<string>('any');
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const [jobRes, savedList] = await Promise.all([
        searchJobs({
          keyword: keyword.trim() || undefined,
          workArrangement: workArrangement !== 'any' ? workArrangement : undefined,
          experienceLevel: experienceLevel !== 'any' ? experienceLevel : undefined,
          limit: 20,
        }),
        getSavedJobs().catch(() => []),
      ]);

      setJobs(jobRes.jobs || []);
      setSavedJobIds(new Set(savedList.map((j) => j.id)));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [keyword, workArrangement, experienceLevel]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleToggleBookmark = async (job: NormalizedJob) => {
    const isNowSaved = await toggleSaveJob(job);
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (isNowSaved) next.add(job.id);
      else next.delete(job.id);
      return next;
    });
  };

  const handleOpenExternal = async (url: string) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) Linking.openURL(url);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Live Jobs"
        subtitle="Real-Time Industry Postings & Fit Check"
        rightAction={{
          icon: '🔬',
          onPress: () => router.push('/job-analysis'),
          accessibilityLabel: 'Analyze custom job description',
        }}
        onOpenNav={() => setQuickNavVisible(true)}
      />

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search role, skill, or keyword (e.g. React, Node, Python)…"
            placeholderTextColor={Colors.text.muted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={fetchJobs}
            returnKeyType="search"
          />
          {keyword ? (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Arrangement Filters */}
          <TouchableOpacity
            style={[styles.filterChip, workArrangement === 'any' && styles.filterChipActive]}
            onPress={() => setWorkArrangement('any')}
          >
            <Text style={[styles.filterText, workArrangement === 'any' && styles.filterTextActive]}>
              All Locations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, workArrangement === 'remote' && styles.filterChipActive]}
            onPress={() => setWorkArrangement('remote')}
          >
            <Text style={[styles.filterText, workArrangement === 'remote' && styles.filterTextActive]}>
              Remote
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, workArrangement === 'hybrid' && styles.filterChipActive]}
            onPress={() => setWorkArrangement('hybrid')}
          >
            <Text style={[styles.filterText, workArrangement === 'hybrid' && styles.filterTextActive]}>
              Hybrid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, workArrangement === 'on-site' && styles.filterChipActive]}
            onPress={() => setWorkArrangement('on-site')}
          >
            <Text style={[styles.filterText, workArrangement === 'on-site' && styles.filterTextActive]}>
              On-Site
            </Text>
          </TouchableOpacity>

          {/* Level Separator */}
          <View style={styles.filterDivider} />

          <TouchableOpacity
            style={[styles.filterChip, experienceLevel === 'entry' && styles.filterChipActive]}
            onPress={() => setExperienceLevel(experienceLevel === 'entry' ? 'any' : 'entry')}
          >
            <Text style={[styles.filterText, experienceLevel === 'entry' && styles.filterTextActive]}>
              Entry / Fresher
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, experienceLevel === 'mid' && styles.filterChipActive]}
            onPress={() => setExperienceLevel(experienceLevel === 'mid' ? 'any' : 'mid')}
          >
            <Text style={[styles.filterText, experienceLevel === 'mid' && styles.filterTextActive]}>
              Mid-Level
            </Text>
          </TouchableOpacity>
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
        {loading ? (
          <LoadingState message="Fetching live job postings & synthesizing provider feeds…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchJobs} />
        ) : jobs.length === 0 ? (
          <EmptyState
            emoji="💼"
            title="No matching job listings"
            message={`No listings matched "${keyword}". Try searching for broader terms like "Software Engineer" or "Developer".`}
            actionLabel="Reset Filters"
            onAction={() => {
              setKeyword('');
              setWorkArrangement('any');
              setExperienceLevel('any');
            }}
          />
        ) : (
          jobs.map((job) => {
            const isBookmarked = savedJobIds.has(job.id);

            return (
              <Card
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                style={styles.jobCard}
              >
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                    <Text style={styles.companyMeta}>
                      {job.company} · {job.location}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleBookmark(job)}
                    style={styles.bookmarkBtn}
                    accessibilityLabel="Bookmark job"
                  >
                    <Text style={styles.bookmarkIcon}>{isBookmarked ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Excerpt */}
                <Text style={styles.jobExcerpt} numberOfLines={2}>
                  {job.excerpt || job.description.replace(/<[^>]+>/g, '').slice(0, 140)}
                </Text>

                {/* Tags row */}
                <View style={styles.tagsRow}>
                  <MetricBadge label={job.workArrangement} variant="demand" />
                  {job.experienceLevel !== 'unspecified' && (
                    <MetricBadge label={job.experienceLevel} variant="neutral" />
                  )}
                  {job.salary?.raw && (
                    <Text style={styles.salaryText}>{job.salary.raw}</Text>
                  )}
                </View>

                {/* Footer with Attribution & Fit CTA */}
                <View style={styles.cardFooter}>
                  <Text style={styles.sourceText}>
                    Source: {job.sourceName || job.provider} · {new Date(job.retrievedAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.ctaRow}>
                    {job.originalUrl ? (
                      <TouchableOpacity
                        onPress={() => handleOpenExternal(job.originalUrl)}
                        style={styles.externalLinkBtn}
                      >
                        <Text style={styles.externalLinkText}>Original ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.analyzePrompt}>Check Match →</Text>
                  </View>
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
  searchBarContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
  },
  clearText: {
    color: Colors.text.muted,
    fontSize: 16,
    padding: Spacing.xs,
  },
  filterBar: {
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingBottom: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterChipActive: {
    backgroundColor: Colors.brand.from,
    borderColor: Colors.brand.from,
  },
  filterText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.default,
    marginHorizontal: 4,
  },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  jobCard: {
    marginBottom: Spacing.md,
    padding: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  jobTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  companyMeta: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  bookmarkBtn: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 20,
    color: '#F59E0B',
  },
  jobExcerpt: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    marginVertical: Spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  salaryText: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sourceText: {
    color: Colors.text.muted,
    fontSize: 10,
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  externalLinkBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  externalLinkText: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  analyzePrompt: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
});
