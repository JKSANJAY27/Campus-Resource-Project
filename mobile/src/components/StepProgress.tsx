/**
 * StepProgress — visual progress bar shown at the top of every onboarding screen.
 * Renders filled/unfilled dots and a progress bar to communicate wizard position.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/design';

interface Props {
  current: number;  // 1-based
  total: number;
  label?: string;
}

export default function StepProgress({ current, total, label }: Props) {
  const pct = ((current - 1) / (total - 1)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>Step {current} of {total}</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < current ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  step: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  label: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  track: {
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.brand.from,
    borderRadius: Radius.full,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.border.default,
  },
  dotActive: {
    backgroundColor: Colors.brand.from,
    width: 18,
  },
});
