import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../constants/design';

interface MetricBadgeProps {
  label: string;
  value?: string | number;
  variant?: 'score' | 'fit' | 'demand' | 'tier' | 'neutral';
  scoreValue?: number;
}

export default function MetricBadge({
  label,
  value,
  variant = 'neutral',
  scoreValue,
}: MetricBadgeProps) {
  let bgColor = 'rgba(255,255,255,0.06)';
  let textColor = Colors.text.secondary;
  let borderColor = Colors.border.default;

  if (variant === 'score' || typeof scoreValue === 'number') {
    const s = scoreValue ?? (typeof value === 'number' ? value : parseInt(String(value), 10));
    if (s >= 75) {
      bgColor = 'rgba(16,185,129,0.15)';
      textColor = '#10B981';
      borderColor = 'rgba(16,185,129,0.4)';
    } else if (s >= 50) {
      bgColor = 'rgba(245,158,11,0.15)';
      textColor = '#F59E0B';
      borderColor = 'rgba(245,158,11,0.4)';
    } else {
      bgColor = 'rgba(244,63,94,0.15)';
      textColor = '#F43F5E';
      borderColor = 'rgba(244,63,94,0.4)';
    }
  } else if (variant === 'fit') {
    if (label.includes('High')) {
      bgColor = 'rgba(16,185,129,0.15)';
      textColor = '#10B981';
      borderColor = 'rgba(16,185,129,0.4)';
    } else if (label.includes('Moderate')) {
      bgColor = 'rgba(34,211,238,0.15)';
      textColor = '#22D3EE';
      borderColor = 'rgba(34,211,238,0.4)';
    } else {
      bgColor = 'rgba(245,158,11,0.15)';
      textColor = '#F59E0B';
      borderColor = 'rgba(245,158,11,0.4)';
    }
  } else if (variant === 'demand') {
    bgColor = 'rgba(99,102,241,0.15)';
    textColor = Colors.brand.to;
    borderColor = 'rgba(99,102,241,0.4)';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.text, { color: textColor }]}>
        {value !== undefined ? `${label}: ${value}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
