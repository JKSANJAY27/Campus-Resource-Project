/**
 * Profile tab screen — displayed as Tab 5.
 * Fetches and renders the student's full profile summary from the backend.
 * Shows competence breakdown, skills, courses, projects, and certifications.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import { getStudentSummary, getPersistedStudentId, clearPersistedStudentId } from '../../api/client';
import Header from '../../components/Header';
import Tag from '../../components/Tag';
import Button from '../../components/Button';
import QuickNavModal from '../../components/QuickNavModal';
import type { ProfileSummaryResponse, StudentSkill } from '../../types';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'skills' | 'courses' | 'projects' | 'certs'>('skills');
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const id = await getPersistedStudentId();
      if (!id) {
        router.replace('/');
        return;
      }
      const data = await getStudentSummary(id);
      setProfile(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Profile" onOpenNav={() => setQuickNavVisible(true)} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand.from} size="large" />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Profile" onOpenNav={() => setQuickNavVisible(true)} />
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load profile</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Button label="Retry" onPress={loadProfile} style={{ marginTop: Spacing.xl }} />
        </View>
        <QuickNavModal visible={quickNavVisible} onClose={() => setQuickNavVisible(false)} />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const { competenceBreakdown } = profile;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="My Profile"
        subtitle={`${profile.degree} · ${profile.branch}`}
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
        {/* Header Avatar Row */}
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.rollNumber}>{profile.rollNumber}</Text>
            <Text style={styles.meta}>{profile.degree} · {profile.branch}</Text>
            <Text style={styles.meta}>{profile.institution}</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatCard label="Skills" value={profile.totalSkillsCount} emoji="⚡" />
          <StatCard label="Courses" value={profile.completedCoursesCount} emoji="📚" />
          <StatCard label="Projects" value={profile.customProjects.length} emoji="🛠️" />
          {profile.cgpa > 0 ? <StatCard label="CGPA" value={profile.cgpa} emoji="🎓" decimal /> : null}
        </View>

        {/* Career preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Preferences</Text>
          <View style={styles.prefRow}>
            <PrefChip label={profile.workArrangement} emoji="📍" />
            <PrefChip label={profile.roleLevelPreference.replace('_', ' ')} emoji="💼" />
            {profile.preferredLocations.slice(0, 2).map((l) => (
              <PrefChip key={l} label={l} emoji="🌏" />
            ))}
          </View>
          {profile.careerInterests.length > 0 ? (
            <View style={styles.tagsWrap}>
              {profile.careerInterests.map((c) => (
                <Tag key={c} label={c} scheme="skill" />
              ))}
            </View>
          ) : null}
        </View>

        {/* Competence breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competence Breakdown</Text>
          <View style={styles.competenceGrid}>
            <CompetenceTile
              label="Course Exposure"
              count={competenceBreakdown.courseExposure.count}
              desc={competenceBreakdown.courseExposure.description}
              color={Colors.brand.from}
              emoji="📖"
            />
            <CompetenceTile
              label="Self Reported"
              count={competenceBreakdown.selfReported.count}
              desc={competenceBreakdown.selfReported.description}
              color={Colors.accent.cyan}
              emoji="✋"
            />
            <CompetenceTile
              label="Project Demonstrated"
              count={competenceBreakdown.projectDemonstrated.count}
              desc={competenceBreakdown.projectDemonstrated.description}
              color={Colors.accent.green}
              emoji="🛠️"
            />
            <CompetenceTile
              label="Verified"
              count={competenceBreakdown.verified.count}
              desc={competenceBreakdown.verified.description}
              color={Colors.accent.amber}
              emoji="🏅"
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['skills', 'courses', 'projects', 'certs'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'skills' && <SkillsTab skills={profile.competenceBreakdown} />}
        {activeTab === 'courses' && <CoursesTab courses={profile.completedCourses} />}
        {activeTab === 'projects' && <ProjectsTab projects={profile.customProjects} />}
        {activeTab === 'certs' && <CertsTab certifications={profile.certifications} />}

        {/* Switch student / Onboarding shortcut */}
        <TouchableOpacity
          style={styles.signOut}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.signOutText}>⚙️ Switch Student / Manage Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      <QuickNavModal
        visible={quickNavVisible}
        onClose={() => setQuickNavVisible(false)}
      />
    </SafeAreaView>
  );
}

const TAB_LABELS = {
  skills: 'Skills',
  courses: 'Courses',
  projects: 'Projects',
  certs: 'Certifications',
};

