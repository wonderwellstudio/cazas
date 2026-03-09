import Globe, { type GlobeMethods } from 'react-globe.gl';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  buildZoomState,
  configureGlobeControls,
  DEFAULT_CAMERA_STATE,
  setAutoRotation,
  setCameraState,
} from './GlobeControls';
import type { GlobeCameraState } from './GlobeControls';
import { getLocationFlightOrigins, type Location } from '../data/locations';
import { normalizeLocations, toPointLayerData } from '../utils/geo';

export interface GlobeViewHandle {
  flyToLocation: (locationId: string) => void;
  flyToRegion: (region: string) => void;
  resetView: () => void;
}

interface GlobeViewProps {
  locations: Location[];
  initialCameraState?: GlobeCameraState;
  isDaytime?: boolean;
  activeRegion?: string | null;
  activeLocationId?: string | null;
  onSelectLocation?: (locationId: string) => void;
  onRegionPinsTriggered?: (region: string) => void;
  isPaused?: boolean;
}

const NIGHT_GLOBE_TEXTURE =
  '/assets/globe/earth-night.jpg';
const DAY_GLOBE_TEXTURE =
  '/assets/globe/earth-blue-marble.jpg';
const BUMP_TEXTURE =
  '/assets/globe/earth-topology.png';
const DAY_NIGHT_TRANSITION_MS = 950;
const MAX_RENDERER_PIXEL_RATIO = 2;
const DAY_LINE_COLOR = '#ffffff';
const NIGHT_LINE_COLOR = '#9EE3DA';
const LINE_OPACITY = 0.5;
const NIGHT_TINT_REFERENCE = '#7ECBC1';
const NIGHT_TINT_VISIBILITY = 1;
const NIGHT_DARKENING = 0.72;
const NIGHT_DESATURATION = 0.18;
const RESET_VIEW_TRANSITION_MS = 1600;
const COLLAPSE_TRANSITION_MS = 560;
const REGION_ROTATE_TRANSITION_MS = 1200;
const GROW_TRANSITION_MS = 700;
const REGION_PIN_INTRO_DELAY_MS = 280;
const REGION_PIN_OUTRO_MS = 340;
const REGION_REFOCUS_TRANSITION_MS = 1150;
const TIP_BASE_SIZE_PX = 6;
const TIP_MIN_SCALE = 0.7;
const TIP_MAX_SCALE = 3;
const LOCATION_CAMERA_LEFT_OFFSET_DEG = 12;
const PIN_COLLAPSE_TRANSITION_MS = 420;
const PIN_RISE_TRANSITION_MS = 520;
const ARC_COLLAPSE_TRANSITION_MS = 650;
const ARC_SWAP_DELAY_MS = 120;
const ARC_FADE_IN_TRANSITION_MS = 420;
const ACTIVE_ARC_ALTITUDE = 0.16;
const INTRO_ROUTE_COUNT = 4;
const INTRO_ROUTE_CYCLE_MS = 2600;
const INTRO_ARC_FRAME_INTERVAL_MS = 34;
const INTRO_TRAVELER_SIZE_PX = 7;
const INTRO_TRAVELER_ALTITUDE = 0.12;
const ACTIVE_ARC_STROKE = 0.275;
const ARC_CURVE_RESOLUTION = 128;
const ARC_CIRCULAR_RESOLUTION = 14;

