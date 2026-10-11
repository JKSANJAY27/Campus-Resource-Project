/**
 * Onboarding Step 4 — Skills
 * Students can:
 *  - Search and add skills from the backend catalogue (self_reported)
 *  - Set proficiency level (beginner / intermediate / advanced)
 *  - Optionally provide evidence description
 * Skills sourced from completed courses appear here too (course_exposure),
 * but are injected server-side during onboard call — not duplicated here.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import SearchablePicker, { PickerItem } from '../../components/SearchablePicker';
import Input from '../../components/Input';
import { getSkills } from '../../api/client';
import type { StudentSkill, SkillProficiencyLevel, CompetenceType } from '../../types';

const TOTAL_STEPS = 7;
const LEVELS: SkillProficiencyLevel[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_COLOR: Record<SkillProficiencyLevel, string> = {
  beginner: Colors.accent.cyan,
  intermediate: Colors.accent.amber,
  advanced: Colors.accent.rose,
};

export default function Step4Skills() {
  const { state, update } = useOnboarding();
  const [skills, setSkills] = useState<StudentSkill[]>(state.skills);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editSkill, setEditSkill] = useState<StudentSkill | null>(null);

  const loadSkills = useCallback(async (search: string): Promise<PickerItem[]> => {
    try {
      const res = await getSkills({ search, limit: 40 });
      return (res.skills || []).map((s: any) => ({
        id: s.skillId || s._id,
        title: s.name,
        subtitle: s.category,
        meta: s.tier,
      }));
    } catch {
      return SAMPLE_SKILLS.filter(
        (s) =>
          !search ||
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          (s.subtitle || '').toLowerCase().includes(search.toLowerCase())
      );
    }
  }, []);

  function handleSelectSkill(item: PickerItem) {
    if (skills.find((s) => s.skillId === item.id)) return;
    const newSkill: StudentSkill = {
      skillId: item.id,
      name: item.title,
      category: item.subtitle || '',
      tier: item.meta || 'foundational',
      level: 'intermediate',
      competenceType: 'self_reported',
    };
    setSkills((prev) => [...prev, newSkill]);
    setEditSkill(newSkill);
  }

  function updateSkill(skillId: string, changes: Partial<StudentSkill>) {
    setSkills((prev) => prev.map((s) => (s.skillId === skillId ? { ...s, ...changes } : s)));
  }

  function removeSkill(skillId: string) {
    setSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  }

  function handleNext() {
    update({ skills });
    router.push('/onboarding/step5-projects');
  }

  // Group skills by competence type
  const selfReported = skills.filter((s) => s.competenceType === 'self_reported');
  const otherSkills = skills.filter((s) => s.competenceType !== 'self_reported');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepProgress current={4} total={TOTAL_STEPS} label="Skills" />

        <Text style={styles.title}>Your skills</Text>
        <Text style={styles.subtitle}>
          Add self-reported skills and set your proficiency level. Skills from courses you added are tracked separately as <Text style={styles.highlight}>course exposure</Text> and won't override your self-reported level.
        </Text>

        <Button
          label="+ Add Skill"
          variant="secondary"
          onPress={() => setPickerVisible(true)}
          style={styles.addBtn}
        />

        {skills.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⚡</Text>
            <Text style={styles.emptyText}>No skills added yet</Text>
            <Text style={styles.emptyHint}>Course skills are added automatically on submit</Text>
          </View>
        ) : (
          <View style={styles.skillGrid}>
            {skills.map((skill) => (
              <TouchableOpacity
                key={skill.skillId}
                style={styles.skillCard}
                onPress={() => setEditSkill(skill)}
                activeOpacity={0.8}
              >
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName} numberOfLines={1}>{skill.name}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill.skillId)} hitSlop={8}>
                    <Text style={styles.removeX}>×</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.skillMeta}>
                  <View style={[styles.levelDot, { backgroundColor: LEVEL_COLOR[skill.level] }]} />
                  <Text style={[styles.levelText, { color: LEVEL_COLOR[skill.level] }]}>
                    {skill.level}
                  </Text>
                  <Text style={styles.categoryText}>· {skill.category}</Text>
                </View>
                {skill.evidenceDescription ? (
                  <Text style={styles.evidence} numberOfLines={1}>{skill.evidenceDescription}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.btnRow}>
          <Button label="← Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.backBtn} />
          <Button label="Continue →" onPress={handleNext} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>

      <SearchablePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectSkill}
        selectedIds={skills.map((s) => s.skillId)}
        title="Skill Catalogue"
        placeholder="Search skills…"
        loadItems={loadSkills}
        multiSelect
      />

      {editSkill ? (
        <SkillEditModal
          skill={editSkill}
          onSave={(changes) => {
            updateSkill(editSkill.skillId, changes);
            setEditSkill(null);
          }}
          onClose={() => setEditSkill(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SkillEditModal({
  skill,
  onSave,
  onClose,
}: {
  skill: StudentSkill;
  onSave: (changes: Partial<StudentSkill>) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<SkillProficiencyLevel>(skill.level);
  const [evidence, setEvidence] = useState(skill.evidenceDescription || '');

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{skill.name}</Text>
          <Text style={modal.sub}>{skill.category} · {skill.tier}</Text>

          <Text style={modal.fieldLabel}>Proficiency Level</Text>
          <View style={modal.levelRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  modal.levelBtn,
                  { borderColor: level === l ? LEVEL_COLOR[l] : Colors.border.default },
                  level === l && { backgroundColor: `${LEVEL_COLOR[l]}22` },
                ]}
                onPress={() => setLevel(l)}
              >
                <Text style={[modal.levelText, { color: level === l ? LEVEL_COLOR[l] : Colors.text.muted }]}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Evidence / Context (optional)"
            placeholder="e.g. Built a REST API with Node.js for a college project"
            value={evidence}
            onChangeText={setEvidence}
            multiline
            numberOfLines={3}
            hint="Helps recruiters understand your real experience"
            containerStyle={{ marginTop: Spacing.base }}
          />

          <View style={modal.btnRow}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label="Save"
              onPress={() => onSave({ level, evidenceDescription: evidence.trim() || undefined })}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SAMPLE_SKILLS: PickerItem[] = [
  { id: 'sk_python', title: 'Python', subtitle: 'Programming', meta: 'foundational' },
  { id: 'sk_js', title: 'JavaScript', subtitle: 'Programming', meta: 'foundational' },
  { id: 'sk_ts', title: 'TypeScript', subtitle: 'Programming', meta: 'intermediate' },
  { id: 'sk_react', title: 'React', subtitle: 'Frontend', meta: 'intermediate' },
  { id: 'sk_node', title: 'Node.js', subtitle: 'Backend', meta: 'intermediate' },
  { id: 'sk_sql', title: 'SQL', subtitle: 'Databases', meta: 'foundational' },
  { id: 'sk_mongo', title: 'MongoDB', subtitle: 'Databases', meta: 'intermediate' },
  { id: 'sk_git', title: 'Git', subtitle: 'DevOps', meta: 'foundational' },
  { id: 'sk_docker', title: 'Docker', subtitle: 'DevOps', meta: 'intermediate' },
  { id: 'sk_ml', title: 'Machine Learning', subtitle: 'AI/ML', meta: 'advanced' },
  { id: 'sk_dl', title: 'Deep Learning', subtitle: 'AI/ML', meta: 'advanced' },
  { id: 'sk_java', title: 'Java', subtitle: 'Programming', meta: 'foundational' },
  { id: 'sk_cpp', title: 'C++', subtitle: 'Programming', meta: 'foundational' },
  { id: 'sk_rest', title: 'REST APIs', subtitle: 'Backend', meta: 'intermediate' },
  { id: 'sk_graphql', title: 'GraphQL', subtitle: 'Backend', meta: 'advanced' },
  { id: 'sk_linux', title: 'Linux', subtitle: 'Systems', meta: 'foundational' },
  { id: 'sk_aws', title: 'AWS', subtitle: 'Cloud', meta: 'advanced' },
  { id: 'sk_dsa', title: 'Data Structures & Algorithms', subtitle: 'Computer Science', meta: 'foundational' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xl },
  highlight: { color: Colors.brand.to, fontWeight: '600' },
  addBtn: { marginBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.sizes.md, fontWeight: '600' },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: Spacing.xs, textAlign: 'center' },
  skillGrid: { gap: Spacing.sm, marginBottom: Spacing.xl },
  skillCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadow.card,
  },
  skillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  skillName: { color: Colors.text.primary, fontWeight: '600', fontSize: Typography.sizes.base, flex: 1 },
  removeX: { color: Colors.text.muted, fontSize: 22, lineHeight: 24 },
  skillMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  categoryText: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  evidence: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: Spacing.xs, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.base },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.bg.overlay },
  sheet: { backgroundColor: Colors.bg.secondary, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginBottom: Spacing.base },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.base },
  levelRow: { flexDirection: 'row', gap: Spacing.sm },
  levelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  levelText: { fontWeight: '600', fontSize: Typography.sizes.sm },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.xl },
});
