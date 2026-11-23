import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Palette, Spacing, Type } from '@/constants/theme';
import { OUTDOOR_START_WINDOW_MINUTES, type OutdoorStartCheck } from '@/lib/outdoor-start';

const STATUS = {
  missing: { title: 'Take the first field reading', detail: 'Measure WBGT at the practice site before athletes begin.', color: Palette.warning },
  stale: { title: 'A new field reading is due', detail: `Use a reading taken within ${OUTDOOR_START_WINDOW_MINUTES} minutes of outdoor start.`, color: Palette.warning },
  'invalid-time': { title: 'Check the measurement time', detail: 'Log the time the meter was read. Future measurements can’t be used to record a start.', color: Palette.warning },
  stop: { title: 'Keep practice off the field', detail: 'UIL Black zone calls for no outdoor activity.', color: Palette.emergency },
  ready: { title: 'Fresh field reading', detail: 'Review your school’s heat plan and the zone guidance before recording outdoor start.', color: Palette.safe },
  unavailable: { title: 'Reconnect to verify the reading', detail: 'The last reading may be out of date.', color: Palette.warning },
  syncing: { title: 'Syncing the latest reading', detail: 'Wait for the field log to update before recording outdoor start.', color: Palette.warning },
};

export function OutdoorStartPanel({ status, measurement, children }: {
  status: OutdoorStartCheck | 'unavailable' | 'syncing';
  measurement?: string;
  children?: ReactNode;
}) {
  const { title, detail, color } = STATUS[status];
  return (
    <View style={[styles.panel, { borderLeftColor: color }]}>
      <Text style={styles.label}>Before outdoor practice</Text>
      <View accessibilityLiveRegion="polite" style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {measurement ? <Text style={styles.measurement}>{measurement}</Text> : null}
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1,
    borderLeftWidth: 4, borderRadius: 18, gap: Spacing.three, padding: Spacing.four,
  },
  label: { ...Type.labelSmall, color: Palette.inkFaint },
  copy: { gap: Spacing.one },
  title: { ...Type.title3, color: Palette.ink },
  measurement: { ...Type.label, color: Palette.ink },
  detail: { ...Type.subhead, color: Palette.inkMuted },
});
