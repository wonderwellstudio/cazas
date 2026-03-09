import { Fragment, useEffect, useRef, useState, type ReactElement } from 'react';
import type { Location } from '../data/locations';

interface GlobeOverlayProps {
  regions: string[];
  activeRegion: string | null;
  chapterRegion: string | null;
  locations: Location[];
  activeLocationId: string | null;
  onSelectRegion: (region: string) => void;
  onSelectLocation: (locationId: string) => void;
  onOpenLocationDetail: (locationId: string) => void;
  onClearLocationSelection: () => void;
  onResetView: () => void;
  onToggleDayNight: () => void;
  onCopyDesignForFigma: () => void;
  figmaCopyStatus: 'idle' | 'capturing' | 'captured' | 'error';
  isDaytime: boolean;
}

const CHAPTER_FADE_DURATION_MS = 220;
const BACK_ICON_SRC = '/assets/ui/nav-icons/back.svg';
const CLOSE_ICON_SRC = '/assets/ui/nav-icons/close.svg';
const ELLIPSIS_ICON_SRC = '/assets/ui/nav-icons/ellipsis.svg';
const SUN_ICON_SRC = '/assets/ui/nav-icons/sun.svg';
const MOON_ICON_SRC = '/assets/ui/nav-icons/moon.svg';
const FALLBACK_LOCATION_IMAGE = '/assets/locations/location-fallback.svg';

