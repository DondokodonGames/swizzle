// src/components/ui/ThemeSelector.tsx
// テーマ選択UIコンポーネント - 既存GameThemeProviderとの統合版

import React, { useState } from 'react';
import { useGameTheme } from './GameThemeProvider';
import { ThemeType } from '../../types/themeTypes';

interface ThemeConfig {
  type: ThemeType;
  name: string;
  description: string;
  preview: string;
  color: string;
  features: string[];
}

interface ThemeSelectorProps {
  showPreview?: boolean;
  showDescriptions?: boolean;
  onThemeChange?: (theme: ThemeType) => void;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  showPreview = true,
  showDescriptions = true,
  onThemeChange,
  className = ''
}) => {
  // 既存GameThemeProviderから現在のテーマとセッター取得
  const { theme: currentTheme, setTheme } = useGameTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const themes: ThemeConfig[] = [
    {
      type: 'arcade',
      name: 'アーケード',
      description: 'ゲームセンター風の迫力あるUI',
      preview: '🎮',
      color: '#8b5cf6',
      features: ['ネオン効果', 'グラデーション', '迫力アニメーション']
    },
    {
      type: 'retro',
      name: 'レトロ',
      description: 'ピクセル時代の懐かしい雰囲気',
      preview: '👾',
      color: '#10b981',
      features: ['ピクセルフォント', 'スキャンライン', 'CRT効果']
    },
    {
      type: 'neon',
      name: 'ネオン',
      description: 'サイバーパンク風の未来感',
      preview: '🌃',
      color: '#06b6d4',
      features: ['グロー効果', 'サイバーグリッド', '発光アニメーション']
    },
    {
      type: 'cute',
      name: 'かわいい',
      description: 'パステルカラーのやわらかUI',
      preview: '🌸',
      color: '#f472b6',
      features: ['パステルカラー', '丸み仕上げ', 'ハート装飾']
    },
    {
      type: 'minimal',
      name: 'ミニマル',
      description: 'シンプルで洗練されたデザイン',
      preview: '⚪',
      color: '#6b7280',
      features: ['クリーンデザイン', '機能美', '高い可読性']
    },
    {
      type: 'dark',
      name: 'ダーク',
      description: '目に優しいダークモード',
      preview: '🌙',
      color: '#374151',
      features: ['目に優しい', '高コントラスト', 'アクセシビリティ']
    }
  ];

  const handleThemeChange = async (newTheme: ThemeType) => {
    if (newTheme === currentTheme || isTransitioning) return;

    setIsTransitioning(true);
    
    // テーマ変更アニメーション
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 既存GameThemeProviderのsetThemeを使用
    setTheme(newTheme);
    onThemeChange?.(newTheme);
    
    // アニメーション完了
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className={`theme-selector ${className}`}>
      <div className="theme-selector-header">
        <h3 className="theme-selector-title">
          テーマを選択 ✨
        </h3>
        <p className="theme-selector-subtitle">
          ゲーム体験を自分好みにカスタマイズ
        </p>
      </div>

      <div className="theme-grid">
        {themes.map(theme => (
          <button
            key={theme.type}
            onClick={() => handleThemeChange(theme.type)}
            disabled={isTransitioning}
            className={`theme-button ${
              currentTheme === theme.type ? 'active' : ''
            } ${isTransitioning ? 'transitioning' : ''}`}
            data-theme-preview={theme.type}
            style={{ 
              '--theme-color': theme.color,
              '--theme-preview-color': theme.color 
            } as React.CSSProperties}
            aria-label={`${theme.name}テーマに変更`}
          >
            {/* テーマプレビュー */}
            {showPreview && (
              <div className="theme-preview">
                <span className="theme-emoji" role="img" aria-label={theme.name}>
                  {theme.preview}
                </span>
                <div 
                  className="theme-color-circle"
                  style={{ backgroundColor: theme.color }}
                  aria-hidden="true"
                />
              </div>
            )}
            
            {/* テーマ情報 */}
            <div className="theme-info">
              <h4 className="theme-name">{theme.name}</h4>
              {showDescriptions && (
                <p className="theme-description">{theme.description}</p>
              )}
              
              {/* テーマ特徴 */}
              {showDescriptions && (
                <div className="theme-features">
                  {theme.features.map((feature, index) => (
                    <span key={index} className="theme-feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* 選択中インディケーター */}
            {currentTheme === theme.type && (
              <div className="theme-active-indicator">
                <span className="active-icon">✨</span>
                <span className="active-text">選択中</span>
              </div>
            )}

            {/* ホバー効果 */}
            <div className="theme-hover-effect" aria-hidden="true" />
          </button>
        ))}
      </div>
      
      {/* フッター情報 */}
      <div className="theme-selector-footer">
        <div className="theme-tip">
          <span className="tip-icon">💡</span>
          <span className="tip-text">
            テーマはいつでも変更できます。ゲーム作成後も適用されます。
          </span>
        </div>
        
        {/* 現在のテーマ情報 */}
        <div className="current-theme-info">
          <span className="current-label">現在のテーマ:</span>
          <span className="current-theme">
            {themes.find(t => t.type === currentTheme)?.name || 'アーケード'} 
            {themes.find(t => t.type === currentTheme)?.preview}
          </span>
        </div>
      </div>
    </div>
  );
};

// ThemeSelector専用スタイル
const themeSelectorStyles = `
.theme-selector {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: var(--font-family, system-ui);
}

.theme-selector-header {
  text-align: center;
  margin-bottom: 24px;
}

.theme-selector-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--color-text, #333);
}

.theme-selector-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #666);
  margin: 0;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.theme-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--color-surface, #fff);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  min-height: 180px;
  overflow: hidden;
}

.theme-button:hover:not(.active):not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--theme-color);
}

.theme-button.active {
  border-color: var(--theme-color);
  background: rgba(var(--theme-color-rgb, 139, 92, 246), 0.05);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb, 139, 92, 246), 0.1);
}

.theme-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.theme-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.theme-emoji {
  font-size: 2rem;
  display: block;
}

.theme-color-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.theme-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: var(--color-text, #333);
}

.theme-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #666);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.theme-features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.theme-feature-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: rgba(var(--theme-color-rgb, 139, 92, 246), 0.1);
  color: var(--theme-color);
  border-radius: 8px;
  border: 1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.2);
}

.theme-active-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--theme-color);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.theme-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, var(--theme-color) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.theme-button:hover .theme-hover-effect:not(.active) {
  opacity: 0.05;
}

.theme-selector-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #e5e7eb);
  font-size: 0.85rem;
}

.theme-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary, #666);
}

.current-theme-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-label {
  color: var(--color-text-secondary, #666);
}

.current-theme {
  font-weight: 600;
  color: var(--color-text, #333);
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .theme-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  
  .theme-button {
    min-height: 160px;
    padding: 16px;
  }
  
  .theme-selector-footer {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
  
  .theme-button {
    min-height: 140px;
  }
}
`;

// スタイルを動的に追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = themeSelectorStyles;
  if (!document.head.querySelector('style[data-theme-selector]')) {
    styleElement.setAttribute('data-theme-selector', 'true');
    document.head.appendChild(styleElement);
  }
}

export default ThemeSelector;