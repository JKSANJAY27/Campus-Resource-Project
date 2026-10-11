import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/design';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export default function Input({
  label,
  hint,
  error,
  containerStyle,
  required,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      ) : null}
      <TextInput
        {...inputProps}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          inputProps.style,
        ]}
        placeholderTextColor={Colors.text.muted}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  required: { color: Colors.accent.rose },
  input: {
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  inputFocused: {
    borderColor: Colors.brand.from,
    backgroundColor: Colors.bg.card,
  },
  inputError: { borderColor: Colors.accent.rose },
  hint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  error: {
    color: Colors.accent.rose,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
