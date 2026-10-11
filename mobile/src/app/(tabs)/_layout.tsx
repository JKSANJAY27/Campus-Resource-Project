import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { Colors, Typography } from '../../constants/design';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: 'Discovery',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎯" label="Discovery" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'Learning',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📚" label="Paths" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💼" label="Jobs" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    height: 64,
    paddingTop: 6,
    paddingBottom: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  emoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  emojiFocused: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  label: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: '500',
  },
  labelFocused: {
    color: Colors.brand.to,
    fontWeight: '700',
  },
});
