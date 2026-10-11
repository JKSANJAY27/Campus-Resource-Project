/**
 * Welcome / Landing screen — shown on first launch.
 * Auto-redirects to profile if a studentId is already persisted.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import Button from '../components/Button';
import { getPersistedStudentId } from '../api/client';

export default function WelcomeScreen() {
  useEffect(() => {
    // If already onboarded, skip to profile
    getPersistedStudentId().then((id) => {
      if (id) router.replace('/profile');
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.logoRing}>
            <Text style={styles.logoEmoji}>🎓</Text>
          </View>
          <Text style={styles.headline}>Campus Career</Text>
          <Text style={styles.tagline}>Your personalized career{'\n'}intelligence platform</Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            label="Get Started"
            onPress={() => router.push('/onboarding/step1-basic')}
            size="lg"
            style={styles.ctaBtn}
          />
          <Text style={styles.disclaimer}>
            Takes about 5 minutes · No account required
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    emoji: '🗺️',
    title: 'Skill Dependency Graph',
    desc: 'Understand exactly what to learn next based on your current skills.',
  },
  {
    emoji: '💼',
    title: 'Career Recommendations',
    desc: 'Discover roles that match your profile across internships and jobs.',
  },
  {
    emoji: '📚',
    title: 'Course Intelligence',
    desc: 'Map completed courses to skills with nuanced competence tracking.',
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Spacing['2xl'],
  },
  hero: { alignItems: 'center', paddingTop: Spacing['3xl'] },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 2,
    borderColor: Colors.brand.from,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  logoEmoji: { fontSize: 48 },
  headline: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  features: {
    gap: Spacing.base,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.base,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: { fontSize: 22 },
  featureText: { flex: 1 },
  featureTitle: {
    color: Colors.text.primary,
    fontWeight: '600',
    fontSize: Typography.sizes.base,
    marginBottom: 2,
  },
  featureDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  cta: { alignItems: 'center', gap: Spacing.md },
  ctaBtn: { width: '100%' },
  disclaimer: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
