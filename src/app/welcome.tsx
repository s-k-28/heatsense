import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EntryButton, EntryHeader, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { Entry } from '@/constants/entry-theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <EntryScreen>{(compact) => <>
      <EntryHeader />
      <View style={[styles.illustration, compact && { marginVertical: 12 }]}>
        <FieldlineScene compact={compact} />
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>Read the heat.{'\n'}Ready the team.</Text>
        <Text style={entryStyles.description}>Know the field conditions. Build your practice plan. Keep your team in view.</Text>
      </View>
      <View style={styles.productLine}>
        <View style={styles.signal} />
        <Text style={styles.productText}>Field readings first. Wristband optional.</Text>
      </View>
      <View style={styles.actions}>
        <EntryButton label="Get started" onPress={() => router.push('/sign-in')} />
        <Text style={[entryStyles.note, { marginTop: 14 }]}>Made for coaches and athletes.</Text>
      </View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 24 },
  copy: { paddingTop: 8 },
  productLine: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopColor: Entry.line, borderTopWidth: 1, marginTop: 24, paddingTop: 18 },
  signal: { width: 4, height: 24, borderRadius: 2, backgroundColor: Entry.blue },
  productText: { color: Entry.ink, flexShrink: 1, fontFamily: Entry.medium, fontSize: 13, lineHeight: 20 },
  actions: { marginTop: 28 },
});