function StatCard({ label, value, emoji, decimal }: { label: string; value: number; emoji: string; decimal?: boolean }) {
  return (
    <View style={stat.card}>
      <Text style={stat.emoji}>{emoji}</Text>
      <Text style={stat.value}>{decimal ? value.toFixed(1) : value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

function PrefChip({ label, emoji }: { label: string; emoji: string }) {
  return (
    <View style={pref.chip}>
      <Text style={pref.emoji}>{emoji}</Text>
      <Text style={pref.label}>{label}</Text>
    </View>
  );
}

function CompetenceTile({
  label,
  count,
  desc,
  color,
  emoji,
}: {
  label: string;
  count: number;
  desc: string;
  color: string;
  emoji: string;
}) {
  return (
    <View style={[comp.tile, { borderColor: color }]}>
      <View style={comp.iconRow}>
        <Text style={comp.emoji}>{emoji}</Text>
        <Text style={[comp.count, { color }]}>{count}</Text>
      </View>
      <Text style={[comp.label, { color }]}>{label.toUpperCase()}</Text>
      <Text style={comp.desc} numberOfLines={2}>{desc}</Text>
    </View>
  );
}

function SkillsTab({ skills }: { skills: ProfileSummaryResponse['competenceBreakdown'] }) {
  const allSkills = [
    ...skills.projectDemonstrated.skills.map((s) => ({ ...s, tierLabel: 'Proven', scheme: 'project' as const })),
    ...skills.verified.skills.map((s) => ({ ...s, tierLabel: 'Verified', scheme: 'cert' as const })),
    ...skills.courseExposure.skills.map((s) => ({ ...s, tierLabel: 'Course', scheme: 'course' as const })),
    ...skills.selfReported.skills.map((s) => ({ ...s, tierLabel: 'Self', scheme: 'skill' as const })),
  ];

  if (allSkills.length === 0) {
    return <EmptyTab emoji="⚡" label="No skills added yet" />;
  }

  return (
    <View style={styles.tagsWrap}>
      {allSkills.map((s) => (
        <Tag key={s.skillId} label={`${s.name} (${s.tierLabel})`} scheme={s.scheme} />
      ))}
    </View>
  );
}

function CoursesTab({ courses }: { courses: ProfileSummaryResponse['completedCourses'] }) {
  if (courses.length === 0) {
    return <EmptyTab emoji="📚" label="No completed courses recorded" />;
  }

  return (
    <View style={styles.listGap}>
      {courses.map((c) => (
        <View key={c.courseId} style={styles.listCard}>
          <Text style={styles.listCardTitle}>{c.code}: {c.title}</Text>
          <View style={styles.listCardMeta}>
            <Text style={styles.listCardGrade}>Grade: {c.grade}</Text>
            <Text style={styles.meta}>· Semester {c.completedSemester}</Text>
            <Text style={styles.meta}>· {c.credits} Credits</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ProjectsTab({ projects }: { projects: ProfileSummaryResponse['customProjects'] }) {
  if (projects.length === 0) {
    return <EmptyTab emoji="🛠️" label="No custom projects added" />;
  }

  return (
    <View style={styles.listGap}>
      {projects.map((p) => (
        <View key={p.projectId} style={styles.listCard}>
          <Text style={styles.listCardTitle}>{p.title}</Text>
          {p.role ? <Text style={styles.listCardRole}>{p.role}</Text> : null}
          {p.description ? <Text style={styles.listCardDesc}>{p.description}</Text> : null}
          <View style={[styles.tagsWrap, { marginTop: Spacing.sm }]}>
            {p.technologiesUsed.map((t) => (
              <Tag key={t} label={t} scheme="skill" />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CertsTab({ certifications }: { certifications: ProfileSummaryResponse['certifications'] }) {
  if (certifications.length === 0) {
    return <EmptyTab emoji="🏅" label="No certifications added" />;
  }

  return (
    <View style={styles.listGap}>
      {certifications.map((c, i) => (
        <View key={i} style={styles.listCard}>
          <Text style={styles.listCardTitle}>{c.name}</Text>
          <Text style={styles.listCardRole}>{c.issuer}</Text>
          {c.issueDate ? <Text style={styles.listCardDesc}>{c.issueDate}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function EmptyTab({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: Spacing['2xl'] }}>
      <Text style={{ fontSize: 40, marginBottom: Spacing.md }}>{emoji}</Text>
      <Text style={{ color: Colors.text.muted, fontSize: Typography.sizes.base }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.base },
  errorEmoji: { fontSize: 48, marginBottom: Spacing.md },
  errorTitle: { color: Colors.accent.rose, fontWeight: '700', fontSize: Typography.sizes.xl },
  errorMsg: { color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm },

  header: { flexDirection: 'row', gap: Spacing.base, marginBottom: Spacing.xl, alignItems: 'flex-start' },
  avatarRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99,102,241,0.2)', borderWidth: 2, borderColor: Colors.brand.from, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.brand.to, fontSize: Typography.sizes.xl, fontWeight: '800' },
  headerInfo: { flex: 1 },
  name: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '800' },
  rollNumber: { color: Colors.brand.to, fontSize: Typography.sizes.xs, fontWeight: '600', marginTop: 2 },
  meta: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.sizes.md, fontWeight: '700', marginBottom: Spacing.base },
  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  competenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border.default, paddingBottom: Spacing.sm },
  tab: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.brand.from },
  tabText: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  tabTextActive: { color: Colors.brand.to, fontWeight: '600' },

  listGap: { gap: Spacing.sm, marginBottom: Spacing.xl },
  listCard: { backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.default },
  listCardTitle: { color: Colors.text.primary, fontWeight: '600', fontSize: Typography.sizes.base, marginBottom: Spacing.xs },
  listCardRole: { color: Colors.accent.green, fontSize: Typography.sizes.xs, fontWeight: '600', marginBottom: Spacing.xs },
  listCardGrade: { color: Colors.text.primary, fontWeight: '700' },
  listCardDesc: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, lineHeight: 18 },
  listCardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  signOut: { marginTop: Spacing['2xl'], alignItems: 'center', paddingVertical: Spacing.md },
  signOutText: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
});

const stat = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default, ...Shadow.card },
  emoji: { fontSize: 18, marginBottom: 2 },
  value: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '800' },
  label: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
});

const pref = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.bg.card, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border.default },
  emoji: { fontSize: 12 },
  label: { color: Colors.text.secondary, fontSize: Typography.sizes.xs, fontWeight: '500', textTransform: 'capitalize' },
});

const comp = StyleSheet.create({
  tile: { width: '47%', backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, ...Shadow.card },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  emoji: { fontSize: 20 },
  count: { fontSize: Typography.sizes['2xl'], fontWeight: '800' },
  label: { fontSize: Typography.sizes.xs, fontWeight: '700', letterSpacing: 0.3, marginBottom: Spacing.xs },
  desc: { color: Colors.text.muted, fontSize: Typography.sizes.xs, lineHeight: 16 },
});
