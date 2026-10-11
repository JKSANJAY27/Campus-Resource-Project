import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import Button from './Button';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={Colors.brand.from} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.emoji}>⚠️</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          style={styles.retryBtn}
        />
      )}
    </View>
  );
}

export function EmptyState({
  emoji = '🔍',
  title = 'No items found',
  message,
  actionLabel,
  onAction,
}: {
  emoji?: string;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.retryBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  loadingText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.md,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    minWidth: 140,
  },
});
