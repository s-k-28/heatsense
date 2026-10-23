import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { zoneColor } from '@/components/coach-today';
import { Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import type { CoachData } from '@/state/team-session';

// The top of Profile: who you are, on a card with the band photo and dotted copper field lines,
// then three numbers from today and a card for the band itself.

const HERO_PHOTO = require('@/assets/images/band-profile-hero.png');
const BACK_PHOTO = require('@/assets/images/band-profile-back.png');
// The photos' own backdrop, so the card and the photo read as one surface.
const PHOTO_BLACK = '#0B0A09';

/** Dotted copper contour lines that fade out before the band. Decorative only. */
function Contours() {
  const line = { fill: 'none', stroke: 'url(#fade)', strokeDasharray: '1 7', strokeLinecap: 'round' } as const;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 400 240" width="100%">
        <Defs>
          <SvgGradient id="fade" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={Palette.coral} stopOpacity={0.9} />
            <Stop offset="0.5" stopColor={Palette.coral} stopOpacity={0.55} />
            <Stop offset="0.68" stopColor={Palette.coral} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d="M-20 26 C 80 2, 190 70, 420 18" strokeWidth={1.6} {...line} />
        <Path d="M-20 52 C 80 18, 180 116, 420 38" strokeWidth={2} {...line} />
        <Path d="M-20 84 C 90 50, 200 148, 420 74" strokeWidth={1.6} {...line} />
      </Svg>
    </View>
  );
}

export function ProfileHero({ initials, name, role, team }: { initials: string; name: string; role: string; team: string | null }) {
  return (
    <View style={styles.hero}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" source={HERO_PHOTO} style={styles.heroPhoto} />
      {/* Fades the photo's left edge into the card so it has no visible border. */}
      <LinearGradient colors={[PHOTO_BLACK, 'rgba(11,10,9,0)']} end={{ x: 0.78, y: 0 }} pointerEvents="none" start={{ x: 0.56, y: 0 }} style={StyleSheet.absoluteFill} />
      <Contours />
      <View style={styles.identity}>
        <View style={styles.ring}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        </View>
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{role}{team ? ` · ${team}` : ''}</Text>
      </View>
    </View>
  );
}

/** Three figures from today: readings taken, the field's zone, and the athletes on the team. */
export function ProfileStats({ athletes, data }: { athletes: number | null; data: CoachData | null }) {
  const latest = data?.readings.at(-1) ?? null;
  return (
    <View style={styles.stats}>
      <Stat label="Readings" value={String(data?.readings.length ?? 0)} />
      <View style={styles.divider} />
      <Stat label="Field zone" tone={latest ? zoneColor(latest.zone) : undefined} value={latest ? ZONES[latest.zone].label.replace(' zone', '') : '--'} />
      <View style={styles.divider} />
      <Stat label="Athletes" value={athletes === null ? '--' : String(athletes)} />
    </View>
  );
}

function Stat({ label, tone, value }: { label: string; tone?: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text numberOfLines={1} style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** The band, and for athletes, its pairing state. */
export function BandCard({ athlete, connected }: { athlete: boolean; connected: boolean }) {
  return (
    <View style={styles.bandCard}>
      <View style={styles.bandThumb}>
        <Image accessibilityLabel="The back of the HeatSense Band, showing its optical sensor" contentFit="cover" source={BACK_PHOTO} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.bandCopy}>
        <Text style={styles.bandKicker}>HEATSENSE BAND · PROTOTYPE</Text>
        <Text style={styles.bandTitle}>{athlete ? (connected ? 'Your band is paired' : 'Pair your band') : 'Bands on your team'}</Text>
        {athlete ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/pair-band')} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.bandAction}>{connected ? 'MANAGE BAND' : 'PAIR BAND'}  →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: PHOTO_BLACK, borderColor: 'rgba(255,153,107,0.18)', borderCurve: 'continuous', borderRadius: 24, borderWidth: 1, height: 236, marginTop: 8, overflow: 'hidden' },
  heroPhoto: { aspectRatio: 370 / 520, height: '100%', position: 'absolute', right: 0, top: 0 },
  identity: { bottom: 38, left: 20, position: 'absolute', right: 150 },
  ring: { alignItems: 'center', borderColor: Palette.coral, borderRadius: 40, borderWidth: 2, height: 80, justifyContent: 'center', marginBottom: 12, width: 80 },
  avatar: { alignItems: 'center', backgroundColor: Palette.coral, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: '#1A0E07', fontSize: 24, fontWeight: '800' },
  name: { color: Palette.ink, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 2 },
  stats: { alignItems: 'center', backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderRadius: 20, borderWidth: 1, flexDirection: 'row', marginTop: 14, paddingVertical: 16 },
  stat: { alignItems: 'center', flex: 1, gap: 4, paddingHorizontal: 6 },
  statValue: { color: Palette.ink, fontSize: 24, fontVariant: ['tabular-nums'], fontWeight: '700' },
  statLabel: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
  divider: { backgroundColor: 'rgba(255,255,255,0.1)', height: 34, width: StyleSheet.hairlineWidth },
  bandCard: { alignItems: 'center', backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 14, marginBottom: 8, marginTop: 14, padding: 16 },
  bandThumb: { backgroundColor: PHOTO_BLACK, borderCurve: 'continuous', borderRadius: 14, height: 112, overflow: 'hidden', width: 80 },
  bandCopy: { flex: 1, gap: 5 },
  bandKicker: { color: Palette.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  bandTitle: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
  bandAction: { color: Palette.coral, fontSize: 13, fontWeight: '800', letterSpacing: 1.3, marginTop: 4 },
  pressed: { opacity: 0.7 },
});
