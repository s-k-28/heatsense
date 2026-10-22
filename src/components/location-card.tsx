import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeatIcon } from '@/components/heat-icon';
import { TeamMap } from '@/components/team-map';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';

const pin = { ios: 'location.fill', android: 'my_location', web: 'my_location' } as const;

type Place = { city: string; latitude: number; longitude: number; live: boolean; region: string };

// The sample school's city until the coach shares a location.
const SAMPLE: Place = { city: 'Frisco', latitude: 33.1507, longitude: -96.8236, live: false, region: 'TX' };

/**
 * Where the team practices: a map of the city with its name over it, and a button that uses
 * location services to set it from the phone. The map is a picture here, so it doesn't take touches.
 */
export function LocationCard({ field }: { field: string }) {
  const [place, setPlace] = useState<Place>(SAMPLE);
  const [busy, setBusy] = useState(false);
  const coordinates = useMemo(() => ({ latitude: place.latitude, longitude: place.longitude }), [place.latitude, place.longitude]);

  const locate = async () => {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location is off for HeatSense', 'Turn on location in Settings to set your team’s city from this phone.', [
          { style: 'cancel', text: 'Not now' },
          { onPress: () => Linking.openSettings(), text: 'Open Settings' },
        ]);
        return;
      }
      const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude, longitude } = position.coords;
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setPlace({ city: address?.city ?? address?.subregion ?? 'Current location', latitude, longitude, live: true, region: address?.region ?? '' });
    } catch {
      Alert.alert('Couldn’t find your location', 'Check that location services are on, then try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.map}>
        <TeamMap coordinates={coordinates} />
        <LinearGradient colors={['rgba(16,18,20,0)', 'rgba(16,18,20,0.9)']} locations={[0.72, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View accessible accessibilityLabel={`Team location: ${place.city}${place.region ? `, ${place.region}` : ''}. ${field}.`} style={styles.copy}>
        <Text style={styles.eyebrow}>{place.live ? 'From this phone' : 'Sample location'}</Text>
        <Text style={styles.city}>{place.city}{place.region ? `, ${place.region}` : ''}</Text>
        <Text style={styles.field}>{field}</Text>
      </View>
      <Pressable
        accessibilityHint="Asks for your location and sets the team’s city from it"
        accessibilityRole="button"
        disabled={busy}
        onPress={locate}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        {busy ? <ActivityIndicator color={Palette.coral} size="small" /> : <HeatIcon name={pin} size={14} tintColor={Palette.coral} />}
        <Text style={styles.actionText}>{place.live ? 'Update from my location' : 'Use my location'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  card: { backgroundColor: '#101214', borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  map: { height: 170 },
  copy: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  eyebrow: { color: Palette.inkMuted, ...Type.labelSmall },
  city: { color: Palette.ink, ...Type.title2, fontWeight: '700' },
  field: { color: Palette.inkMuted, ...Type.subhead },
  action: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginHorizontal: Spacing.four, marginBottom: Spacing.four, marginTop: Spacing.three, minHeight: 32 },
  actionText: { color: Palette.coral, ...Type.label, fontSize: 14 },
});
