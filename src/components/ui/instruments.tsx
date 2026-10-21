import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { HeatIcon } from '@/components/heat-icon';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';

const close = { ios: 'xmark', android: 'close', web: 'close' } as const;
const arrow = { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as const;

/**
 * A dark card lit from one corner, for the one thing on a screen worth a closer look.
 * The copy keeps to the left so an illustration can sit on the right.
 */
export function InsightCard({
  action,
  body,
  glow = Palette.coral,
  image,
  onAction,
  onDismiss,
  title,
}: {
  action: string;
  body: string;
  glow?: string;
  image?: ImageSource | number;
  onAction: () => void;
  onDismiss?: () => void;
  title: string;
}) {
  return (
    <View style={styles.insight}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient cx="100%" cy="0%" id="insight-glow" r="85%">
            <Stop offset="0" stopColor={glow} stopOpacity={0.55} />
            <Stop offset="0.45" stopColor={glow} stopOpacity={0.16} />
            <Stop offset="1" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect fill="url(#insight-glow)" height="100%" width="100%" />
      </Svg>
      {image ? <Image accessibilityIgnoresInvertColors contentFit="contain" pointerEvents="none" source={image} style={styles.image} /> : null}
      <View style={styles.top}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {onDismiss ? (
          <Pressable accessibilityLabel="Dismiss" accessibilityRole="button" hitSlop={14} onPress={onDismiss} style={({ pressed }) => pressed && styles.pressed}>
            <HeatIcon name={close} size={13} tintColor={Palette.inkMuted} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.body, image ? styles.bodyBeside : null]}>{body}</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Text style={styles.actionText}>{action}</Text>
        <HeatIcon name={arrow} size={13} tintColor={Palette.coral} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  insight: { backgroundColor: '#101214', borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: Spacing.four, paddingBottom: Spacing.five },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three, justifyContent: 'space-between' },
  title: { color: Palette.ink, ...Type.label, flex: 1, fontSize: 18, letterSpacing: 1.5, lineHeight: 22, maxWidth: 250 },
  body: { color: 'rgba(235,235,245,0.72)', ...Type.subhead, marginTop: Spacing.two },
  bodyBeside: { maxWidth: '56%' },
  image: { bottom: Spacing.five, height: 156, position: 'absolute', right: Spacing.one, width: 156 },
  action: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: Spacing.four },
  actionText: { color: Palette.coral, ...Type.label, fontSize: 14 },
});
