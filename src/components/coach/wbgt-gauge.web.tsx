import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { Component, type ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';

import { arcPath, tiers } from './coach-data';
import type { GaugeProps } from './wbgt-gauge-canvas';

function GaugeFallback({ tier, width }: GaugeProps) {
  const index = tiers.findIndex((item) => item.name === tier);
  return <Svg width={width} height={width * 0.55} viewBox="0 0 320 176"><Path d={arcPath(0, 1)} stroke="#313237" strokeWidth={3} fill="none" /><Path d={arcPath(0, (index + 0.5) / 5)} stroke={tier === 'Black' ? '#E9EBEF' : tiers[index].color} strokeWidth={3} fill="none" strokeLinecap="round" /></Svg>;
}

class GaugeBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// Only the gauge waits for local CanvasKit. The safety readout remains visible.
export default function WbgtGauge(props: GaugeProps) {
  const fallback = <GaugeFallback {...props} />;
  return <GaugeBoundary fallback={fallback}><WithSkiaWeb getComponent={() => import('./wbgt-gauge-canvas')} componentProps={props} opts={{ locateFile: () => '/canvaskit.wasm' }} fallback={fallback} /></GaugeBoundary>;
}
