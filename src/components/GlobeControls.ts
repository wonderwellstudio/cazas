import type { GlobeMethods } from 'react-globe.gl';
import type { GlobeTarget } from '../utils/geo';

export interface GlobeCameraState {
  lat: number;
  lng: number;
  altitude: number;
}

export const DEFAULT_CAMERA_STATE: GlobeCameraState = {
  lat: 23,
  lng: -98,
  altitude: 2.1,
};

const DEFAULT_TRANSITION_MS = 1700;

export function configureGlobeControls(globe: GlobeMethods): void {
  const controls = globe.controls();
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = -1.0;

  // Keep zooming bounded to preserve a cinematic product-style framing.
  controls.minDistance = 130;
  controls.maxDistance = 420;
}

export function setAutoRotation(globe: GlobeMethods, isEnabled: boolean): void {
  const controls = globe.controls();
  controls.autoRotate = isEnabled;
}

export function setCameraState(
  globe: GlobeMethods,
  state: GlobeCameraState,
  transitionMs = DEFAULT_TRANSITION_MS,
): void {
  globe.pointOfView(state, transitionMs);
}

export function flyToTarget(
  globe: GlobeMethods,
  target: GlobeTarget,
  transitionMs = DEFAULT_TRANSITION_MS,
): void {
  globe.pointOfView(target, transitionMs);
}

export function buildZoomState(
  target: Pick<GlobeTarget, 'lat' | 'lng'>,
  baseAltitude: number,
): GlobeCameraState {
  return {
    lat: target.lat,
    lng: target.lng,
    altitude: Math.max(0.7, baseAltitude / 2),
  };
}
