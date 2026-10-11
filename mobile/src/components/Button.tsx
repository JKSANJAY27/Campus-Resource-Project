import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Shadow, Spacing, Typography } from '../constants/design';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: Props) {
  const container: ViewStyle[] = [styles.base, styles[`size_${size}`] as ViewStyle];
  const labelStyle: TextStyle[] = [styles.label, styles[`labelSize_${size}`] as TextStyle];

  if (variant === 'primary') {
    container.push(styles.primary);
    labelStyle.push(styles.labelPrimary);
  } else if (variant === 'secondary') {
    container.push(styles.secondary);
    labelStyle.push(styles.labelSecondary);
  } else if (variant === 'ghost') {
    container.push(styles.ghost);
    labelStyle.push(styles.labelGhost);
  } else if (variant === 'danger') {
    container.push(styles.danger);
    labelStyle.push(styles.labelDanger);
  }

  if (disabled || loading) container.push(styles.disabled);

  return (
    <TouchableOpacity
      style={[...container, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.text.inverse : Colors.brand.from}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[...labelStyle, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    ...Shadow.button,
  },
  size_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  size_md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  size_lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },

  primary: {
    backgroundColor: Colors.brand.from,
  },
  secondary: {
    backgroundColor: Colors.bg.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border.active,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  danger: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.rose,
  },
  disabled: { opacity: 0.5 },

  label: { ...Typography.subheading },
  labelSize_sm: { fontSize: Typography.sizes.sm },
  labelSize_md: { fontSize: Typography.sizes.base },
  labelSize_lg: { fontSize: Typography.sizes.md },

  labelPrimary: { color: Colors.text.primary },
  labelSecondary: { color: Colors.brand.to },
  labelGhost: { color: Colors.text.secondary },
  labelDanger: { color: Colors.accent.rose },
});
