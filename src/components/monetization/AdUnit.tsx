/**
 * AdUnit.tsx
 * Google AdSense広告ユニットコンポーネント
 *
 * 機能:
 * - Freeユーザーに実際のGoogle広告を表示
 * - Premiumユーザーには何も表示しない
 * - AdSenseが読み込まれていない場合はプレースホルダー表示
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import type { AdUnitProps } from '../../types/MonetizationTypes';
import { AdPlacement, getAdSlotId } from '../../types/MonetizationTypes';

// AdSense Client ID (index.htmlと同じ)
const ADSENSE_CLIENT_ID = 'ca-pub-5097371063240942';

// 広告フォーマット設定
const AD_FORMATS: Record<AdPlacement, { style: React.CSSProperties }> = {
  [AdPlacement.GAME_BRIDGE]: {
    style: { display: 'block', width: '100%', height: '100px' }
  },
  [AdPlacement.GAME_LIST]: {
    style: { display: 'block', width: '100%', height: '250px' }
  },
  [AdPlacement.EDITOR_SIDEBAR]: {
    style: { display: 'block', width: '300px', height: '250px' }
  },
};

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/**
 * 広告ユニットコンポーネント
 */
export function AdUnit({ placement, className = '' }: AdUnitProps) {
  const { isPremium, loading } = useSubscription();
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const initializedRef = useRef(false);

  const slotId = getAdSlotId(placement);
  const adFormat = AD_FORMATS[placement];

  useEffect(() => {
    // Premiumユーザーまたはローディング中は広告を読み込まない
    if (loading || isPremium) return;

    // スロットIDがない場合はスキップ
    if (!slotId) {
      console.warn(`AdUnit: スロットID未設定 (${placement})`);
      return;
    }

    // 既に初期化済みの場合はスキップ
    if (initializedRef.current) return;

    // AdSenseスクリプトが読み込まれているか確認
    const initAd = () => {
      try {
        if (window.adsbygoogle && adRef.current) {
          // 広告を初期化
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          initializedRef.current = true;
          setAdLoaded(true);
          console.log(`✅ AdUnit: 広告初期化成功 (${placement})`);
        }
      } catch (error) {
        console.error(`❌ AdUnit: 広告初期化エラー (${placement})`, error);
        setAdError(true);
      }
    };

    // AdSenseが既に読み込まれていれば即座に初期化
    if (window.adsbygoogle) {
      // 少し遅延させてDOMが準備できてから初期化
      const timer = setTimeout(initAd, 100);
      return () => clearTimeout(timer);
    } else {
      // AdSenseの読み込みを待つ
      const checkInterval = setInterval(() => {
        if (window.adsbygoogle) {
          clearInterval(checkInterval);
          initAd();
        }
      }, 500);

      // 5秒後にタイムアウト
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!initializedRef.current) {
          console.warn(`AdUnit: AdSense読み込みタイムアウト (${placement})`);
          setAdError(true);
        }
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [loading, isPremium, slotId, placement]);

  // Premiumユーザーまたはローディング中は広告を表示しない
  if (loading || isPremium) {
    return null;
  }

  // スロットIDが未設定の場合はプレースホルダー表示
  if (!slotId) {
    return (
      <div
        className={`ad-unit ad-unit-placeholder ${className}`}
        data-placement={placement}
        style={{
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          border: '1px dashed rgba(0, 0, 0, 0.1)',
          minHeight: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ color: 'rgba(0, 0, 0, 0.3)', fontSize: '14px' }}>
          <div style={{ marginBottom: '8px', fontSize: '24px' }}>📢</div>
          <div>広告スペース</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Premiumプランで非表示
          </div>
        </div>
      </div>
    );
  }

  // エラー時はプレースホルダー表示
  if (adError) {
    return (
      <div
        className={`ad-unit ad-unit-error ${className}`}
        data-placement={placement}
        style={{
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '12px',
          minHeight: '100px',
        }}
      />
    );
  }

  // Google AdSense広告ユニット
  return (
    <div
      className={`ad-unit ${className}`}
      data-placement={placement}
      style={{
        overflow: 'hidden',
        borderRadius: '12px',
        minHeight: '100px',
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={adFormat.style}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default AdUnit;
