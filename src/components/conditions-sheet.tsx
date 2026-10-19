import { StyleSheet, Text } from 'react-native';

import { Sheet } from '@/components/ds';
import { Color, Space, Type } from '@/constants/design-system';

/** What "Check field conditions" opens: the honest state of the data, and what to do before practice. */
export function ConditionsSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  return (
    <Sheet onClose={onClose} title="Field conditions" visible={visible}>
      <Text style={[Type.body, styles.ink, styles.lead]}>
        HeatSense isn’t connected to a WBGT sensor or weather feed yet, so it can’t read conditions at your field.
      </Text>
      <Text style={[Type.bodyStrong, styles.ink, styles.subhead]}>Before practice</Text>
      <Text style={[Type.body, styles.muted]}>Take a WBGT reading on site with a handheld meter, or ask your athletic trainer for theirs.</Text>
      <Text style={[Type.body, styles.muted, styles.line]}>Then follow your school’s heat policy for that reading.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  lead: { marginTop: Space.s },
  subhead: { marginBottom: Space.xs, marginTop: Space.xl },
  line: { marginTop: Space.s },
});
