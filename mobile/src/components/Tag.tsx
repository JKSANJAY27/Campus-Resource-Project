/**
 * Tag — a compact pill used for skills, courses, technologies, etc.
 * Supports multiple color schemes and optional remove button.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/design';

type Scheme = 'course' | 'skill' | 'project' | 'cert' | 'neutral';

interface Props {
  label: string;
  scheme?: Scheme;
  onRemove?: () => void;
  onPress?: () => void;
  selected?: boolean;
}

export default function Tag({ label, scheme = 'neutral', onRemove, onPress, selected }: Props) {
  const colors =
    scheme === 'neutral'
      ? {
          bg: selected ? 'rgba(99,102,241,0.2)' : Colors.bg.cardElevated,
          text: selected ? Colors.brand.to : Colors.text.secondary,
          border: selected ? Colors.border.active : Colors.border.default,
        }
      : Colors.badge[scheme];

  const content = (
    <View
      style={[
        styles.tag,
        { backgroundColor: colors.bg, borderColor: (colors as any).border },
      ]}
    >
      <Text style={[styles.label, { color: (colors as any).text }]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
          <Text style={[styles.removeIcon, { color: (colors as any).text }]}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: Spacing.xs,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
    maxWidth: 140,
  },
  removeBtn: { marginLeft: 2 },
  removeIcon: { fontSize: 16, lineHeight: 18 },
});