function hashNumber(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pseudoRandom(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function buildIntroOrigin(locationId: string, routeIndex: number, seed: number) {
  const base = hashNumber(`${locationId}:${routeIndex}:${seed}`);
  const lat = pseudoRandom(base) * 150 - 75;
  const lng = pseudoRandom(base ^ 0x9e3779b9) * 360 - 180;
  return { lat, lng };
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) * (1 - value) * (1 - value);
}

function interpolateGreatCircle(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  progress: number,
): { lat: number; lng: number } {
  const t = Math.max(0, Math.min(1, progress));
  const toRadians = Math.PI / 180;
  const toDegrees = 180 / Math.PI;
  const fromLatRad = fromLat * toRadians;
  const fromLngRad = fromLng * toRadians;
  const toLatRad = toLat * toRadians;
  const toLngRad = toLng * toRadians;
  const p1 = {
    x: Math.cos(fromLatRad) * Math.cos(fromLngRad),
    y: Math.cos(fromLatRad) * Math.sin(fromLngRad),
    z: Math.sin(fromLatRad),
  };
  const p2 = {
    x: Math.cos(toLatRad) * Math.cos(toLngRad),
    y: Math.cos(toLatRad) * Math.sin(toLngRad),
    z: Math.sin(toLatRad),
  };
  const dot = Math.max(-1, Math.min(1, p1.x * p2.x + p1.y * p2.y + p1.z * p2.z));
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return { lat: fromLat, lng: fromLng };
  }
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;
  const x = a * p1.x + b * p2.x;
  const y = a * p1.y + b * p2.y;
  const z = a * p1.z + b * p2.z;
  const invLength = 1 / Math.hypot(x, y, z);
  const lat = Math.asin(z * invLength) * toDegrees;
  const lng = Math.atan2(y * invLength, x * invLength) * toDegrees;
  return { lat, lng };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const parsed = Number.parseInt(expanded, 16);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function withOpacity(color: string, alpha: number): string {
  if (!color.startsWith('#')) {
    return color;
  }

  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function withLeftCameraOffset(lat: number, lng: number): { lat: number; lng: number } {
  const nextLng = lng + LOCATION_CAMERA_LEFT_OFFSET_DEG;
  const wrappedLng = ((nextLng + 180) % 360 + 360) % 360 - 180;
  return { lat, lng: wrappedLng };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function drawBlendTexture(
  canvas: HTMLCanvasElement,
  nightImage: CanvasImageSource,
  dayImage: HTMLImageElement,
  blendAmount: number,
): string {
  const context = canvas.getContext('2d');
  if (!context) {
    return NIGHT_GLOBE_TEXTURE;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;
  context.drawImage(nightImage, 0, 0, canvas.width, canvas.height);
  context.globalAlpha = blendAmount;
  context.drawImage(dayImage, 0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;

  return canvas.toDataURL('image/png');
}

function createTurquoiseNightTexture(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    return canvas;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const tint = hexToRgb(NIGHT_TINT_REFERENCE) ?? { r: 126, g: 203, b: 193 };

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) {
      continue;
    }

    const brightness = (r + g + b) / 3;
    const maxRG = Math.max(r, g);
    const blueDominance = Math.max(0, b - maxRG) / 255;
    const blueMask = b > g * 0.96 && b > r * 1.05;
    const colorStrength =
      (blueMask ? blueDominance : 0) * (brightness < 165 ? 1.25 : 0.55);
    if (colorStrength <= 0) {
      continue;
    }

    const blend =
      Math.min(0.78, 0.32 + colorStrength * 0.95) * NIGHT_TINT_VISIBILITY;
    const luminance = 0.3 + (brightness / 255) * 0.35;
    const tintR = Math.min(255, tint.r * luminance);
    const tintG = Math.min(255, tint.g * luminance);
    const tintB = Math.min(255, tint.b * luminance);

    const tintedR = r * (1 - blend) + tintR * blend;
    const tintedG = g * (1 - blend) + tintG * blend;
    const tintedB = b * (1 - blend) + tintB * blend;

    const gray = (tintedR + tintedG + tintedB) / 3;
    const desatR = tintedR * (1 - NIGHT_DESATURATION) + gray * NIGHT_DESATURATION;
    const desatG = tintedG * (1 - NIGHT_DESATURATION) + gray * NIGHT_DESATURATION;
    const desatB = tintedB * (1 - NIGHT_DESATURATION) + gray * NIGHT_DESATURATION;

    const nextR = desatR * NIGHT_DARKENING;
    const nextG = desatG * NIGHT_DARKENING;
    const nextB = desatB * NIGHT_DARKENING;

    data[i] = Math.round(Math.max(0, Math.min(255, nextR)));
    data[i + 1] = Math.round(Math.max(0, Math.min(255, nextG)));
    data[i + 2] = Math.round(Math.max(0, Math.min(255, nextB)));
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

export const GlobeView = forwardRef<GlobeViewHandle, GlobeViewProps>(
  (
    {
      locations,
      initialCameraState = DEFAULT_CAMERA_STATE,
      isDaytime = false,
      activeRegion = null,
      activeLocationId = null,
      onSelectLocation,
      onRegionPinsTriggered,
      isPaused = false,
    },
    ref,
  ) => {
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const blendProgressRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const resetRotationTimeoutRef = useRef<number | null>(null);
    const regionTransitionTimeoutRef = useRef<number | null>(null);
    const lineAnimationFrameRef = useRef<number | null>(null);
    const pinTransitionFrameRef = useRef<number | null>(null);
    const arcCollapseFrameRef = useRef<number | null>(null);
    const arcSwapTimeoutRef = useRef<number | null>(null);
    const transitionTokenRef = useRef(0);
    const displayedRegionRef = useRef<string | null>(null);
    const lineGrowProgressRef = useRef(0);
    const hasInteractionListenerRef = useRef(false);
    const cameraSyncFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const texturesRef = useRef<{
      night: CanvasImageSource;
      day: HTMLImageElement;
    } | null>(null);
    const [globeTextureUrl, setGlobeTextureUrl] = useState(NIGHT_GLOBE_TEXTURE);
    const [displayedRegion, setDisplayedRegion] = useState<string | null>(null);
    const [lineGrowProgress, setLineGrowProgress] = useState(0);
    const [displayedPinLocationId, setDisplayedPinLocationId] = useState<string | null>(
      null,
    );
    const displayedPinLocationIdRef = useRef<string | null>(null);
    const [pinSelectionProgress, setPinSelectionProgress] = useState(0);
    const pinSelectionProgressRef = useRef(0);
    const pinTransitionTokenRef = useRef(0);
    const [displayedFlightLocationId, setDisplayedFlightLocationId] = useState<
      string | null
    >(null);
    const displayedFlightLocationIdRef = useRef<string | null>(null);
    const [arcCollapseProgress, setArcCollapseProgress] = useState(0);
    const arcCollapseProgressRef = useRef(0);
    const arcTransitionTokenRef = useRef(0);
    const [cameraAltitude, setCameraAltitude] = useState(initialCameraState.altitude);
    const [introArcClock, setIntroArcClock] = useState(0);
    const [viewport, setViewport] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const previousActiveLocationIdRef = useRef<string | null>(null);

    const normalizedLocations = useMemo(
      () => normalizeLocations(locations),
      [locations],
    );

    const locationsById = useMemo(() => {
      return new Map(normalizedLocations.map((location) => [location.id, location]));
    }, [normalizedLocations]);
    const locationsByRegion = useMemo(() => {
      const map = new Map<string, typeof normalizedLocations>();
      for (const location of normalizedLocations) {
        const key = location.region.trim().toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.push(location);
        } else {
          map.set(key, [location]);
        }
      }

      return map;
    }, [normalizedLocations]);

    const pointData = useMemo(
      () => toPointLayerData(normalizedLocations),
      [normalizedLocations],
    );
    const lineData = useMemo(() => {
      return pointData.map((location) => {
        const baseColor = isDaytime ? DAY_LINE_COLOR : NIGHT_LINE_COLOR;

        return {
          ...location,
          lineColor: withOpacity(baseColor, LINE_OPACITY),
          tipColor: baseColor,
        };
      });
    }, [isDaytime, pointData]);
    const normalizedActiveLocationId = activeLocationId?.trim().toLowerCase() ?? null;
    const activeLocation = normalizedActiveLocationId
      ? locationsById.get(normalizedActiveLocationId) ?? null
      : null;
    const displayedPinLocation = displayedPinLocationId
      ? locationsById.get(displayedPinLocationId) ?? null
      : null;
    const displayedFlightLocation = displayedFlightLocationId
      ? locationsById.get(displayedFlightLocationId) ?? null
      : null;
    const visibleLineData = useMemo(() => {
      if (!displayedRegion) {
        return [];
      }

      const selectedRegion = displayedRegion.trim().toLowerCase();
      const tipOpacity = Math.max(0, Math.min(1, (lineGrowProgress - 0.12) / 0.3));
      const selectedInRegion =
        displayedPinLocation &&
        displayedPinLocation.region.trim().toLowerCase() === selectedRegion
          ? displayedPinLocation
          : null;
      return lineData
        .filter((location) => location.region.trim().toLowerCase() === selectedRegion)
        .map((location) => ({
          ...location,
          animatedAltitude:
            location.id === selectedInRegion?.id
              ? location.altitude * lineGrowProgress * pinSelectionProgress
              : location.altitude * lineGrowProgress * (selectedInRegion ? 0 : 1),
          radius:
            selectedInRegion && location.id === selectedInRegion.id
              ? location.radius * 1.18
              : location.radius,
          lineColor:
            selectedInRegion && location.id !== selectedInRegion.id
              ? withOpacity(isDaytime ? DAY_LINE_COLOR : NIGHT_LINE_COLOR, 0)
              : location.lineColor,
          tipColor:
            selectedInRegion && location.id !== selectedInRegion.id
              ? withOpacity(isDaytime ? DAY_LINE_COLOR : NIGHT_LINE_COLOR, 0)
              : location.tipColor,
          tipOpacity:
            location.id === selectedInRegion?.id
              ? pinSelectionProgress
              : tipOpacity * (selectedInRegion ? 0 : 1),
        }));
    }, [
      displayedPinLocation,
      displayedRegion,
      isDaytime,
      lineData,
      lineGrowProgress,
      pinSelectionProgress,
    ]);
    const flightArcData = useMemo(() => {
      if (!displayedFlightLocation) {
        return [];
      }

      const activeRegionKey = displayedRegion?.trim().toLowerCase() ?? null;
      if (
        !activeRegionKey ||
        displayedFlightLocation.region.trim().toLowerCase() !== activeRegionKey
      ) {
        return [];
      }

      const endLabel = displayedFlightLocation.name;
      const endLat = displayedFlightLocation.lat;
      const endLng = displayedFlightLocation.lng;
      const collapseVisibility = Math.max(0, 1 - arcCollapseProgress);
      const origins = getLocationFlightOrigins(displayedFlightLocation.id);
      return origins.flatMap((origin, index) => {
        const common = {
          startLat: origin.lat,
          startLng: origin.lng,
          endLat,
          endLng,
          label: `${origin.name} to ${endLabel}`,
        };

        return [
          {
            ...common,
            altitude: ACTIVE_ARC_ALTITUDE,
            color: [
              withOpacity(
                isDaytime ? DAY_LINE_COLOR : '#9EE3DA',
                0.44 * collapseVisibility,
              ),
              withOpacity(
                isDaytime ? DAY_LINE_COLOR : '#9EE3DA',
                0.2 * collapseVisibility,
              ),
            ],
            dashLength: 1,
            dashGap: 0,
            dashOffset: 0,
            dashAnimateTime: 1,
          },
          {
            ...common,
            altitude: ACTIVE_ARC_ALTITUDE,
            color: [
              withOpacity(
                isDaytime ? DAY_LINE_COLOR : '#D5FFF9',
                0.98 * collapseVisibility,
              ),
              withOpacity(
                isDaytime ? DAY_LINE_COLOR : '#9EE3DA',
                0.22 * collapseVisibility,
              ),
            ],
            dashLength: 0.2,
            dashGap: 1.25,
            dashOffset: (index * 0.12) % 1,
            dashAnimateTime: 1900,
          },
        ];
      });
    }, [arcCollapseProgress, displayedFlightLocation, displayedRegion, isDaytime]);
    const introRouteData = useMemo(() => {
      if (displayedRegion || normalizedActiveLocationId || lineData.length === 0) {
        return [];
      }
      const cycleTime = introArcClock / INTRO_ROUTE_CYCLE_MS;
      return Array.from({ length: INTRO_ROUTE_COUNT }, (_, routeIndex) => {
        const laneCycle = Math.floor(cycleTime + routeIndex / INTRO_ROUTE_COUNT);
        const destinationPick = hashNumber(`dest:${laneCycle}:${routeIndex}`);
        const destination = lineData[destinationPick % lineData.length];
        const origin = buildIntroOrigin(destination.id, routeIndex, laneCycle);
        return {
          routeIndex,
          laneCycle,
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
        };
      });
    }, [displayedRegion, introArcClock, lineData, normalizedActiveLocationId]);
    const introTravelerData = useMemo(() => {
      if (introRouteData.length === 0) {
        return [];
      }
      const cycleProgress =
        (((introArcClock % INTRO_ROUTE_CYCLE_MS) + INTRO_ROUTE_CYCLE_MS) %
          INTRO_ROUTE_CYCLE_MS) /
        INTRO_ROUTE_CYCLE_MS;
      return introRouteData.map((route) => {
        const slotProgress = (cycleProgress + route.routeIndex / INTRO_ROUTE_COUNT) % 1;
        const progress = easeOutCubic(slotProgress);
        const position = interpolateGreatCircle(
          route.originLat,
          route.originLng,
          route.destinationLat,
          route.destinationLng,
          progress,
        );
        const fadeIn = Math.min(1, slotProgress / 0.1);
        const fadeOut = Math.min(1, (1 - slotProgress) / 0.12);
        const opacity = Math.max(0, Math.min(1, fadeIn * fadeOut));
        return {
          id: `intro-traveler-${route.routeIndex}-${route.laneCycle}`,
          kind: 'intro-traveler' as const,
          lat: position.lat,
          lng: position.lng,
          animatedAltitude: INTRO_TRAVELER_ALTITUDE * Math.sin(Math.PI * progress),
          color: withOpacity(isDaytime ? DAY_LINE_COLOR : '#D5FFF9', opacity * 0.9),
          glow: withOpacity(isDaytime ? DAY_LINE_COLOR : '#9EE3DA', opacity * 0.62),
          sizePx: INTRO_TRAVELER_SIZE_PX,
        };
      });
    }, [introArcClock, introRouteData, isDaytime]);
    const visibleArcData = flightArcData;
    const visibleHtmlData = useMemo(
      () => [...visibleLineData, ...introTravelerData],
      [introTravelerData, visibleLineData],
    );

    useEffect(() => {
      const onResize = () => {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      };

      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
      let mounted = true;

      void (async () => {
        try {
          const [nightImage, dayImage] = await Promise.all([
            loadImage(NIGHT_GLOBE_TEXTURE),
            loadImage(DAY_GLOBE_TEXTURE),
          ]);
          if (!mounted) {
            return;
          }

          const turquoiseNight = createTurquoiseNightTexture(nightImage);
          texturesRef.current = { night: turquoiseNight, day: dayImage };
          const canvas = document.createElement('canvas');
          canvas.width = nightImage.naturalWidth;
          canvas.height = nightImage.naturalHeight;
          canvasRef.current = canvas;

          blendProgressRef.current = isDaytime ? 1 : 0;
          const initialTexture = drawBlendTexture(
            canvas,
            turquoiseNight,
            dayImage,
            blendProgressRef.current,
          );
          setGlobeTextureUrl(initialTexture);
        } catch {
          if (mounted) {
            setGlobeTextureUrl(isDaytime ? DAY_GLOBE_TEXTURE : NIGHT_GLOBE_TEXTURE);
          }
        }
      })();

      return () => {
        mounted = false;
      };
    }, []);

    useEffect(() => {
      const textures = texturesRef.current;
      const canvas = canvasRef.current;
      if (!textures || !canvas) {
        setGlobeTextureUrl(isDaytime ? DAY_GLOBE_TEXTURE : NIGHT_GLOBE_TEXTURE);
        return;
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      const startProgress = blendProgressRef.current;
      const targetProgress = isDaytime ? 1 : 0;
      if (Math.abs(targetProgress - startProgress) < 0.001) {
        return;
      }

      let startTime: number | null = null;

      const tick = (timestamp: number) => {
        if (startTime === null) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const timeProgress = Math.min(1, elapsed / DAY_NIGHT_TRANSITION_MS);
        const eased = 1 - (1 - timeProgress) * (1 - timeProgress);
        const nextBlend =
          startProgress + (targetProgress - startProgress) * eased;

        blendProgressRef.current = nextBlend;
        setGlobeTextureUrl(
          drawBlendTexture(canvas, textures.night, textures.day, nextBlend),
        );

        if (timeProgress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        animationFrameRef.current = null;
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);

      return () => {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }, [isDaytime]);

    useEffect(() => {
      setCameraAltitude(initialCameraState.altitude);
    }, [initialCameraState.altitude]);

    useEffect(() => {
      if (displayedRegion || normalizedActiveLocationId || isPaused) {
        return;
      }
      let animationFrame: number | null = null;
      let previousFrameTime = 0;
      const tick = (timestamp: number) => {
        if (timestamp - previousFrameTime >= INTRO_ARC_FRAME_INTERVAL_MS) {
          previousFrameTime = timestamp;
          setIntroArcClock(timestamp);
        }
        animationFrame = window.requestAnimationFrame(tick);
      };
      animationFrame = window.requestAnimationFrame(tick);
      return () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
      };
    }, [displayedRegion, normalizedActiveLocationId, isPaused]);

    useEffect(() => {
      const globe = globeRef.current as
        | (GlobeMethods & {
            pauseAnimation?: () => void;
            resumeAnimation?: () => void;
          })
        | undefined;
      if (!globe) {
        return;
      }

      if (isPaused) {
        setAutoRotation(globe, false);
        globe.pauseAnimation?.();
        return;
      }

      globe.resumeAnimation?.();
      if (!activeRegion) {
        setAutoRotation(globe, true);
      }
    }, [activeRegion, isPaused]);

    useEffect(() => {
      return () => {
        if (resetRotationTimeoutRef.current !== null) {
          window.clearTimeout(resetRotationTimeoutRef.current);
          resetRotationTimeoutRef.current = null;
        }
        if (regionTransitionTimeoutRef.current !== null) {
          window.clearTimeout(regionTransitionTimeoutRef.current);
          regionTransitionTimeoutRef.current = null;
        }
        if (lineAnimationFrameRef.current !== null) {
          window.cancelAnimationFrame(lineAnimationFrameRef.current);
          lineAnimationFrameRef.current = null;
        }
        if (pinTransitionFrameRef.current !== null) {
          window.cancelAnimationFrame(pinTransitionFrameRef.current);
          pinTransitionFrameRef.current = null;
        }
        if (arcCollapseFrameRef.current !== null) {
          window.cancelAnimationFrame(arcCollapseFrameRef.current);
          arcCollapseFrameRef.current = null;
        }
        if (arcSwapTimeoutRef.current !== null) {
          window.clearTimeout(arcSwapTimeoutRef.current);
          arcSwapTimeoutRef.current = null;
        }
        if (cameraSyncFrameRef.current !== null) {
          window.cancelAnimationFrame(cameraSyncFrameRef.current);
          cameraSyncFrameRef.current = null;
        }
      };
    }, []);

    useEffect(() => {
      displayedRegionRef.current = displayedRegion;
    }, [displayedRegion]);

    useEffect(() => {
      lineGrowProgressRef.current = lineGrowProgress;
    }, [lineGrowProgress]);

    useEffect(() => {
      displayedPinLocationIdRef.current = displayedPinLocationId;
    }, [displayedPinLocationId]);

    useEffect(() => {
      pinSelectionProgressRef.current = pinSelectionProgress;
    }, [pinSelectionProgress]);

    useEffect(() => {
      displayedFlightLocationIdRef.current = displayedFlightLocationId;
    }, [displayedFlightLocationId]);

    useEffect(() => {
      arcCollapseProgressRef.current = arcCollapseProgress;
    }, [arcCollapseProgress]);

    useEffect(() => {
      const activeRegionKey = displayedRegion?.trim().toLowerCase() ?? null;
      const nextPinLocationId =
        activeLocation &&
        activeRegionKey &&
        activeLocation.region.trim().toLowerCase() === activeRegionKey
          ? activeLocation.id
          : null;
      const currentPinLocationId = displayedPinLocationIdRef.current;
      if (nextPinLocationId === currentPinLocationId) {
        return;
      }

      const token = ++pinTransitionTokenRef.current;
      if (pinTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(pinTransitionFrameRef.current);
        pinTransitionFrameRef.current = null;
      }

      const animatePinProgress = (
        from: number,
        to: number,
        durationMs: number,
        onComplete: () => void,
      ) => {
        if (durationMs <= 0 || Math.abs(to - from) < 0.001) {
          setPinSelectionProgress(to);
          onComplete();
          return;
        }

        let startTime: number | null = null;
        const tick = (timestamp: number) => {
          if (token !== pinTransitionTokenRef.current) {
            return;
          }
          if (startTime === null) {
            startTime = timestamp;
          }

          const elapsed = timestamp - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = 1 - (1 - progress) * (1 - progress);
          setPinSelectionProgress(from + (to - from) * eased);

          if (progress >= 1) {
            pinTransitionFrameRef.current = null;
            onComplete();
            return;
          }

          pinTransitionFrameRef.current = window.requestAnimationFrame(tick);
        };

        pinTransitionFrameRef.current = window.requestAnimationFrame(tick);
      };

      const swapAndRise = (nextId: string | null, animate = true) => {
        if (token !== pinTransitionTokenRef.current) {
          return;
        }
        setDisplayedPinLocationId(nextId);
        if (!nextId) {
          setPinSelectionProgress(0);
          return;
        }
        if (!animate) {
          setPinSelectionProgress(1);
          return;
        }
        setPinSelectionProgress(0);
        animatePinProgress(0, 1, PIN_RISE_TRANSITION_MS, () => {});
      };

      if (!currentPinLocationId) {
        // Keep the newly selected pin steady on first selection from "all pins visible".
        swapAndRise(nextPinLocationId, false);
        return;
      }

      animatePinProgress(
        pinSelectionProgressRef.current,
        0,
        PIN_COLLAPSE_TRANSITION_MS,
        () => swapAndRise(nextPinLocationId),
      );
    }, [activeLocation, displayedRegion]);

    useEffect(() => {
      const activeRegionKey = displayedRegion?.trim().toLowerCase() ?? null;
      const nextFlightLocationId =
        activeLocation &&
        activeRegionKey &&
        activeLocation.region.trim().toLowerCase() === activeRegionKey
          ? activeLocation.id
          : null;
      const currentFlightLocationId = displayedFlightLocationIdRef.current;
      if (nextFlightLocationId === currentFlightLocationId) {
        return;
      }

      const token = ++arcTransitionTokenRef.current;
      if (arcCollapseFrameRef.current !== null) {
        window.cancelAnimationFrame(arcCollapseFrameRef.current);
        arcCollapseFrameRef.current = null;
      }
      if (arcSwapTimeoutRef.current !== null) {
        window.clearTimeout(arcSwapTimeoutRef.current);
        arcSwapTimeoutRef.current = null;
      }

      const animateHiddenProgress = (
        from: number,
        to: number,
        durationMs: number,
        onComplete: () => void,
      ) => {
        if (durationMs <= 0 || Math.abs(to - from) < 0.001) {
          setArcCollapseProgress(to);
          onComplete();
          return;
        }

        let startTime: number | null = null;
        const tick = (timestamp: number) => {
          if (token !== arcTransitionTokenRef.current) {
            return;
          }
          if (startTime === null) {
            startTime = timestamp;
          }

          const elapsed = timestamp - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = 1 - (1 - progress) * (1 - progress);
          setArcCollapseProgress(from + (to - from) * eased);

          if (progress >= 1) {
            arcCollapseFrameRef.current = null;
            onComplete();
            return;
          }

          arcCollapseFrameRef.current = window.requestAnimationFrame(tick);
        };

        arcCollapseFrameRef.current = window.requestAnimationFrame(tick);
      };

      const completeSwap = (nextId: string | null, fadeIn: boolean) => {
        if (token !== arcTransitionTokenRef.current) {
          return;
        }
        setDisplayedFlightLocationId(nextId);
        if (!nextId) {
          setArcCollapseProgress(0);
          return;
        }

        if (!fadeIn) {
          setArcCollapseProgress(0);
          return;
        }

        setArcCollapseProgress(1);
        animateHiddenProgress(1, 0, ARC_FADE_IN_TRANSITION_MS, () => {});
      };

      if (!currentFlightLocationId) {
        completeSwap(nextFlightLocationId, true);
        return;
      }

      const startProgress = arcCollapseProgressRef.current;
      animateHiddenProgress(
        startProgress,
        1,
        ARC_COLLAPSE_TRANSITION_MS,
        () => {
          setDisplayedFlightLocationId(null);
          if (nextFlightLocationId) {
            arcSwapTimeoutRef.current = window.setTimeout(() => {
              arcSwapTimeoutRef.current = null;
              completeSwap(nextFlightLocationId, true);
            }, ARC_SWAP_DELAY_MS);
          } else {
            setArcCollapseProgress(0);
          }
        },
      );
    }, [activeLocation, displayedRegion]);

    useEffect(() => {
      const globe = globeRef.current;
      const hadActiveLocation = previousActiveLocationIdRef.current !== null;
      const hasActiveLocation = activeLocation !== null;
      previousActiveLocationIdRef.current = activeLocation?.id ?? null;

      if (!globe || !hadActiveLocation || hasActiveLocation || !displayedRegion) {
        return;
      }

      const regionKey = displayedRegion.trim().toLowerCase();
      const regionLocations = locationsByRegion.get(regionKey);
      if (!regionLocations || regionLocations.length === 0) {
        return;
      }

      const lat =
        regionLocations.reduce((total, location) => total + location.lat, 0) /
        regionLocations.length;
      const lng =
        regionLocations.reduce((total, location) => total + location.lng, 0) /
        regionLocations.length;
      const offsetTarget = withLeftCameraOffset(lat, lng);

      setAutoRotation(globe, false);
      setCameraState(
        globe,
        {
          lat: offsetTarget.lat,
          lng: offsetTarget.lng,
          altitude: 1.25,
        },
        REGION_REFOCUS_TRANSITION_MS,
      );
    }, [activeLocation, displayedRegion, locationsByRegion]);

    useEffect(() => {
      if (!activeRegion) {
        return;
      }

      const globe = globeRef.current;
      if (!globe) {
        return;
      }

      const token = ++transitionTokenRef.current;
      const targetRegion = activeRegion.trim().toLowerCase();
      const regionLocations = locationsByRegion.get(targetRegion);
      if (!regionLocations || regionLocations.length === 0) {
        return;
      }

      if (regionTransitionTimeoutRef.current !== null) {
        window.clearTimeout(regionTransitionTimeoutRef.current);
        regionTransitionTimeoutRef.current = null;
      }
      if (lineAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(lineAnimationFrameRef.current);
        lineAnimationFrameRef.current = null;
      }

      const animateLineProgress = (from: number, to: number, durationMs: number) => {
        return new Promise<void>((resolve) => {
          if (durationMs <= 0 || Math.abs(to - from) < 0.001) {
            setLineGrowProgress(to);
            resolve();
            return;
          }

          let startTime: number | null = null;
          const tick = (timestamp: number) => {
            if (token !== transitionTokenRef.current) {
              resolve();
              return;
            }

            if (startTime === null) {
              startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / durationMs);
            const eased = 1 - (1 - progress) * (1 - progress);
            const nextValue = from + (to - from) * eased;
            setLineGrowProgress(nextValue);

            if (progress >= 1) {
              lineAnimationFrameRef.current = null;
              resolve();
              return;
            }

            lineAnimationFrameRef.current = window.requestAnimationFrame(tick);
          };

          lineAnimationFrameRef.current = window.requestAnimationFrame(tick);
        });
      };

      const runRegionTransition = async () => {
        const currentRegion = displayedRegionRef.current?.trim().toLowerCase() ?? null;
        if (currentRegion === targetRegion && lineGrowProgressRef.current >= 0.999) {
          return;
        }

        setAutoRotation(globe, false);

        const lat =
          regionLocations.reduce((total, location) => total + location.lat, 0) /
          regionLocations.length;
        const lng =
          regionLocations.reduce((total, location) => total + location.lng, 0) /
          regionLocations.length;
        const offsetTarget = withLeftCameraOffset(lat, lng);

        setCameraState(
          globe,
          {
            lat: offsetTarget.lat,
            lng: offsetTarget.lng,
            altitude: 1.25,
          },
          REGION_ROTATE_TRANSITION_MS,
        );

        if (currentRegion) {
          await animateLineProgress(
            lineGrowProgressRef.current,
            0,
            Math.min(COLLAPSE_TRANSITION_MS, REGION_PIN_OUTRO_MS),
          );
          if (token !== transitionTokenRef.current) {
            return;
          }
        }

        await new Promise<void>((resolve) => {
          const delayMs = Math.min(
            REGION_PIN_INTRO_DELAY_MS,
            Math.max(0, REGION_ROTATE_TRANSITION_MS - GROW_TRANSITION_MS),
          );
          regionTransitionTimeoutRef.current = window.setTimeout(() => {
            regionTransitionTimeoutRef.current = null;
            resolve();
          }, delayMs);
        });
        if (token !== transitionTokenRef.current) {
          return;
        }

        setDisplayedRegion(activeRegion);
        onRegionPinsTriggered?.(activeRegion);
        setLineGrowProgress(0);
        await animateLineProgress(0, 1, GROW_TRANSITION_MS);
      };

      void runRegionTransition();
    }, [activeRegion, locationsByRegion, onRegionPinsTriggered]);

    useImperativeHandle(
      ref,
      () => ({
        flyToLocation: (locationId: string) => {
          const globe = globeRef.current;
          if (!globe) {
            return;
          }

          const target = locationsById.get(locationId.trim().toLowerCase());
          if (!target) {
            return;
          }

          setAutoRotation(globe, false);
          const offsetTarget = withLeftCameraOffset(target.lat, target.lng);
          const zoomState = buildZoomState(offsetTarget, initialCameraState.altitude);
          setCameraState(globe, zoomState, 1800);
        },
        flyToRegion: (_region: string) => {},
        resetView: () => {
          const globe = globeRef.current;
          if (!globe) {
            return;
          }

          if (resetRotationTimeoutRef.current !== null) {
            window.clearTimeout(resetRotationTimeoutRef.current);
          }
          transitionTokenRef.current += 1;
          if (lineAnimationFrameRef.current !== null) {
            window.cancelAnimationFrame(lineAnimationFrameRef.current);
            lineAnimationFrameRef.current = null;
          }
          pinTransitionTokenRef.current += 1;
          if (pinTransitionFrameRef.current !== null) {
            window.cancelAnimationFrame(pinTransitionFrameRef.current);
            pinTransitionFrameRef.current = null;
          }
          arcTransitionTokenRef.current += 1;
          if (arcCollapseFrameRef.current !== null) {
            window.cancelAnimationFrame(arcCollapseFrameRef.current);
            arcCollapseFrameRef.current = null;
          }
          if (arcSwapTimeoutRef.current !== null) {
            window.clearTimeout(arcSwapTimeoutRef.current);
            arcSwapTimeoutRef.current = null;
          }
          if (regionTransitionTimeoutRef.current !== null) {
            window.clearTimeout(regionTransitionTimeoutRef.current);
            regionTransitionTimeoutRef.current = null;
          }
          setLineGrowProgress(0);
          setPinSelectionProgress(0);
          setDisplayedPinLocationId(null);
          setArcCollapseProgress(0);
          setDisplayedFlightLocationId(null);
          setDisplayedRegion(null);

          setCameraState(globe, initialCameraState, RESET_VIEW_TRANSITION_MS);
          resetRotationTimeoutRef.current = window.setTimeout(() => {
            const currentGlobe = globeRef.current;
            if (!currentGlobe) {
              return;
            }

            setAutoRotation(currentGlobe, true);
            resetRotationTimeoutRef.current = null;
          }, RESET_VIEW_TRANSITION_MS);
        },
      }),
      [initialCameraState, locationsById],
    );

    const tipScale = Math.max(
      TIP_MIN_SCALE,
      Math.min(TIP_MAX_SCALE, initialCameraState.altitude / cameraAltitude),
    );
    const tipSizePx = TIP_BASE_SIZE_PX * tipScale;
    const focusLocation = (locationId: string, lat: number, lng: number) => {
      if (!globeRef.current) {
        return;
      }

      setAutoRotation(globeRef.current, false);
      onSelectLocation?.(locationId);
      const offsetPoint = withLeftCameraOffset(lat, lng);
      const targetState = buildZoomState(
        { lat: offsetPoint.lat, lng: offsetPoint.lng },
        initialCameraState.altitude,
      );
      setCameraState(globeRef.current, targetState, 1700);
    };

    return (
      <div
        className={`globe-stage ${activeRegion ? 'globe-stage-region-active' : ''}`}
      >
        <div className="globe-shift-shell">
          <Globe
          ref={globeRef}
          width={viewport.width}
          height={viewport.height}
          backgroundColor="rgba(0, 0, 0, 0)"
          globeImageUrl={globeTextureUrl}
          bumpImageUrl={BUMP_TEXTURE}
          showAtmosphere={false}
          pointsData={visibleLineData}
          pointLat="lat"
          pointLng="lng"
          pointColor="lineColor"
          pointAltitude="animatedAltitude"
          pointRadius="radius"
          pointsMerge
          pointsTransitionDuration={500}
          pointLabel={(d) => (d as { name: string }).name}
          htmlElementsData={visibleHtmlData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude="animatedAltitude"
          htmlElement={(d) => {
            const traveler = d as
              | {
                  kind?: string;
                  color: string;
                  glow: string;
                  sizePx: number;
                }
              | undefined;
            if (traveler?.kind === 'intro-traveler') {
              const element = document.createElement('div');
              element.className = 'globe-line-tip';
              element.style.backgroundColor = traveler.color;
              element.style.opacity = '1';
              element.style.width = `${traveler.sizePx}px`;
              element.style.height = `${traveler.sizePx}px`;
              element.style.pointerEvents = 'none';
              element.style.cursor = 'default';
              element.style.boxShadow = `0 0 ${Math.max(10, traveler.sizePx * 2.1)}px ${traveler.glow}`;
              return element;
            }

            const point = d as { id: string; lat: number; lng: number; tipColor: string; tipOpacity: number };
            const element = document.createElement('div');
            element.className = 'globe-line-tip';
            element.style.backgroundColor = point.tipColor;
            element.style.opacity = `${point.tipOpacity}`;
            element.style.width = `${tipSizePx}px`;
            element.style.height = `${tipSizePx}px`;
            element.style.pointerEvents = 'auto';
            element.style.cursor = 'pointer';
            element.style.boxShadow = `0 0 ${Math.max(8, tipSizePx * 1.4)}px rgba(158, 227, 218, 0.45)`;
            element.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              focusLocation(point.id, point.lat, point.lng);
            });
            return element;
          }}
          htmlTransitionDuration={500}
          arcsData={visibleArcData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcLabel={(d) => (d as { label: string }).label}
          arcAltitude="altitude"
          arcAltitudeAutoScale={0}
          arcDashLength="dashLength"
          arcDashGap="dashGap"
          arcDashInitialGap="dashOffset"
          arcDashAnimateTime="dashAnimateTime"
          arcCurveResolution={ARC_CURVE_RESOLUTION}
          arcCircularResolution={ARC_CIRCULAR_RESOLUTION}
          arcStroke={ACTIVE_ARC_STROKE}
          arcsTransitionDuration={0}
          onGlobeReady={() => {
            if (!globeRef.current) {
              return;
            }

            const globe = globeRef.current;
            configureGlobeControls(globe);
            globe.renderer().setPixelRatio(
              Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO),
            );
            setAutoRotation(globe, true);
            setCameraState(globe, initialCameraState, 0);
            const syncCameraAltitude = () => {
              if (cameraSyncFrameRef.current !== null) {
                return;
              }

              cameraSyncFrameRef.current = window.requestAnimationFrame(() => {
                cameraSyncFrameRef.current = null;
                const currentGlobe = globeRef.current;
                if (!currentGlobe) {
                  return;
                }

                const nextAltitude = currentGlobe.pointOfView().altitude;
                setCameraAltitude((previousAltitude) =>
                  Math.abs(previousAltitude - nextAltitude) < 0.002
                    ? previousAltitude
                    : nextAltitude,
                );
              });
            };
            syncCameraAltitude();

            if (hasInteractionListenerRef.current) {
              return;
            }

            globe.controls().addEventListener('start', () => {
              const currentGlobe = globeRef.current;
              if (!currentGlobe) {
                return;
              }

              setAutoRotation(currentGlobe, false);
            });
            globe.controls().addEventListener('change', syncCameraAltitude);
            hasInteractionListenerRef.current = true;
          }}
          onPointClick={(point) => {
            const pointLocation = point as { id?: string; lat: number; lng: number };
            if (!pointLocation.id) {
              return;
            }
            focusLocation(pointLocation.id, pointLocation.lat, pointLocation.lng);
          }}
          />
        </div>
      </div>
    );
  },
);

GlobeView.displayName = 'GlobeView';
