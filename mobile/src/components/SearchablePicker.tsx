/**
 * SearchablePicker — modal with search input and paginated list.
 * Used for course catalogue and skill catalogue selection.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radius, Shadow, Spacing, Typography } from '../constants/design';
import Input from './Input';

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: PickerItem) => void;
  selectedIds?: string[];
  title: string;
  placeholder?: string;
  loadItems: (search: string) => Promise<PickerItem[]>;
  multiSelect?: boolean;
}

export default function SearchablePicker({
  visible,
  onClose,
  onSelect,
  selectedIds = [],
  title,
  placeholder = 'Search…',
  loadItems,
  multiSelect = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const result = await loadItems(q);
        setItems(result);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [loadItems]
  );

  useEffect(() => {
    if (visible) {
      setQuery('');
      fetchItems('');
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <Input
            placeholder={placeholder}
            value={query}
            onChangeText={setQuery}
            containerStyle={{ marginBottom: Spacing.sm }}
            autoFocus
          />

          {loading ? (
            <ActivityIndicator color={Colors.brand.from} style={{ marginTop: Spacing.xl }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => {
                      onSelect(item);
                      if (!multiSelect) onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {item.meta ? (
                      <Text style={styles.itemMeta}>{item.meta}</Text>
                    ) : null}
                    {isSelected ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.empty}>No results found</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.bg.overlay,
  },
  sheet: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  closeIcon: {
    color: Colors.text.muted,
    fontSize: 18,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  itemSelected: {
    borderColor: Colors.brand.from,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  itemText: { flex: 1 },
  itemTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '500',
  },
  itemSub: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  itemMeta: {
    color: Colors.brand.to,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  check: {
    color: Colors.brand.from,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
    fontSize: Typography.sizes.base,
  },
});
