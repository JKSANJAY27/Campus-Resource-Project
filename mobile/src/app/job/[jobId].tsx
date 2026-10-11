import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import {
  getJobById,
  analyzeJobListing,
  getPersistedStudentId,
  toggleSaveJob,
  isJobSaved,
} from '../../api/client';
import Header from '../../components/Header';
import Card from '../../components/Card';
import MetricBadge from '../../components/MetricBadge';
import SkillPill from '../../components/SkillPill';
import QuickNavModal from '../../components/QuickNavModal';
import { LoadingState, ErrorState } from '../../components/StateFeedback';
import type { NormalizedJob, JobDescriptionAnalysis } from '../../types';

export default function JobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<NormalizedJob | null>(null);
  const [analysis, setAnalysis] = useState<JobDescriptionAnalysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const studentId = await getPersistedStudentId();
      const [j, a, isBookmarked] = await Promise.all([
        getJobById(jobId),
        analyzeJobListing(jobId, studentId || undefined).catch(() => null),
        isJobSaved(jobId),
      ]);

      setJob(j);
      setAnalysis(a);
      setSaved(isBookmarked);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const onRefresh = () => {
    setRefreshing(true);
    loadJob();
  };

  const handleToggleBookmark = async () => {
    if (!job) return;
    const nowSaved = await toggleSaveJob(job);
    setSaved(nowSaved);
  };

  const handleOpenOriginal = async () => {
    if (!job?.originalUrl) return;
    try {
      const can = await Linking.canOpenURL(job.originalUrl);
      if (can) Linking.openURL(job.originalUrl);
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Job Analysis" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <LoadingState message="Analyzing job description requirements against your profile evidence…" />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Job Analysis" showBack onOpenNav={() => setQuickNavVisible(true)} />
        <ErrorState message={error || 'Job not found'} onRetry={loadJob} />
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  const comparison = analysis?.comparison;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title={job.title}
        subtitle={`${job.company} · ${job.location}`}
        showBack
        rightAction={{
          icon: saved ? '★' : '☆',
          onPress: handleToggleBookmark,
          accessibilityLabel: 'Toggle bookmark',
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
        {/* Job Header Meta Card */}
        <Card elevated style={styles.metaCard}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.company} · {job.location}</Text>

          <View style={styles.tagsRow}>
            <MetricBadge label={job.workArrangement} variant="demand" />
            <MetricBadge label={job.employmentType} variant="neutral" />
            {job.experienceLevel !== 'unspecified' && (
              <MetricBadge label={`Level: ${job.experienceLevel}`} variant="neutral" />
            )}
            {job.salary?.raw && (
              <Text style={styles.salary}>{job.salary.raw}</Text>
            )}
          </View>

          <View style={styles.sourceMetaRow}>
            <Text style={styles.sourceText}>
              Attribution: {job.sourceName || job.provider} · Retrieved {new Date(job.retrievedAt).toLocaleDateString()}
            </Text>
            {job.originalUrl ? (
              <TouchableOpacity onPress={handleOpenOriginal} style={styles.externalBtn}>
                <Text style={styles.externalBtnText}>Apply / View Original ↗</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* Candidate Compatibility Card */}
        {comparison && (
          <Card style={styles.matchCard} accentBorder={Colors.brand.from}>
            <View style={styles.matchHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Candidate Match Analysis</Text>
                <Text style={styles.subtext}>
                  Evaluated using lightweight offline dictionary matching with strict evidence tiers:
                </Text>
              </View>
              <MetricBadge
                label="Compatibility"
                scoreValue={comparison.overallCompatibilityScore}
                variant="score"
              />
            </View>

            {/* Evidence Distribution */}
            <View style={styles.evidenceGrid}>
              <View style={styles.evidenceBox}>
                <Text style={[styles.evidenceVal, { color: '#10B981' }]}>
                  {comparison.evidenceDistribution.provenCount}
                </Text>
                <Text style={styles.evidenceLabel}>Proven (Projects)</Text>
              </View>
              <View style={styles.evidenceDivider} />
              <View style={styles.evidenceBox}>
                <Text style={[styles.evidenceVal, { color: '#A78BFA' }]}>
                  {comparison.evidenceDistribution.courseCount}
                </Text>
                <Text style={styles.evidenceLabel}>Academic Only</Text>
              </View>
              <View style={styles.evidenceDivider} />
              <View style={styles.evidenceBox}>
                <Text style={[styles.evidenceVal, { color: '#F59E0B' }]}>
                  {comparison.evidenceDistribution.selfReportedCount}
                </Text>
                <Text style={styles.evidenceLabel}>Self-Reported</Text>
              </View>
              <View style={styles.evidenceDivider} />
              <View style={styles.evidenceBox}>
                <Text style={[styles.evidenceVal, { color: '#F43F5E' }]}>
                  {comparison.evidenceDistribution.missingCount}
                </Text>
                <Text style={styles.evidenceLabel}>Missing</Text>
              </View>
            </View>

            {/* Readiness Assessment Quote */}
            <View style={styles.readinessBox}>
              <Text style={styles.readinessQuote}>
                💡 {comparison.readinessAssessment}
              </Text>
              {comparison.experienceFit && (
                <Text style={styles.experienceNote}>
                  {comparison.experienceFit.note}
                </Text>
              )}
            </View>

            {/* Matched Skills */}
            {comparison.matchedSkills.length > 0 && (
              <View style={styles.skillGroup}>
                <Text style={styles.skillGroupTitle}>✓ Demonstrated Requirements:</Text>
                <View style={styles.pillsWrap}>
                  {comparison.matchedSkills.map((m) => (
                    <SkillPill
                      key={m.skillId}
                      name={m.name}
                      evidenceTier={m.evidenceTier}
                      termFrequency={m.termFrequencyInJob}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Missing Skills */}
            {comparison.missingSkills.length > 0 && (
              <View style={styles.skillGroup}>
                <Text style={[styles.skillGroupTitle, { color: '#F43F5E' }]}>
                  ✕ Missing Skills to Acquire:
                </Text>
                <View style={styles.pillsWrap}>
                  {comparison.missingSkills.map((m) => (
                    <SkillPill
                      key={m.skillId}
                      name={m.name}
                      evidenceTier="missing"
                      termFrequency={m.termFrequencyInJob}
                    />
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Extracted Qualifications & Seniority */}
        {analysis && (
          <Card style={styles.qualCard}>
            <Text style={styles.cardHeading}>📋 Identified Requirements</Text>

            <View style={styles.qualRow}>
              <Text style={styles.qualLabel}>Seniority:</Text>
              <Text style={styles.qualVal}>
                {analysis.experience.level.toUpperCase()}
                {analysis.experience.minYears !== null ? ` (${analysis.experience.minYears}+ years required)` : ''}
              </Text>
            </View>

            {analysis.qualifications.degrees.length > 0 && (
              <View style={styles.qualRow}>
                <Text style={styles.qualLabel}>Education:</Text>
                <Text style={styles.qualVal}>
                  {analysis.qualifications.degrees.map((d) => d.rawMention).join(', ')}
                </Text>
              </View>
            )}

            {analysis.qualifications.certifications.length > 0 && (
              <View style={styles.qualRow}>
                <Text style={styles.qualLabel}>Certifications:</Text>
                <Text style={styles.qualVal}>
                  {analysis.qualifications.certifications.map((c) => c.name).join(', ')}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Full Job Description */}
        <Card style={styles.descCard}>
          <Text style={styles.cardHeading}>Full Job Description</Text>
          <Text style={styles.descBody}>
            {job.description.replace(/<[^>]+>/g, '')}
          </Text>
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
  metaCard: {
    padding: Spacing.base,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
  },
  company: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  salary: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  sourceMetaRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  sourceText: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  externalBtn: {
    backgroundColor: Colors.brand.from,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  externalBtnText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  matchCard: {
    padding: Spacing.base,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardHeading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  subtext: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  evidenceGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    justifyContent: 'space-around',
    marginVertical: Spacing.sm,
  },
  evidenceBox: {
    alignItems: 'center',
  },
  evidenceVal: {
    fontSize: Typography.sizes.base,
    fontWeight: '800',
  },
  evidenceLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  evidenceDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.default,
  },
  readinessBox: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  readinessQuote: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  experienceNote: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  skillGroup: {
    marginTop: Spacing.sm,
  },
  skillGroupTitle: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qualCard: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  qualRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  qualLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    width: 90,
  },
  qualVal: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  descCard: {
    padding: Spacing.base,
  },
  descBody: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
});
