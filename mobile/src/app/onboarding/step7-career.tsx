/**
 * Onboarding Step 7 — Career Preferences
 * Collects:
 *   - Career interests (role types they're targeting)
 *   - General interests / hobbies
 *   - Preferred job locations
 *   - Work arrangement (remote/hybrid/onsite/any)
 *   - Role level preference (internship/entry-level/experienced/any)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/design';
import { useOnboarding } from '../../context/OnboardingContext';
import StepProgress from '../../components/StepProgress';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import type { WorkArrangement, RoleLevelPreference } from '../../types';

const TOTAL_STEPS = 7;

const CAREER_SUGGESTIONS = [
  'Software Engineer', 'Backend Developer', 'Frontend Developer',
  'Full Stack Developer', 'Data Scientist', 'ML Engineer',
  'DevOps Engineer', 'Cloud Engineer', 'Mobile Developer',
  'Product Manager', 'Security Engineer', 'AI Researcher',
  'Embedded Systems Engineer', 'Game Developer', 'Blockchain Developer',
];

const INTEREST_SUGGESTIONS = [
  'Open Source', 'Competitive Programming', 'Hackathons',
  'Research', 'Startups', 'Finance & FinTech', 'EdTech',
  'HealthTech', 'Gaming', 'Robotics', 'IoT', 'AR/VR',
];

const LOCATIONS = [
  'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Pune',
  'Chennai', 'Kolkata', 'Remote', 'Abroad', 'Any',
];

const ARRANGEMENTS: { label: string; value: WorkArrangement }[] = [
  { label: '🌐 Remote', value: 'remote' },
  { label: '🏢 Hybrid', value: 'hybrid' },
  { label: '🏬 On-site', value: 'onsite' },
  { label: '✨ Any', value: 'any' },
];

const ROLE_LEVELS: { label: string; value: RoleLevelPreference; desc: string }[] = [
  { label: '🎓 Internship', value: 'internship', desc: 'Paid internships & co-ops' },
  { label: '🚀 Entry Level', value: 'entry_level', desc: 'New grad / 0-2 years' },
  { label: '💼 Experienced', value: 'experienced', desc: '3+ years experience' },
  { label: '✨ Open to All', value: 'any', desc: 'No preference' },
];

export default function Step7Career() {
  const { state, update } = useOnboarding();
  const [careerInterests, setCareerInterests] = useState<string[]>(state.careerInterests);
  const [interests, setInterests] = useState<string[]>(state.interests);
  const [locations, setLocations] = useState<string[]>(state.preferredLocations);
  const [arrangement, setArrangement] = useState<WorkArrangement>(state.workArrangement);
  const [roleLevel, setRoleLevel] = useState<RoleLevelPreference>(state.roleLevelPreference);
  const [careerInput, setCareerInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  function toggleItem<T extends string>(list: T[], setList: (v: T[]) => void, item: T) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function addCustom(
    input: string,
    setInput: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void
  ) {
    const val = input.trim();
    if (val && !list.includes(val)) setList([...list, val]);
    setInput('');
  }

  function handleSubmit() {
    update({
      careerInterests,
      interests,
      preferredLocations: locations,
      workArrangement: arrangement,
      roleLevelPreference: roleLevel,
    });
    router.push('/onboarding/submitting');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StepProgress current={7} total={TOTAL_STEPS} label="Career Preferences" />

        <Text style={styles.title}>Career goals</Text>
        <Text style={styles.subtitle}>
          Almost done! Tell us about your aspirations so we can deliver relevant opportunities.
        </Text>

        {/* Career interests */}
        <Text style={styles.fieldLabel}>Target Roles / Career Paths</Text>
        <View style={styles.suggestionWrap}>
          {CAREER_SUGGESTIONS.map((c) => (
            <Tag
              key={c}
              label={c}
              scheme="neutral"
              selected={careerInterests.includes(c)}
              onPress={() => toggleItem(careerInterests, setCareerInterests, c)}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add custom role…"
            placeholderTextColor={Colors.text.muted}
            value={careerInput}
            onChangeText={setCareerInput}
            onSubmitEditing={() => addCustom(careerInput, setCareerInput, careerInterests, setCareerInterests)}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.addTagBtn}
            onPress={() => addCustom(careerInput, setCareerInput, careerInterests, setCareerInterests)}
          >
            <Text style={styles.addTagText}>Add</Text>
          </TouchableOpacity>
        </View>
        {careerInterests.length > 0 ? (
          <View style={styles.selectedWrap}>
            {careerInterests.filter((c) => !CAREER_SUGGESTIONS.includes(c)).map((c) => (
              <Tag key={c} label={c} scheme="skill" onRemove={() => setCareerInterests((prev) => prev.filter((x) => x !== c))} />
            ))}
          </View>
        ) : null}

        {/* Interests */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Interests & Domains</Text>
        <View style={styles.suggestionWrap}>
          {INTEREST_SUGGESTIONS.map((s) => (
            <Tag
              key={s}
              label={s}
              scheme="neutral"
              selected={interests.includes(s)}
              onPress={() => toggleItem(interests, setInterests, s)}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add custom interest…"
            placeholderTextColor={Colors.text.muted}
            value={interestInput}
            onChangeText={setInterestInput}
            onSubmitEditing={() => addCustom(interestInput, setInterestInput, interests, setInterests)}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.addTagBtn}
            onPress={() => addCustom(interestInput, setInterestInput, interests, setInterests)}
          >
            <Text style={styles.addTagText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Preferred Locations */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Preferred Job Locations</Text>
        <View style={styles.suggestionWrap}>
          {LOCATIONS.map((loc) => (
            <Tag
              key={loc}
              label={loc}
              scheme="neutral"
              selected={locations.includes(loc)}
              onPress={() => toggleItem(locations, setLocations, loc)}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add city or country…"
            placeholderTextColor={Colors.text.muted}
            value={locationInput}
            onChangeText={setLocationInput}
            onSubmitEditing={() => addCustom(locationInput, setLocationInput, locations, setLocations)}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.addTagBtn}
            onPress={() => addCustom(locationInput, setLocationInput, locations, setLocations)}
          >
            <Text style={styles.addTagText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Work Arrangement */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Work Arrangement</Text>
        <View style={styles.arrangementRow}>
          {ARRANGEMENTS.map((a) => (
            <TouchableOpacity
              key={a.value}
              style={[styles.arrangementBtn, arrangement === a.value && styles.arrangementBtnActive]}
              onPress={() => setArrangement(a.value)}
            >
              <Text style={[styles.arrangementText, arrangement === a.value && styles.arrangementTextActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Role Level */}
        <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Role Level</Text>
        <View style={styles.levelGrid}>
          {ROLE_LEVELS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.levelCard, roleLevel === r.value && styles.levelCardActive]}
              onPress={() => setRoleLevel(r.value)}
            >
              <Text style={styles.levelEmoji}>{r.label.split(' ')[0]}</Text>
              <Text style={[styles.levelName, roleLevel === r.value && styles.levelNameActive]}>
                {r.label.slice(r.label.indexOf(' ') + 1)}
              </Text>
              <Text style={styles.levelDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.btnRow}>
          <Button label="← Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.backBtn} />
          <Button label="Submit Profile 🚀" onPress={handleSubmit} size="md" style={styles.nextBtn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xl },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm, letterSpacing: 0.3, textTransform: 'uppercase' },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tagInput: { flex: 1, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, color: Colors.text.primary, fontSize: Typography.sizes.sm },
  addTagBtn: { backgroundColor: Colors.bg.cardElevated, borderWidth: 1, borderColor: Colors.border.active, borderRadius: Radius.md, paddingHorizontal: Spacing.base, justifyContent: 'center' },
  addTagText: { color: Colors.brand.to, fontWeight: '600', fontSize: Typography.sizes.sm },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  arrangementRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  arrangementBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default, backgroundColor: Colors.bg.card },
  arrangementBtnActive: { borderColor: Colors.brand.from, backgroundColor: 'rgba(99,102,241,0.15)' },
  arrangementText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: '600' },
  arrangementTextActive: { color: Colors.brand.to },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  levelCard: {
    width: '47%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.base,
    alignItems: 'flex-start',
  },
  levelCardActive: { borderColor: Colors.brand.from, backgroundColor: 'rgba(99,102,241,0.12)' },
  levelEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  levelName: { color: Colors.text.secondary, fontWeight: '600', fontSize: Typography.sizes.sm },
  levelNameActive: { color: Colors.brand.to },
  levelDesc: { color: Colors.text.muted, fontSize: Typography.sizes.xs, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing['2xl'] },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
