/**
 * Onboarding Step 5 — Projects
 * Students can add custom projects with:
 *   - Title, description, role, link
 *   - Technologies used (free-text tags)
 *   - Skills demonstrated (links to skill catalogue)
 * Project skills are pushed with 'project_demonstrated' competence server-side.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import Input from '../../components/Input';
import type { StudentCustomProject } from '../../types';

const TOTAL_STEPS = 7;

const BLANK_PROJECT: Omit<StudentCustomProject, 'projectId'> = {
  title: '',
  description: '',
  technologiesUsed: [],
  skillsDemonstrated: [],
  role: 'Developer',
  link: '',
};

export default function Step5Projects() {
  const { state, update } = useOnboarding();
  const [projects, setProjects] = useState<StudentCustomProject[]>(state.customProjects);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProject, setEditProject] = useState<StudentCustomProject | null>(null);

  function openNew() {
    setEditProject(null);
    setModalVisible(true);
  }

  function openEdit(p: StudentCustomProject) {
    setEditProject(p);
    setModalVisible(true);
  }

  function saveProject(data: Omit<StudentCustomProject, 'projectId'>) {
    if (editProject) {
      setProjects((prev) =>
        prev.map((p) => (p.projectId === editProject.projectId ? { ...data, projectId: editProject.projectId } : p))
      );
    } else {
      const newProject: StudentCustomProject = {
        ...data,
        projectId: `proj_${Date.now()}`,
      };
      setProjects((prev) => [...prev, newProject]);
    }
    setModalVisible(false);
  }

  function removeProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.projectId !== id));
  }

  function handleNext() {
    update({ customProjects: projects });
    router.push('/onboarding/step6-certs');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepProgress current={5} total={TOTAL_STEPS} label="Projects" />

        <Text style={styles.title}>Your projects</Text>
        <Text style={styles.subtitle}>
          Add side projects, academic work, or open-source contributions. Technologies and skills you tag here feed into your <Text style={styles.highlight}>project-demonstrated</Text> competence tier.
        </Text>

        <Button label="+ Add Project" variant="secondary" onPress={openNew} style={styles.addBtn} />

        {projects.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛠️</Text>
            <Text style={styles.emptyText}>No projects added yet</Text>
            <Text style={styles.emptyHint}>Showcasing real projects boosts your profile significantly</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {projects.map((p) => (
              <View key={p.projectId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.cardRole}>{p.role}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn}>
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeProject(p.projectId)} style={styles.actionBtn}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {p.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text>
                ) : null}
                <View style={styles.tagsRow}>
                  {p.technologiesUsed.slice(0, 4).map((t) => (
                    <Tag key={t} label={t} scheme="project" />
                  ))}
                  {p.technologiesUsed.length > 4 ? (
                    <Tag label={`+${p.technologiesUsed.length - 4}`} scheme="neutral" />
                  ) : null}
                </View>
                {p.link ? <Text style={styles.link} numberOfLines={1}>🔗 {p.link}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.btnRow}>
          <Button label="← Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.backBtn} />
          <Button label="Continue →" onPress={handleNext} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>

      <ProjectFormModal
        visible={modalVisible}
        initialData={editProject ?? undefined}
        onSave={saveProject}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function ProjectFormModal({
  visible,
  initialData,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialData?: StudentCustomProject;
  onSave: (data: Omit<StudentCustomProject, 'projectId'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [role, setRole] = useState(initialData?.role ?? 'Developer');
  const [link, setLink] = useState(initialData?.link ?? '');
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(initialData?.technologiesUsed ?? []);
  const [skillInput, setSkillInput] = useState('');
  const [skillsDemonstrated, setSkillsDemonstrated] = useState<string[]>(initialData?.skillsDemonstrated ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addTech() {
    const t = techInput.trim();
    if (t && !technologies.includes(t)) setTechnologies((prev) => [...prev, t]);
    setTechInput('');
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skillsDemonstrated.includes(s)) setSkillsDemonstrated((prev) => [...prev, s]);
    setSkillInput('');
  }

  function handleSave() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Project title is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ title: title.trim(), description: description.trim(), role: role.trim(), link: link.trim(), technologiesUsed: technologies, skillsDemonstrated });
  }

  const ROLES = ['Developer', 'Lead', 'Contributor', 'Designer', 'Researcher', 'DevOps'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={modal.sheet} keyboardShouldPersistTaps="handled">
          <Text style={modal.title}>{initialData ? 'Edit Project' : 'New Project'}</Text>

          <Input label="Project Title" placeholder="e.g. Campus Resource Graph" value={title} onChangeText={setTitle} error={errors.title} required />
          <Input label="Description" placeholder="Briefly describe what you built and why" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

          <Text style={modal.fieldLabel}>Your Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, marginBottom: Spacing.base }}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} style={[modal.chip, role === r && modal.chipActive]} onPress={() => setRole(r)}>
                <Text style={[modal.chipText, role === r && modal.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input label="Project Link (optional)" placeholder="https://github.com/…" value={link} onChangeText={setLink} keyboardType="url" autoCapitalize="none" />

          {/* Technologies */}
          <Text style={modal.fieldLabel}>Technologies Used</Text>
          <View style={modal.inputRow}>
            <TextInput
              style={modal.tagInput}
              placeholder="e.g. React Native"
              placeholderTextColor={Colors.text.muted}
              value={techInput}
              onChangeText={setTechInput}
              onSubmitEditing={addTech}
              returnKeyType="done"
            />
            <TouchableOpacity style={modal.addTagBtn} onPress={addTech}>
              <Text style={modal.addTagText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={modal.tagsWrap}>
            {technologies.map((t) => (
              <Tag key={t} label={t} scheme="project" onRemove={() => setTechnologies((prev) => prev.filter((x) => x !== t))} />
            ))}
          </View>

          {/* Skills demonstrated — free-text IDs or names */}
          <Text style={modal.fieldLabel}>Skills Demonstrated (optional)</Text>
          <Text style={modal.hint}>These get tagged as project-demonstrated evidence</Text>
          <View style={modal.inputRow}>
            <TextInput
              style={modal.tagInput}
              placeholder="e.g. sk_python or Python"
              placeholderTextColor={Colors.text.muted}
              value={skillInput}
              onChangeText={setSkillInput}
              onSubmitEditing={addSkill}
              returnKeyType="done"
            />
            <TouchableOpacity style={modal.addTagBtn} onPress={addSkill}>
              <Text style={modal.addTagText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={modal.tagsWrap}>
            {skillsDemonstrated.map((s) => (
              <Tag key={s} label={s} scheme="skill" onRemove={() => setSkillsDemonstrated((prev) => prev.filter((x) => x !== s))} />
            ))}
          </View>

          <View style={modal.btnRow}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Save Project" onPress={handleSave} style={{ flex: 2 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xl },
  highlight: { color: Colors.accent.green, fontWeight: '600' },
  addBtn: { marginBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.sizes.md, fontWeight: '600' },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.default, ...Shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardTitle: { color: Colors.text.primary, fontWeight: '700', fontSize: Typography.sizes.base },
  cardRole: { color: Colors.accent.green, fontSize: Typography.sizes.xs, fontWeight: '600', marginTop: 2 },
  cardDesc: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, lineHeight: 18, marginBottom: Spacing.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { padding: Spacing.xs },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  link: { color: Colors.brand.to, fontSize: Typography.sizes.xs, marginTop: Spacing.sm },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.base },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.bg.overlay },
  sheet: { backgroundColor: Colors.bg.secondary, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: Spacing['3xl'] },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '700', marginBottom: Spacing.xl },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  hint: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default, backgroundColor: Colors.bg.card },
  chipActive: { borderColor: Colors.accent.green, backgroundColor: 'rgba(16,185,129,0.15)' },
  chipText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  chipTextActive: { color: Colors.accent.green, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tagInput: { flex: 1, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, color: Colors.text.primary, fontSize: Typography.sizes.sm },
  addTagBtn: { backgroundColor: Colors.bg.cardElevated, borderWidth: 1, borderColor: Colors.border.active, borderRadius: Radius.md, paddingHorizontal: Spacing.base, justifyContent: 'center' },
  addTagText: { color: Colors.brand.to, fontWeight: '600', fontSize: Typography.sizes.sm },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.base },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.xl },
});
