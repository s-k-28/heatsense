import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Loop eligibility follows the route, app lifecycle and live accessibility changes. */
export function useMotionActive(enabled = true) {
  const focused = useIsFocused();
  const initialReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initialReduced);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !changed) setReduced(value);
    });
    return () => { mounted = false; app.remove(); preference.remove(); };
  }, []);
  return enabled && focused && active && !reduced;
}