export function GlobeOverlay({
  regions,
  activeRegion,
  chapterRegion,
  locations,
  activeLocationId,
  onSelectRegion,
  onSelectLocation,
  onOpenLocationDetail,
  onClearLocationSelection,
  onResetView,
  onToggleDayNight,
  onCopyDesignForFigma,
  figmaCopyStatus,
  isDaytime,
}: GlobeOverlayProps): ReactElement {
  const fadeTimerRef = useRef<number | null>(null);
  const worldTitleTimerRef = useRef<number | null>(null);
  const hasShownWorldTitleRef = useRef(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [renderedRegion, setRenderedRegion] = useState<string | null>(chapterRegion);
  const [renderedLocations, setRenderedLocations] = useState<Location[]>(locations);
  const [isChapterVisible, setIsChapterVisible] = useState(Boolean(chapterRegion));
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [fadeInKey, setFadeInKey] = useState(0);
  const [isWorldTitleMounted, setIsWorldTitleMounted] = useState(
    !chapterRegion,
  );
  const [isWorldTitleVisible, setIsWorldTitleVisible] = useState(false);

  const copyButtonLabel = figmaCopyStatus === 'capturing' ? 'Capturing...' : 'Figma';

  const copyStatusMessage =
    figmaCopyStatus === 'captured'
      ? 'Figma capture completed.'
      : figmaCopyStatus === 'error'
        ? 'Capture failed. Reopen the capture URL and try again.'
        : null;

  useEffect(() => {
    if (!activeRegion) {
      setIsOptionsOpen(false);
    }
  }, [activeRegion]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
      if (worldTitleTimerRef.current !== null) {
        window.clearTimeout(worldTitleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeRegion || !renderedRegion) {
      return;
    }

    setIsFadingOut(activeRegion !== renderedRegion);
  }, [activeRegion, renderedRegion]);

  useEffect(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (!chapterRegion) {
      if (!renderedRegion) {
        setRenderedLocations([]);
        setIsChapterVisible(false);
        setIsFadingOut(false);
        return;
      }

      setIsFadingOut(true);
      fadeTimerRef.current = window.setTimeout(() => {
        setIsChapterVisible(false);
        setRenderedRegion(null);
        setRenderedLocations([]);
        setIsFadingOut(false);
        fadeTimerRef.current = null;
      }, CHAPTER_FADE_DURATION_MS);
      return;
    }

    if (!renderedRegion) {
      setRenderedRegion(chapterRegion);
      setRenderedLocations(locations);
      setIsChapterVisible(true);
      setIsFadingOut(false);
      setFadeInKey((value) => value + 1);
      return;
    }

    if (renderedRegion !== chapterRegion) {
      setRenderedRegion(chapterRegion);
      setRenderedLocations(locations);
      setIsChapterVisible(true);
      setIsFadingOut(false);
      setFadeInKey((value) => value + 1);
      return;
    }

    setRenderedLocations(locations);
    setIsChapterVisible(true);
    setIsFadingOut(false);
  }, [chapterRegion, locations, renderedRegion]);

  useEffect(() => {
    const shouldShowWorldTitle = !renderedRegion && !isChapterVisible;
    const SHOW_DELAY_FIRST_LOAD_MS = 850;
    const SHOW_DELAY_RETURN_MS = 120;
    const HIDE_DURATION_MS = 260;

    if (worldTitleTimerRef.current !== null) {
      window.clearTimeout(worldTitleTimerRef.current);
      worldTitleTimerRef.current = null;
    }

    if (shouldShowWorldTitle) {
      setIsWorldTitleMounted(true);
      const fadeInDelay = hasShownWorldTitleRef.current
        ? SHOW_DELAY_RETURN_MS
        : SHOW_DELAY_FIRST_LOAD_MS;

      worldTitleTimerRef.current = window.setTimeout(() => {
        setIsWorldTitleVisible(true);
        hasShownWorldTitleRef.current = true;
        worldTitleTimerRef.current = null;
      }, fadeInDelay);
      return;
    }

    setIsWorldTitleVisible(false);
    worldTitleTimerRef.current = window.setTimeout(() => {
      setIsWorldTitleMounted(false);
      worldTitleTimerRef.current = null;
    }, HIDE_DURATION_MS);
  }, [isChapterVisible, renderedRegion]);

  return (
    <>
      <div className="globe-overlay" aria-label="Region controls">
        {activeRegion ? (
          <button
            type="button"
            className="overlay-button overlay-icon-button overlay-icon-button-full"
            onClick={onResetView}
            aria-label="Back to all regions"
            title="Back to all regions"
          >
            <img src={BACK_ICON_SRC} alt="" className="overlay-icon-image overlay-icon-image-back" />
          </button>
        ) : null}

        {regions.map((region) => (
          <Fragment key={region}>
            <button
              type="button"
              className={`overlay-button overlay-pill-button ${
                activeRegion === region ? 'overlay-button-active' : ''
              }`}
              onClick={() => onSelectRegion(region)}
            >
              {region}
            </button>
          </Fragment>
        ))}

        <button
          type="button"
          className="overlay-button overlay-icon-button"
          onClick={() => setIsOptionsOpen((value) => !value)}
          aria-label={isOptionsOpen ? 'Close options' : 'Open options'}
          title={isOptionsOpen ? 'Close options' : 'Open options'}
        >
          {isOptionsOpen ? (
            <img src={CLOSE_ICON_SRC} alt="" className="overlay-icon-image overlay-icon-image-full" />
          ) : (
            <img
              src={ELLIPSIS_ICON_SRC}
              alt=""
              className="overlay-icon-image overlay-icon-image-ellipsis"
            />
          )}
        </button>

        {isOptionsOpen ? (
          <>
            <button
              type="button"
              className="overlay-button overlay-icon-button overlay-icon-button-full"
              onClick={onToggleDayNight}
              aria-label={isDaytime ? 'Switch to night mode' : 'Switch to day mode'}
              title={isDaytime ? 'Switch to night mode' : 'Switch to day mode'}
              aria-pressed={isDaytime}
            >
              <img
                src={isDaytime ? MOON_ICON_SRC : SUN_ICON_SRC}
                alt=""
                className="overlay-icon-image overlay-icon-image-full"
              />
            </button>
            <button
              type="button"
              className="overlay-button overlay-pill-button"
              onClick={onCopyDesignForFigma}
              disabled={figmaCopyStatus === 'capturing'}
            >
              {copyButtonLabel}
            </button>
          </>
        ) : null}
      </div>

      {copyStatusMessage ? (
        <p
          className={`figma-copy-status ${
            figmaCopyStatus === 'error' ? 'figma-copy-status-error' : ''
          }`}
          role="status"
          aria-live="polite"
        >
          {copyStatusMessage}
        </p>
      ) : null}

      {isWorldTitleMounted ? (
        <p
          className={`world-title ${
            isWorldTitleVisible ? 'world-title-visible' : 'world-title-hidden'
          }`}
          aria-hidden="true"
        >
          Cazas World
        </p>
      ) : null}

      {renderedRegion && isChapterVisible ? (
        <>
          <p
            key={`chapter-${renderedRegion}-${fadeInKey}`}
            className={`chapter-title chapter-fade ${isFadingOut ? 'chapter-fade-out' : ''}`}
            aria-live="polite"
          >
            Cazas {renderedRegion}
          </p>

          <aside
            key={`panel-${renderedRegion}-${fadeInKey}`}
            className={`chapter-properties-panel chapter-fade ${isFadingOut ? 'chapter-fade-out' : ''}`}
            aria-label={`${renderedRegion} properties`}
            onMouseLeave={onClearLocationSelection}
          >
            <div className="chapter-properties-list">
              {renderedLocations.map((location) => (
                <article
                  key={location.id}
                  className={`property-card ${
                    activeLocationId === location.id ? 'property-card-active' : ''
                  }`}
                  onClick={() => onOpenLocationDetail(location.id)}
                  onMouseEnter={() => onSelectLocation(location.id)}
                  onFocus={() => onSelectLocation(location.id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }
                    event.preventDefault();
                    onOpenLocationDetail(location.id);
                  }}
                  tabIndex={0}
                >
                  <div className="property-card-image-wrap">
                    <LocationCardImage src={location.imageUrl} alt={location.name} />
                  </div>
                  <div className="property-card-content">
                    <div className="property-card-top">
                      <div>
                        <h3 className="property-card-name">{location.name}</h3>
                        <p className="property-card-location">{location.location}</p>
                      </div>
                      <div className="property-card-specs">
                        <div>
                          <p className="property-card-spec-label">Bedroom</p>
                          <p className="property-card-spec-value">{location.bedrooms}</p>
                        </div>
                        <div>
                          <p className="property-card-spec-label">Bath</p>
                          <p className="property-card-spec-value">{location.bathrooms}</p>
                        </div>
                      </div>
                    </div>
                    <div className="property-card-bottom">
                      <p className="property-card-description">42 ownership shares remaining</p>
                      <button
                        type="button"
                        className="property-card-cta"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenLocationDetail(location.id);
                        }}
                      >
                        View Property
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

interface LocationCardImageProps {
  src: string;
  alt: string;
}

function LocationCardImage({ src, alt }: LocationCardImageProps): ReactElement {
  return (
    <img
      src={src}
      alt={alt}
      className="property-card-image"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src.endsWith(FALLBACK_LOCATION_IMAGE)) {
          return;
        }

        image.src = FALLBACK_LOCATION_IMAGE;
      }}
    />
  );
}
