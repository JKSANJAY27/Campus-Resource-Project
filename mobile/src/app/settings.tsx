import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../constants/design';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  testApiHealth,
  getPersistedStudentId,
  persistStudentId,
  clearPersistedStudentId,
  DEFAULT_API_URL,
} from '../api/client';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import QuickNavModal from '../components/QuickNavModal';

const PRESET_URLS = [
  { label: 'Android Emulator', url: 'http://10.0.2.2:5000/api/v1' },
  { label: 'Localhost / Web', url: 'http://localhost:5000/api/v1' },
  { label: 'Default 5000', url: DEFAULT_API_URL },
];

const PRESET_STUDENTS = [
  { label: 'Aarav Patel (CS Sem 6)', id: 'stu_aarav_patel_001' },
  { label: 'Priya Sharma (Data Sem 6)', id: 'stu_priya_sharma_002' },
  { label: 'Rohan Verma (Cyber Sem 7)', id: 'stu_rohan_verma_003' },
];

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [activeStudentId, setActiveStudentId] = useState('');
  const [customStudentInput, setCustomStudentInput] = useState('');
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [quickNavVisible, setQuickNavVisible] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
    getPersistedStudentId().then((id) => {
      setActiveStudentId(id || 'None (Logged out)');
    });
  }, []);

  const handleSaveApiUrl = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('URL Required', 'Please enter a valid backend API URL.');
      return;
    }
    await setApiBaseUrl(apiUrl.trim());
    Alert.alert('Saved', `API Base URL updated to:\n${apiUrl.trim()}`);
  };

  const handleResetApiUrl = async () => {
    await resetApiBaseUrl();
    setApiUrl(DEFAULT_API_URL);
    Alert.alert('Reset', `API Base URL reset to default: ${DEFAULT_API_URL}`);
  };

  const handleTestConnection = async () => {
    setTestingHealth(true);
    setHealthStatus(null);
    try {
      const res = await testApiHealth();
      if (res.ok) {
        setHealthStatus(`✅ Connected (${res.latencyMs}ms roundtrip) - ${res.status}`);
      } else {
        setHealthStatus(`⚠️ Server reachable but returned ${res.status} (${res.latencyMs}ms)`);
      }
    } catch (err: any) {
      setHealthStatus(`❌ Connection failed: ${err.message}`);
    } finally {
      setTestingHealth(false);
    }
  };

  const handleSwitchStudent = async (id: string) => {
    await persistStudentId(id);
    setActiveStudentId(id);
    Alert.alert('Active Student Changed', `Active session studentId set to: ${id}`);
  };

  const handleRestartOnboarding = async () => {
    Alert.alert(
      'Reset Session',
      'This will clear the current persisted studentId and return to the onboarding flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Onboard',
          style: 'destructive',
          onPress: async () => {
            await clearPersistedStudentId();
            router.replace('/onboarding/step1-basic');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Settings"
        subtitle="Configuration & Diagnostics"
        showBack
        onOpenNav={() => setQuickNavVisible(true)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Backend Endpoint Config */}
        <Card elevated style={styles.card}>
          <Text style={styles.cardTitle}>🌐 Backend API Endpoint</Text>
          <Text style={styles.subtext}>
            Mobile connects exclusively through Express backend APIs. No direct DB access.
          </Text>

          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://10.0.2.2:5000/api/v1"
            placeholderTextColor={Colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            {PRESET_URLS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                onPress={() => setApiUrl(preset.url)}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRow}>
            <Button
              label="Save URL"
              onPress={handleSaveApiUrl}
              style={{ flex: 1 }}
            />
            <Button
              label={testingHealth ? 'Pinging…' : 'Ping /health'}
              onPress={handleTestConnection}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>

          {healthStatus ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{healthStatus}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleResetApiUrl} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset to Default (Port 5000)</Text>
          </TouchableOpacity>
        </Card>

        {/* Active Student Profile Switcher */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>👤 Active Student Profile</Text>
          <Text style={styles.subtext}>
            Currently persisted student: <Text style={styles.activeIdHighlight}>{activeStudentId}</Text>
          </Text>

          <Text style={styles.groupLabel}>Preset Candidates:</Text>
          <View style={styles.studentPresets}>
            {PRESET_STUDENTS.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => handleSwitchStudent(st.id)}
                style={[
                  styles.studentChip,
                  activeStudentId === st.id && styles.studentChipActive,
                ]}
              >
                <Text style={styles.studentChipText}>{st.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Or enter custom studentId…"
              placeholderTextColor={Colors.text.muted}
              value={customStudentInput}
              onChangeText={setCustomStudentInput}
            />
            <Button
              label="Switch"
              onPress={() => {
                if (customStudentInput.trim()) {
                  handleSwitchStudent(customStudentInput.trim());
                  setCustomStudentInput('');
                }
              }}
              style={{ paddingHorizontal: Spacing.md }}
            />
          </View>
        </Card>

        {/* Session Management */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Onboarding & Session</Text>
          <Text style={styles.subtext}>
            Re-run the initial 7-step student onboarding wizard or clear credentials.
          </Text>

          <Button
            label="Restart Onboarding Wizard"
            onPress={handleRestartOnboarding}
            variant="secondary"
          />
        </Card>

        {/* Architecture & About */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ App Architecture & Tech Stack</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Framework:</Text>
            <Text style={styles.infoVal}>React Native 0.86 + Expo 57</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Navigation:</Text>
            <Text style={styles.infoVal}>Expo Router v5 (File-based)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Backend APIs:</Text>
            <Text style={styles.infoVal}>Node.js / Express REST (/api/v1)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Security Rule:</Text>
            <Text style={styles.infoVal}>Strict No-Direct-DB connection</Text>
          </View>
        </Card>
      </ScrollView>

      <QuickNavModal
        visible={quickNavVisible}
        onClose={() => setQuickNavVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
  card: {
    padding: Spacing.base,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtext: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 42,
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs + 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  presetChip: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  presetChipText: {
    color: Colors.brand.to,
    fontSize: 11,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statusText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    padding: 4,
  },
  resetText: {
    color: Colors.text.muted,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  activeIdHighlight: {
    color: Colors.brand.to,
    fontWeight: '700',
  },
  groupLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  studentPresets: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  studentChip: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  studentChipActive: {
    borderColor: Colors.brand.from,
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  studentChipText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoKey: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  infoVal: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});
