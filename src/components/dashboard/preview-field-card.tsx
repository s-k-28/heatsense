import { Text } from '@/components/ui/text';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from '@/components/ui/charts';
import { HeatIcon } from '@/components/ui/heat-icon';
import { Card, CardHeader } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { TODAY, ZONES } from '@/lib/practice';
import { usePreferences, useTemperature } from '@/state/preferences';

// Static field preview used only by the explicit dashboard preview states.
type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
} as const satisfies Record<string, IconName>;

// Hourly readings from 7 AM up to now (4:10 PM). There is no forecast, so the line stops at the latest reading.
const HOURLY_WBGT = [62, 64, 67, 71, 75, 79, 82, 84, 84];

/** Today's field reading: the one card every role shares. The figure, how it got there, and what it means. */
export function FieldCard({ onPress, showZone = true }: { onPress?: () => void; showZone?: boolean }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  const latest = HOURLY_WBGT[HOURLY_WBGT.length - 1];
  // A change in whole degrees, in the user's unit: "+5°".
  const wholeDelta = (fahrenheit: number) => `${fahrenheit < 0 ? '−' : '+'}${Math.abs(Math.round(temp.value(32 + fahrenheit) - temp.value(32)))}°`;
  const threeHoursAgo = HOURLY_WBGT[HOURLY_WBGT.length - 4];
  return (
    <Card>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="Memorial Stadium" />
      <View style={styles.fieldTop}>
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>{temp.value(TODAY.wbgtF)}</Text>
          <Text style={styles.heroUnit}>{temp.unit}</Text>
        </View>
        <View style={styles.fieldTrend}>
          {showZone ? <Text style={[styles.zoneLine, { color: ZONES[TODAY.zone].text }]}>{ZONES[TODAY.zone].label}</Text> : null}
          <Text style={styles.fieldTrendText}>{wholeDelta(latest - HOURLY_WBGT[0])} since 7 AM</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>Modify work and rest before athletes take the field.</Text>
      <LineChart
        format={(value) => `${temp.value(value)}°`}
        labels={['7 AM', '11 AM', 'Now']}
        max={88}
        min={60}
        summary={`Hourly WBGT today, rising from ${temp.value(HOURLY_WBGT[0])} to ${temp.value(latest)} degrees by 4 PM.`}
        tone={Palette.warning}
        values={HOURLY_WBGT}
      />
      <View style={styles.statRow}>
        <Stat label="Peak today" value={`${temp.value(Math.max(...HOURLY_WBGT))}°`} />
        <Stat label="Last 3 hours" value={wholeDelta(latest - threeHoursAgo)} />
        <Stat label="Updated" value={refreshedAt ? 'Now' : '2 min'} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  heroValue: { color: Palette.ink, ...Type.figure, fontSize: 64, lineHeight: 66 },
  heroUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 20, lineHeight: 24 },
  zoneLine: { color: Palette.warning, ...Type.label },
  fieldTop: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  fieldTrend: { alignItems: 'flex-end', gap: 2, paddingBottom: Spacing.two },
  fieldTrendText: { color: Palette.inkMuted, ...Type.footnote },
  statRow: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.three },
  stat: { flex: 1, gap: 1 },
  statLabel: { color: Palette.inkMuted, ...Type.labelSmall },
  statValue: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 29 },
});
