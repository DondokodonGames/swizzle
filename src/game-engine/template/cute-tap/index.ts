import * as PIXI from 'pixi.js';
import { EditableAssets, EditableTemplateConfig } from '../EditableTemplate';
import { UnifiedGameSettings } from '../../GameTemplateFactory';
import { GameTemplate } from '../../GameTemplate';
import { CuteTapGame } from './CuteTapGame';
import configData from './config.json';

/**
 * CuteTap EditableTemplate統合エクスポート
 * 
 * フィードバック対応版:
 * - Tier A実装（すぐ改善可能）
 * - 完全アセット差し替え対応
 * - エディター準備完了
 */
export interface CuteTapTemplateExport {
  config: EditableTemplateConfig;
  implementation: typeof CuteTapGame;
  isImplemented: true;
  isExperimental: false;
  
  // EditableTemplate対応インスタンス生成
  createInstance(
    app: PIXI.Application, 
    settings: UnifiedGameSettings,
    customAssets?: Partial<EditableAssets>
  ): Promise<GameTemplate>;
  
  // エディター用メタデータ取得
  getEditableProperties(): any[];
  
  // アセット検証
  validateAssets(assets: Partial<EditableAssets>): { valid: boolean; errors: string[] };
}

const templateExport: CuteTapTemplateExport = {
  // 設定情報（config.jsonから読み込み）
  config: configData as EditableTemplateConfig,
  
  // 実装クラス
  implementation: CuteTapGame,
  
  // 実装状況
  isImplemented: true,
  isExperimental: false,
  
  // EditableTemplate対応インスタンス生成
  createInstance: async (
    app: PIXI.Application, 
    settings: UnifiedGameSettings,
    customAssets?: Partial<EditableAssets>
  ): Promise<GameTemplate> => {
    const config = configData as EditableTemplateConfig;
    
    console.log('CuteTap createInstance:', {
      hasCustomAssets: !!customAssets,
      customImageCount: customAssets?.images ? Object.keys(customAssets.images).length : 0,
      customSoundCount: customAssets?.sounds ? Object.keys(customAssets.sounds).length : 0
    });
    
    return new CuteTapGame(app, settings, config, customAssets);
  },
  
  // エディター用プロパティ情報取得
  getEditableProperties: () => {
    const config = configData as EditableTemplateConfig;
    return config.editable.properties.map(prop => ({
      ...prop,
      currentValue: getNestedValue(config.defaultAssets, prop.key)
    }));
  },
  
  // アセット検証（エディター用）
  validateAssets: (assets: Partial<EditableAssets>) => {
    const errors: string[] = [];
    const config = configData as EditableTemplateConfig;
    
    // 必須アセットチェック
    const requiredProps = config.editable.properties.filter(p => p.required);
    
    for (const prop of requiredProps) {
      const value = getNestedValue(assets, prop.key);
      
      if (!value) {
        errors.push(`必須項目 "${prop.label}" が設定されていません`);
        continue;
      }
      
      // 型別検証
      if (prop.type === 'image' && !isValidImageFile(value)) {
        errors.push(`"${prop.label}" は有効な画像ファイルではありません`);
      } else if (prop.type === 'sound' && !isValidAudioFile(value)) {
        errors.push(`"${prop.label}" は有効な音声ファイルではありません`);
      } else if (prop.type === 'text' && prop.constraints?.maxLength) {
        if (typeof value === 'string' && value.length > prop.constraints.maxLength) {
          errors.push(`"${prop.label}" は ${prop.constraints.maxLength} 文字以内で入力してください`);
        }
      } else if (prop.type === 'number' && prop.constraints) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`"${prop.label}" は数値で入力してください`);
        } else {
          if (prop.constraints.min !== undefined && numValue < prop.constraints.min) {
            errors.push(`"${prop.label}" は ${prop.constraints.min} 以上で入力してください`);
          }
          if (prop.constraints.max !== undefined && numValue > prop.constraints.max) {
            errors.push(`"${prop.label}" は ${prop.constraints.max} 以下で入力してください`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// ユーティリティ関数
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function isValidImageFile(url: string): boolean {
  if (!url) return false;
  
  // Data URL チェック
  if (url.startsWith('data:image/')) return true;
  
  // Blob URL チェック  
  if (url.startsWith('blob:')) return true;
  
  // 拡張子チェック
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
}

function isValidAudioFile(url: string): boolean {
  if (!url) return false;
  
  // Data URL チェック
  if (url.startsWith('data:audio/')) return true;
  
  // Blob URL チェック
  if (url.startsWith('blob:')) return true;
  
  // 拡張子チェック
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  return audioExtensions.some(ext => url.toLowerCase().endsWith(ext));
}

// デフォルトエクスポート（新システム）
export default templateExport;

// 名前付きエクスポート（後方互換性）
export { CuteTapGame };
export { configData as config };

// エディター統合確認用
export const EDITABLE_TEMPLATE_VERSION = '2.0.0';
export const SUPPORTED_EDITOR_FEATURES = [
  'asset_replacement',
  'parameter_adjustment', 
  'text_customization',
  'sound_integration',
  'preview_support'
] as const;