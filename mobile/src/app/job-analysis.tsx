import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import { analyzeJobText, getPersistedStudentId } from '../api/client';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import MetricBadge from '../components/MetricBadge';
import SkillPill from '../components/SkillPill';
import QuickNavModal from '../components/QuickNavModal';
import type { JobDescriptionAnalysis } from '../types';

const SAMPLE_POSTINGS = [
  {
    label: 'Backend Engineer',
    title: 'Senior Backend Engineer',
    company: 'Fintech Scaleup',
    text: `Requirements:
- 3+ years of experience building scalable backend microservices.
- Proficiency in Node.js, TypeScript, Express, and PostgreSQL.
- Experience with Redis caching and Docker containerization.
- Knowledge of AWS (EC2, S3) and CI/CD automation pipelines.
- Bachelor's or Master's in Computer Science.`,
  },
  {
    label: 'Frontend Developer',
    title: 'React UI Developer',
    company: 'SaaS Platform',
    text: `Looking for a Frontend Developer:
- 1-2 years experience with React.js, Next.js, and TypeScript.
- Strong knowledge of HTML5, CSS3, Tailwind CSS, and Flexbox.
- Familiarity with RESTful API integration and GraphQL.
- Bachelor's degree in engineering or equivalent practical experience.`,
  },
  {
    label: 'ML / Data Science',
    title: 'Associate Machine Learning Engineer',
    company: 'AI Research Lab',
    text: `Responsibilities:
- Train deep learning models with PyTorch, Scikit-Learn, and Python.
- Perform exploratory data analysis using Pandas and NumPy.
- Apply linear algebra, statistical hypothesis testing, and NLP.
- Master's in Data Science or Artificial Intelligence preferred.`,
  },
];

