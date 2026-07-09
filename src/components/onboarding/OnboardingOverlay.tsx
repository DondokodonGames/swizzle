import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'swizzle_onboarding_seen';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // localStorage unavailable — nothing to persist, overlay just won't be suppressed next time
  }
}

interface Slide {
  emoji: string;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  { emoji: '👆', titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { emoji: '👉', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { emoji: '🎨', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
];

export const OnboardingOverlay: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const finish = () => {
    markOnboardingSeen();
    onDone();
  };

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 10, 15, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        color: 'white',
      }}
    >
      <button
        onClick={finish}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        {t('onboarding.skip')}
      </button>

      <div style={{ fontSize: 72, marginBottom: 24 }}>{slide.emoji}</div>
      <h2 style={{ fontSize: 22, marginBottom: 12, textAlign: 'center' }}>{t(slide.titleKey)}</h2>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', maxWidth: 320, marginBottom: 32 }}>
        {t(slide.bodyKey)}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === step ? '#a855f7' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>

      <button
        onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
        style={{
          backgroundColor: '#a855f7',
          color: 'white',
          border: 'none',
          padding: '14px 40px',
          borderRadius: 999,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isLast ? t('onboarding.start') : t('onboarding.next')}
      </button>
    </div>
  );
};

export default OnboardingOverlay;
