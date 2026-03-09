import { useEffect, useState, type ReactElement } from 'react';

import type { Location } from '../data/locations';

interface LocationDetailSheetProps {
  location: Location;
  regionLabel: string;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onRequestClose: () => void;
  isClosing: boolean;
  onCloseComplete: () => void;
  onOpenStateChange: (isFullyVisible: boolean) => void;
}

const SHEET_TRANSITION_MS = 680;
const CLOSE_BLUR_LINGER_MS = 250;
const FALLBACK_LOCATION_IMAGE = '/assets/locations/location-fallback.svg';
const PREVIOUS_ICON_SRC = 'https://www.figma.com/api/mcp/asset/0e5fb704-e20c-488d-a423-03c70e48bdf7';
const NEXT_ICON_SRC = 'https://www.figma.com/api/mcp/asset/d6cfe9e0-5995-49a0-89b9-27d3492c96be';
const CLOSE_ICON_SRC = 'https://www.figma.com/api/mcp/asset/1f0b91ee-0b26-441f-856c-df3abf6a25d5';

export function LocationDetailSheet({
  location,
  regionLabel,
  canNavigatePrevious,
  canNavigateNext,
  onNavigatePrevious,
  onNavigateNext,
  onRequestClose,
  isClosing,
  onCloseComplete,
  onOpenStateChange,
}: LocationDetailSheetProps): ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isBackdropVisible, setIsBackdropVisible] = useState(false);

  useEffect(() => {
    onOpenStateChange(false);

    if (isClosing) {
      setIsVisible(false);
      const backdropTimer = window.setTimeout(() => {
        setIsBackdropVisible(false);
      }, CLOSE_BLUR_LINGER_MS);
      const closeTimer = window.setTimeout(() => {
        onCloseComplete();
      }, SHEET_TRANSITION_MS + CLOSE_BLUR_LINGER_MS);

      return () => {
        window.clearTimeout(backdropTimer);
        window.clearTimeout(closeTimer);
      };
    }

    const showFrame = window.requestAnimationFrame(() => {
      setIsBackdropVisible(true);
      setIsVisible(true);
    });
    const openTimer = window.setTimeout(() => {
      onOpenStateChange(true);
    }, SHEET_TRANSITION_MS);

    return () => {
      window.cancelAnimationFrame(showFrame);
      window.clearTimeout(openTimer);
    };
  }, [isClosing, location.id, onCloseComplete, onOpenStateChange]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      onRequestClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onRequestClose]);

  return (
    <div
      className={`location-detail-root ${
        isVisible ? 'location-detail-root-visible' : ''
      }`}
      aria-modal="true"
      role="dialog"
      aria-label={`${location.name} location details`}
    >
      <button
        type="button"
        className={`location-detail-backdrop ${
          isBackdropVisible ? 'location-detail-backdrop-visible' : ''
        }`}
        onClick={onRequestClose}
        aria-label="Close location details"
      />

      <section
        className={`location-detail-sheet ${
          isVisible ? 'location-detail-sheet-visible' : ''
        } ${isClosing ? 'location-detail-sheet-closing' : ''}`}
      >
        <div className="location-detail-copy">
          <p className="location-detail-region">{regionLabel}</p>
          <h2 className="location-detail-title">{location.name}</h2>
          <p className="location-detail-description">{buildLongDescription(location)}</p>
        </div>

        <div className="location-detail-image-wrap">
          <img
            src={location.imageUrl}
            alt={location.name}
            className="location-detail-image"
            referrerPolicy="no-referrer"
            onError={(event) => {
              const image = event.currentTarget;
              if (image.src.endsWith(FALLBACK_LOCATION_IMAGE)) {
                return;
              }
              image.src = FALLBACK_LOCATION_IMAGE;
            }}
          />
          <div className="location-detail-ctas">
            <button type="button" className="location-detail-cta location-detail-cta-primary">
              Book a Stay
            </button>
            <button type="button" className="location-detail-cta location-detail-cta-secondary">
              Become an Owner
            </button>
          </div>
        </div>

        <div className="location-detail-controls">
          <button
            type="button"
            className="location-detail-control"
            onClick={onNavigatePrevious}
            aria-label="View previous location"
            disabled={!canNavigatePrevious}
          >
            <img
              src={PREVIOUS_ICON_SRC}
              alt=""
              aria-hidden="true"
              className="location-detail-control-icon"
            />
          </button>
          <button
            type="button"
            className="location-detail-control"
            onClick={onNavigateNext}
            aria-label="View next location"
            disabled={!canNavigateNext}
          >
            <img
              src={NEXT_ICON_SRC}
              alt=""
              aria-hidden="true"
              className="location-detail-control-icon"
            />
          </button>
          <button
            type="button"
            className="location-detail-control"
            onClick={onRequestClose}
            aria-label="Close location details"
          >
            <img
              src={CLOSE_ICON_SRC}
              alt=""
              aria-hidden="true"
              className="location-detail-control-icon"
            />
          </button>
        </div>
      </section>
    </div>
  );
}

function buildLongDescription(location: Location): string {
  const [city] = location.location.split(',');
  const cleanCity = city?.trim() ?? location.location;
  const bedroomLabel = `${location.bedrooms} bedroom${location.bedrooms === 1 ? '' : 's'}`;
  const bathroomLabel = `${location.bathrooms} bath${location.bathrooms === 1 ? '' : 's'}`;
  return `${location.name} is a ${bedroomLabel}, ${bathroomLabel} residence in ${cleanCity}. ${location.description}. Interiors emphasize local materials, layered natural light, and contemporary comfort.`;
}
