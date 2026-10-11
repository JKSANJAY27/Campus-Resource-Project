import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  onOpenNav?: () => void;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  onOpenNav,
}: HeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={rightAction.accessibilityLabel || 'Header action'}
          >
            <Text style={styles.actionIcon}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
        {onOpenNav && (
          <TouchableOpacity
            onPress={onOpenNav}
            style={styles.navMenuBtn}
            accessibilityRole="button"
            accessibilityLabel="Open all sections menu"
          >
            <Text style={styles.navMenuIcon}>☰</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
  navMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: Colors.brand.from,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMenuIcon: {
    color: Colors.brand.to,
    fontSize: 18,
    fontWeight: '700',
  },
});
