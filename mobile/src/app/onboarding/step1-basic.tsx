/**
 * Onboarding Step 1 — Basic personal information
 * Collects: name, email, roll number
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Input from '../../components/Input';
import Button from '../../components/Button';

const TOTAL_STEPS = 7;

export default function Step1Basic() {
  const { state, update } = useOnboarding();
  const [name, setName] = useState(state.name);
  const [email, setEmail] = useState(state.email);
  const [rollNumber, setRollNumber] = useState(state.rollNumber);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (!rollNumber.trim()) e.rollNumber = 'Roll number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    update({ name: name.trim(), email: email.trim(), rollNumber: rollNumber.trim() });
    router.push('/onboarding/step2-academic');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepProgress current={1} total={TOTAL_STEPS} label="Basic Info" />

        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>
          Let's start with the basics. This helps personalise your career recommendations.
        </Text>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Sanjay Kumar"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
            required
          />
          <Input
            label="Email Address"
            placeholder="e.g. sanjay@college.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            required
          />
          <Input
            label="Roll Number / Student ID"
            placeholder="e.g. 21CS001"
            value={rollNumber}
            onChangeText={setRollNumber}
            autoCapitalize="characters"
            error={errors.rollNumber}
            required
          />
        </View>

        <Button label="Continue →" onPress={handleNext} size="lg" style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  form: { marginBottom: Spacing.xl },
  btn: { marginTop: Spacing.sm },
});
