import { Text } from '@/components/ui/text';
import { StyleSheet, View } from 'react-native';
import { SimulatedTag } from '@/components/vitals';
import { ActionButton } from '@/components/ui/action-button';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { useAthletes } from '@/state/athletes';

/** Home's compact band overview; Monitor remains the place to inspect and check in with athletes. */
export function TrainerHomeOverview({ onOpenMonitor }: { onOpenMonitor: () => void }) {
  const { athletes, loading, sample, status, vitalsStatus, retry } = useAthletes('trainer');
  const reporting = athletes.filter((athlete) => athlete.live && !athlete.live.stale);
  const stale = athletes.filter((athlete) => athlete.live?.stale);
  const slowRecovery = reporting.filter((athlete) => athlete.live?.status === 'watch');
  const assessed = reporting.filter((athlete) => athlete.live?.status !== 'unknown');
  const failed = status === 'error' || vitalsStatus === 'error';
  const waiting = loading || vitalsStatus === 'loading';
  const simulated = sample || athletes.some((athlete) => athlete.simulated);

  return (
    <>
      <View style={styles.header}><View style={styles.identity}><Text accessibilityRole="header" style={styles.title}>Athlete bands</Text>{simulated ? <SimulatedTag compact /> : null}</View><ActionButton label="Monitor" onPress={onOpenMonitor} variant="text" /></View>
      {failed ? (
        <>
          <Rows><ListRow detail="Current signals couldn’t load. Try connecting again." label="Band data unavailable" /></Rows>
          <ActionButton label="Try again" onPress={retry} variant="secondary" />
        </>
      ) : waiting ? (
        <Rows><ListRow label="Band data" value="Loading…" /></Rows>
      ) : athletes.length === 0 ? (
        <Rows>
          <ListRow detail={status === 'idle' ? 'Connect to your team to view its band signals.' : 'Team band signals appear here during practice.'} label={status === 'idle' ? 'No team connected' : 'No band data yet'} />
        </Rows>
      ) : (
        <Rows>
          <ListRow label="Bands reporting" value={`${reporting.length}/${athletes.length}`} />
          <ListRow
            label="Slow recovery"
            detail={assessed.length < reporting.length ? `${reporting.length - assessed.length} reporting signals have no recovery assessment.` : undefined}
            value={assessed.length ? String(slowRecovery.length) : '—'}
            valueTone={slowRecovery.length ? Palette.warning : undefined}
          />
          <ListRow label="Stale signals" value={String(stale.length)} valueTone={stale.length ? Palette.warning : undefined} />
        </Rows>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 28, marginBottom: 12 },
  identity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, flexShrink: 1 },
  title: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
});
