import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../constants/design';
import { StudentEvidenceTier } from '../types';

interface SkillPillProps {
  name: string;
  evidenceTier?: StudentEvidenceTier | 'missing' | string;
  isCore?: boolean;
  termFrequency?: number;
}

export default function SkillPill({
  name,
  evidenceTier,
  isCore,
  termFrequency,
}: SkillPillProps) {
  let badgeLabel = '';
  let badgeColor = Colors.text.muted;
  let bg = 'rgba(255,255,255,0.05)';
  let borderColor = Colors.border.default;

  if (evidenceTier === 'proven_experience' || evidenceTier === 'project_demonstrated') {
    badgeLabel = '✓ Proven';
    badgeColor = '#10B981';
    bg = 'rgba(16,185,129,0.12)';
    borderColor = 'rgba(16,185,129,0.35)';
  } else if (evidenceTier === 'course_completed' || evidenceTier === 'course_exposure') {
    badgeLabel = 'Course Only';
    badgeColor = '#A78BFA';
    bg = 'rgba(167,139,250,0.12)';
    borderColor = 'rgba(167,139,250,0.35)';
  } else if (evidenceTier === 'self_reported') {
    badgeLabel = 'Self Reported';
    badgeColor = '#F59E0B';
    bg = 'rgba(245,158,11,0.12)';
    borderColor = 'rgba(245,158,11,0.35)';
  } else if (evidenceTier === 'none' || evidenceTier === 'missing') {
    badgeLabel = 'Missing';
    badgeColor = '#F43F5E';
    bg = 'rgba(244,63,94,0.12)';
    borderColor = 'rgba(244,63,94,0.35)';
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor }]}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
        {isCore && <Text style={styles.coreDot}> ★</Text>}
      </Text>
      {termFrequency && termFrequency > 1 ? (
        <Text style={styles.freqTag}>×{termFrequency}</Text>
      ) : null}
      {badgeLabel ? (
        <View style={[styles.tierBadge, { borderColor }]}>
          <Text style={[styles.tierText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: '600',
  },
  coreDot: {
    color: '#F59E0B',
    fontSize: 10,
  },
  freqTag: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
  },
  tierBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    borderLeftWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