export default function JobSkillAnalysisScreen() {
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [analysis, setAnalysis] = useState<JobDescriptionAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const handleAnalyze = async () => {
    if (!jobText.trim()) {
      Alert.alert('Text Required', 'Please paste or type a job description to analyze.');
      return;
    }

    setAnalyzing(true);
    try {
      const studentId = await getPersistedStudentId();
      const result = await analyzeJobText({
        text: jobText,
        title: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        studentId: studentId || undefined,
        forceFresh: true,
      });

      setAnalysis(result);
    } catch (err: any) {
      Alert.alert('Analysis Failed', err.message || 'Unable to analyze text.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadSample = (sample: typeof SAMPLE_POSTINGS[0]) => {
    setJobTitle(sample.title);
    setCompany(sample.company);
    setJobText(sample.text);
  };

  const comparison = analysis?.comparison;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Job Skill Analysis"
        subtitle="Offline NLP Extraction & Evidence Audit"
        showBack
        onOpenNav={() => setQuickNavVisible(true)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Input Box Card */}
        <Card elevated style={styles.inputCard}>
          <Text style={styles.cardHeading}>Paste Job Description</Text>
          <Text style={styles.subtext}>
            Evaluates technical skills, tools, and experience without external AI APIs:
          </Text>

          {/* Quick Preset Samples */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetLabel}>Quick Sample:</Text>
            {SAMPLE_POSTINGS.map((sample) => (
              <TouchableOpacity
                key={sample.label}
                onPress={() => loadSample(sample)}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{sample.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldsRow}>
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              placeholder="Job Title (optional)"
              placeholderTextColor={Colors.text.muted}
              value={jobTitle}
              onChangeText={setJobTitle}
            />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              placeholder="Company (optional)"
              placeholderTextColor={Colors.text.muted}
              value={company}
              onChangeText={setCompany}
            />
          </View>

          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            placeholder="Paste raw requirements text from LinkedIn, Naukri, or job board…"
            placeholderTextColor={Colors.text.muted}
            value={jobText}
            onChangeText={setJobText}
            textAlignVertical="top"
          />

          <Button
            label={analyzing ? 'Extracting Skills…' : '🔍 Analyze Job Requirements'}
            onPress={handleAnalyze}
            disabled={analyzing}
            style={styles.analyzeBtn}
          />
        </Card>

        {analyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.brand.from} />
            <Text style={styles.loadingText}>
              Matching skills against curated catalogue & scanning student evidence…
            </Text>
          </View>
        )}

        {/* Results Section */}
        {analysis && !analyzing && (
          <View style={styles.resultsContainer}>
            {/* Candidate Match Score */}
            {comparison && (
              <Card style={styles.matchCard} accentBorder={Colors.brand.from}>
                <View style={styles.matchHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeading}>Candidate Match Audit</Text>
                    <Text style={styles.subtext}>
                      Strictly segregated: Completed courses are counted as academic-only exposure.
                    </Text>
                  </View>
                  <MetricBadge
                    label="Compatibility"
                    scoreValue={comparison.overallCompatibilityScore}
                    variant="score"
                  />
                </View>

                {/* Evidence Grid */}
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
                    <Text style={styles.evidenceLabel}>Coursework Only</Text>
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

                {/* Readiness Assessment */}
                <View style={styles.readinessBox}>
                  <Text style={styles.readinessText}>
                    💡 {comparison.readinessAssessment}
                  </Text>
                  {comparison.experienceFit?.note && (
                    <Text style={styles.experienceNote}>
                      {comparison.experienceFit.note}
                    </Text>
                  )}
                </View>

                {/* Matched Skills */}
                {comparison.matchedSkills.length > 0 && (
                  <View style={styles.skillsSection}>
                    <Text style={styles.groupTitle}>✓ Verified Candidate Matches:</Text>
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
                  <View style={styles.skillsSection}>
                    <Text style={[styles.groupTitle, { color: '#F43F5E' }]}>
                      ✕ Missing Skills:
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

            {/* Extracted Specifications */}
            <Card style={styles.extractedCard}>
              <Text style={styles.cardHeading}>
                📊 Extracted Job Requirements ({analysis.totalSkillsDetected} terms detected)
              </Text>

              {analysis.technicalSkills.length > 0 && (
                <View style={styles.specGroup}>
                  <Text style={styles.specTitle}>Technical Skills & Languages:</Text>
                  <View style={styles.pillsWrap}>
                    {analysis.technicalSkills.map((s) => (
                      <SkillPill key={s.id} name={s.canonicalName} termFrequency={s.termFrequency} />
                    ))}
                  </View>
                </View>
              )}

              {analysis.toolsAndFrameworks.length > 0 && (
                <View style={styles.specGroup}>
                  <Text style={styles.specTitle}>Tools, Frameworks & Infrastructure:</Text>
                  <View style={styles.pillsWrap}>
                    {analysis.toolsAndFrameworks.map((t) => (
                      <SkillPill key={t.id} name={t.canonicalName} termFrequency={t.termFrequency} />
                    ))}
                  </View>
                </View>
              )}

              {/* Experience and Qualifications */}
              <View style={styles.metaSummaryRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeLabel}>Seniority Level</Text>
                  <Text style={styles.metaBadgeVal}>
                    {analysis.experience.level.toUpperCase()}
                    {analysis.experience.minYears !== null ? ` (${analysis.experience.minYears}+ yrs)` : ''}
                  </Text>
                </View>
                {analysis.qualifications.degrees.length > 0 && (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeLabel}>Education</Text>
                    <Text style={styles.metaBadgeVal}>
                      {analysis.qualifications.degrees.map((d) => d.rawMention).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
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
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
  inputCard: {
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
    marginBottom: Spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginRight: 2,
  },
  presetChip: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  presetChipText: {
    color: Colors.brand.to,
    fontSize: 11,
    fontWeight: '600',
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputField: {
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  textArea: {
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    height: 130,
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs + 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  analyzeBtn: {
    width: '100%',
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: Spacing.base,
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
  readinessText: {
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
  skillsSection: {
    marginTop: Spacing.sm,
  },
  groupTitle: {
    color: '#10B981',
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  extractedCard: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  specGroup: {
    marginTop: Spacing.xs,
  },
  specTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  metaBadge: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  metaBadgeLabel: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  metaBadgeVal: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginTop: 2,
  },
});
