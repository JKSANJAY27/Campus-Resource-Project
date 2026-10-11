import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Shadow } from '../constants/design';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accentBorder?: string;
  elevated?: boolean;
}

export default function Card({
  children,
  style,
  onPress,
  accentBorder,
  elevated = false,
}: CardProps) {
  const containerStyle = [
    styles.card,
    elevated ? styles.elevated : null,
    accentBorder ? { borderColor: accentBorder, borderWidth: 1.5 } : null,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={containerStyle}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  elevated: {
    backgroundColor: Colors.bg.cardElevated,
    ...Shadow.card,
  },
});
