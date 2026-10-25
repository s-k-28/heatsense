import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { celsiusToF } from '@/lib/uil-wbgt';

// A WBGT estimate from local weather, for the time between real field readings. It never replaces a
// reading: the Field WBGT on screen is always the last measured value, and the estimate is labeled.
//
// Formula: the Australian Bureau of Meteorology's simplified WBGT, from air temperature and humidity:
//   WBGT (°C) = 0.567·T + 0.393·e + 3.94, with e the water vapour pressure in hPa.
// It assumes sun and a light wind, so it reads a little high in shade, cloud or wind, which is the
// safer direction for a heat warning.

const REFRESH_MS = 15 * 60_000;

export type WeatherEstimate = { wbgtF: number; at: number };

export function estimateWbgtF(airC: number, humidityPercent: number) {
  const vapourPressure = (humidityPercent / 100) * 6.105 * Math.exp((17.27 * airC) / (237.7 + airC));
  return celsiusToF(0.567 * airC + 0.393 * vapourPressure + 3.94);
}

async function fetchEstimate(): Promise<WeatherEstimate | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  const { latitude, longitude } = position.coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&current=temperature_2m,relative_humidity_2m`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const current = (await response.json())?.current;
  if (typeof current?.temperature_2m !== 'number' || typeof current?.relative_humidity_2m !== 'number') return null;
  return { wbgtF: estimateWbgtF(current.temperature_2m, current.relative_humidity_2m), at: Date.now() };
}

/** The local weather's estimated WBGT, refreshed every 15 minutes; null without location access or a connection. */
export function useWeatherEstimate() {
  const [estimate, setEstimate] = useState<WeatherEstimate | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetchEstimate().then((next) => { if (live && next) setEstimate(next); }).catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return estimate;
}
