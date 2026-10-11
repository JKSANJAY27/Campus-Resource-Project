/**
 * Onboarding Step 6 — Certifications
 * Students can add certifications with name, issuer, issue date, and credential URL.
 * These are linked to the 'verified' competence tier server-side.
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
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Button from '../../components/Button';
import Input from '../../components/Input';
import type { StudentCertification } from '../../types';

const TOTAL_STEPS = 7;

const POPULAR_ISSUERS = [
  'Google', 'Meta', 'AWS', 'Microsoft', 'Coursera', 'Udemy',
  'NPTEL', 'HackerRank', 'Cisco', 'CompTIA', 'Oracle', 'IBM',
];

export default function Step6Certs() {
  const { state, update } = useOnboarding();
  const [certs, setCerts] = useState<StudentCertification[]>(state.certifications);
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  function openNew() {
    setEditIndex(null);
    setModalVisible(true);
  }

  function openEdit(index: number) {
    setEditIndex(index);
    setModalVisible(true);
  }

  function saveCert(data: StudentCertification) {
    if (editIndex !== null) {
      setCerts((prev) => prev.map((c, i) => (i === editIndex ? data : c)));
    } else {
      setCerts((prev) => [...prev, data]);
    }
    setModalVisible(false);
  }

  function removeCert(index: number) {
    setCerts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNext() {
    update({ certifications: certs });
    router.push('/onboarding/step7-career');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepProgress current={6} total={TOTAL_STEPS} label="Certifications" />

        <Text style={styles.title}>Certifications</Text>
        <Text style={styles.subtitle}>
          Add relevant certificates. These are marked as <Text style={styles.highlight}>verified</Text> competence evidence — the highest credibility tier.
        </Text>

        <Button label="+ Add Certification" variant="secondary" onPress={openNew} style={styles.addBtn} />

        {certs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏅</Text>
            <Text style={styles.emptyText}>No certifications added yet</Text>
            <Text style={styles.emptyHint}>Certifications give your skills the highest credibility</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {certs.map((cert, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.certBadge}>
                    <Text style={styles.certBadgeText}>🏅</Text>
                  </View>
                  <View style={styles.certInfo}>
                    <Text style={styles.certName} numberOfLines={1}>{cert.name}</Text>
                    <Text style={styles.certIssuer}>{cert.issuer}</Text>
                    {cert.issueDate ? <Text style={styles.certDate}>{cert.issueDate}</Text> : null}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(i)}>
                      <Text style={{ fontSize: 16 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeCert(i)}>
                      <Text style={{ fontSize: 16 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {cert.credentialUrl ? (
                  <Text style={styles.credUrl} numberOfLines={1}>🔗 {cert.credentialUrl}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.btnRow}>
          <Button label="← Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.backBtn} />
          <Button label="Continue →" onPress={handleNext} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>

      <CertFormModal
        visible={modalVisible}
        initialData={editIndex !== null ? certs[editIndex] : undefined}
        onSave={saveCert}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function CertFormModal({
  visible,
  initialData,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialData?: StudentCertification;
  onSave: (data: StudentCertification) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [issuer, setIssuer] = useState(initialData?.issuer ?? '');
  const [issueDate, setIssueDate] = useState(initialData?.issueDate ?? '');
  const [credentialUrl, setCredentialUrl] = useState(initialData?.credentialUrl ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Certification name is required';
    if (!issuer.trim()) e.issuer = 'Issuing organization is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ name: name.trim(), issuer: issuer.trim(), issueDate: issueDate.trim() || undefined, credentialUrl: credentialUrl.trim() || undefined });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={modal.sheet} keyboardShouldPersistTaps="handled">
          <Text style={modal.title}>{initialData ? 'Edit Certification' : 'Add Certification'}</Text>

          <Input label="Certification Name" placeholder="e.g. AWS Certified Developer" value={name} onChangeText={setName} error={errors.name} required />

          <Text style={modal.fieldLabel}>Issuing Organization</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {POPULAR_ISSUERS.map((org) => (
              <TouchableOpacity
                key={org}
                style={[modal.chip, issuer === org && modal.chipActive]}
                onPress={() => setIssuer(org)}
              >
                <Text style={[modal.chipText, issuer === org && modal.chipTextActive]}>{org}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Input
            placeholder="Or type organization name…"
            value={issuer}
            onChangeText={setIssuer}
            error={errors.issuer}
          />

          <Input
            label="Issue Date (optional)"
            placeholder="e.g. Jan 2025 or 2025-01"
            value={issueDate}
            onChangeText={setIssueDate}
          />

          <Input
            label="Credential URL (optional)"
            placeholder="https://credential.net/…"
            value={credentialUrl}
            onChangeText={setCredentialUrl}
            keyboardType="url"
            autoCapitalize="none"
          />

          <View style={modal.btnRow}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Save" onPress={handleSave} style={{ flex: 2 }} />
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
  highlight: { color: Colors.accent.amber, fontWeight: '600' },
  addBtn: { marginBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.sizes.md, fontWeight: '600' },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: Spacing.xs, textAlign: 'center' },
  list: { gap: Spacing.md, marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.default, ...Shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  certBadge: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' },
  certBadgeText: { fontSize: 22 },
  certInfo: { flex: 1 },
  certName: { color: Colors.text.primary, fontWeight: '700', fontSize: Typography.sizes.base },
  certIssuer: { color: Colors.accent.amber, fontSize: Typography.sizes.xs, fontWeight: '600', marginTop: 2 },
  certDate: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  credUrl: { color: Colors.brand.to, fontSize: Typography.sizes.xs, marginTop: Spacing.sm },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.base },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.bg.overlay },
  sheet: { backgroundColor: Colors.bg.secondary, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: Spacing['3xl'] },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: '700', marginBottom: Spacing.xl },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default, backgroundColor: Colors.bg.card },
  chipActive: { borderColor: Colors.accent.amber, backgroundColor: 'rgba(245,158,11,0.15)' },
  chipText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  chipTextActive: { color: Colors.accent.amber, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.xl },
});
