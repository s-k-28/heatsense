import { AppleMaps } from 'expo-maps';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

type Coordinates = { latitude: number; longitude: number };

/** The dark city map behind the location card. expo-maps is native-only; the web build uses team-map.web.tsx. */
export function TeamMap({ coordinates }: { coordinates: Coordinates }) {
  const map = useRef<AppleMaps.MapView>(null);

  useEffect(() => {
    map.current?.setCameraPosition({ coordinates, zoom: 11.5 });
  }, [coordinates]);

  if (Platform.OS !== 'ios') return null;
  return (
    <AppleMaps.View
      cameraPosition={{ coordinates, zoom: 11.5 }}
      colorScheme={AppleMaps.MapColorScheme.DARK}
      markers={[{ coordinates, id: 'field', systemImage: 'sportscourt.fill', tintColor: Palette.coral }]}
      properties={{ pointsOfInterest: { including: [] }, selectionEnabled: false }}
      ref={map}
      style={StyleSheet.absoluteFill}
      uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
    />
  );
}
