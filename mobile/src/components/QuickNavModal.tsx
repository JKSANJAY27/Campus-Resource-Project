import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import { SECTIONS } from '../constants/routes';

interface QuickNavModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickNavModal({ visible, onClose }: QuickNavModalProps) {
  const navigateTo = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheetContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>All 10 Platform Sections</Text>
              <Text style={styles.subtitle}>Direct Navigation Hub</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {SECTIONS.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                onPress={() => navigateTo(sec.route)}
                style={styles.item}
                activeOpacity={0.7}
              >
                <View style={styles.emojiCircle}>
                  <Text style={styles.emojiText}>{sec.emoji}</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{sec.title}</Text>
                  <Text style={styles.itemDesc}>{sec.desc}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emojiText: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  arrow: {
    color: Colors.brand.to,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
});
