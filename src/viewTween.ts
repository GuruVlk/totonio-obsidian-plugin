import type { View } from './core/types';

export const VIEW_TWEEN_MS = 840;

export function easeInOutCubic(progress: number): number {
  const amount = Math.min(1, Math.max(0, progress));
  return amount < 0.5 ? 4 * amount * amount * amount : 1 - ((-2 * amount + 2) ** 3) / 2;
}

export function interpolateView(from: View, to: View, progress: number): View {
  const amount = easeInOutCubic(progress);
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    zoom: from.zoom * (to.zoom / from.zoom) ** amount,
  };
}