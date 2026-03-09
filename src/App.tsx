import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GlobeOverlay } from './components/GlobeOverlay';
import { GlobeView, type GlobeViewHandle } from './components/GlobeView';
import { LocationDetailSheet } from './components/LocationDetailSheet';
import { LOCATIONS, type Location } from './data/locations';

declare global {
  interface Window {
    figma?: {
      captureForDesign: (options: {
        captureId?: string;
        endpoint?: string;
        selector?: string;
      }) => Promise<{ success?: boolean; error?: string } | unknown>;
    };
  }
}

function App(): ReactElement {
  const globeRef = useRef<GlobeViewHandle>(null);
  const copyStatusTimerRef = useRef<number | null>(null);
  const [isDaytime, setIsDaytime] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [chapterRegion, setChapterRegion] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [detailLocationId, setDetailLocationId] = useState<string | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isDetailFullyVisible, setIsDetailFullyVisible] = useState(false);
  const [figmaCopyStatus, setFigmaCopyStatus] = useState<
    'idle' | 'capturing' | 'captured' | 'error'
  >('idle');

  const availableRegions = useMemo(() => {
    return Array.from(new Set(LOCATIONS.map((location) => location.region)));
  }, []);

  const chapterLocations = useMemo<Location[]>(() => {
    if (!chapterRegion) {
      return [];
    }

    const selectedRegion = chapterRegion.trim().toLowerCase();
    return LOCATIONS.filter(
      (location) => location.region.trim().toLowerCase() === selectedRegion,
    );
  }, [chapterRegion]);

  const detailLocation = useMemo(() => {
    if (!detailLocationId) {
      return null;
    }
    return LOCATIONS.find((location) => location.id === detailLocationId) ?? null;
  }, [detailLocationId]);

  const detailLocationIndex = useMemo(() => {
    if (!detailLocation || chapterLocations.length === 0) {
      return -1;
    }
    return chapterLocations.findIndex((location) => location.id === detailLocation.id);
  }, [chapterLocations, detailLocation]);

  useEffect(() => {
    return () => {
      if (copyStatusTimerRef.current !== null) {
        window.clearTimeout(copyStatusTimerRef.current);
      }
    };
  }, []);

  const handleSelectRegion = (region: string) => {
    if (region === activeRegion) {
      return;
    }
    setActiveRegion(region);
    setActiveLocationId(null);
  };

  const handleSelectLocation = (locationId: string) => {
    setActiveLocationId(locationId);
    globeRef.current?.flyToLocation(locationId);
  };

  const handleOpenLocationDetail = (locationId: string) => {
    handleSelectLocation(locationId);
    setIsDetailClosing(false);
    setDetailLocationId(locationId);
  };

  const handleResetView = () => {
    setActiveRegion(null);
    setChapterRegion(null);
    setActiveLocationId(null);
    setIsDetailClosing(false);
    setDetailLocationId(null);
    setIsDetailFullyVisible(false);
    globeRef.current?.resetView();
  };

  const handleToggleDayNight = () => {
    setIsDaytime((value) => !value);
  };

  const handleRegionPinsTriggered = useCallback((region: string) => {
    setChapterRegion(region);
  }, []);

  const handleCopyDesignForFigma = async () => {
    if (copyStatusTimerRef.current !== null) {
      window.clearTimeout(copyStatusTimerRef.current);
      copyStatusTimerRef.current = null;
    }

    setFigmaCopyStatus('capturing');

    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const captureId = hashParams.get('figmacapture');
      const endpoint = hashParams.get('figmaendpoint');
      const selector = hashParams.get('figmaselector') ?? 'body';

      if (!window.figma?.captureForDesign) {
        throw new Error('Figma capture API is not available.');
      }

      const captureResult =
        captureId && endpoint
          ? await window.figma.captureForDesign({
              captureId,
              endpoint,
              selector,
            })
          : await window.figma.captureForDesign({
              selector,
            });

      if (typeof captureResult === 'object' && captureResult !== null) {
        const typedResult = captureResult as { success?: boolean; error?: string };
        if (typedResult.success === false) {
          throw new Error(
            typeof typedResult.error === 'string' ? typedResult.error : 'Capture failed.',
          );
        }
      }

      setFigmaCopyStatus('captured');
    } catch {
      setFigmaCopyStatus('error');
    }

    copyStatusTimerRef.current = window.setTimeout(() => {
      setFigmaCopyStatus('idle');
      copyStatusTimerRef.current = null;
    }, 4500);
  };

  return (
    <main className="app-shell">
      <div
        className={`experience-content ${
          detailLocation && !isDetailClosing ? 'experience-content-dimmed' : ''
        }`}
      >
        <GlobeView
          ref={globeRef}
          locations={LOCATIONS}
          isDaytime={isDaytime}
          activeRegion={activeRegion}
          activeLocationId={activeLocationId}
          onSelectLocation={handleSelectLocation}
          onRegionPinsTriggered={handleRegionPinsTriggered}
          isPaused={isDetailFullyVisible}
        />
        <GlobeOverlay
          regions={availableRegions}
          activeRegion={activeRegion}
          chapterRegion={chapterRegion}
          locations={chapterLocations}
          activeLocationId={activeLocationId}
          onSelectRegion={handleSelectRegion}
          onSelectLocation={handleSelectLocation}
          onOpenLocationDetail={handleOpenLocationDetail}
          onClearLocationSelection={() => setActiveLocationId(null)}
          onResetView={handleResetView}
          isDaytime={isDaytime}
          onToggleDayNight={handleToggleDayNight}
          onCopyDesignForFigma={handleCopyDesignForFigma}
          figmaCopyStatus={figmaCopyStatus}
        />
      </div>
      {detailLocation ? (
        <LocationDetailSheet
          location={detailLocation}
          regionLabel={`Cazas ${detailLocation.region}`}
          canNavigatePrevious={detailLocationIndex > 0}
          canNavigateNext={
            detailLocationIndex >= 0 && detailLocationIndex < chapterLocations.length - 1
          }
          onNavigatePrevious={() => {
            if (detailLocationIndex <= 0) {
              return;
            }
            const next = chapterLocations[detailLocationIndex - 1];
            handleOpenLocationDetail(next.id);
          }}
          onNavigateNext={() => {
            if (
              detailLocationIndex < 0 ||
              detailLocationIndex >= chapterLocations.length - 1
            ) {
              return;
            }
            const next = chapterLocations[detailLocationIndex + 1];
            handleOpenLocationDetail(next.id);
          }}
          onRequestClose={() => {
            setIsDetailClosing(true);
            setIsDetailFullyVisible(false);
          }}
          isClosing={isDetailClosing}
          onCloseComplete={() => {
            setIsDetailClosing(false);
            setDetailLocationId(null);
            setIsDetailFullyVisible(false);
          }}
          onOpenStateChange={setIsDetailFullyVisible}
        />
      ) : null}
    </main>
  );
}

export default App;
