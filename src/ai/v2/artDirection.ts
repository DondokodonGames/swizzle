/**
 * artDirection — アートディレクションの単一定義源（art-direction.json）への型付きアクセサ
 *
 * AssetGenerator（生成側）と ImageQualityChecker（採点側）が同じ定義を参照することで、
 * 生成プロンプトとQA採点基準の様式が一致する（WP23）。
 * 様式そのものを変えるときは art-direction.json だけを編集する。
 */

import artDirectionJson from './art-direction.json';

export interface ArtPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
  line: string;
  forbidden: string[];
}

export interface ArtDirection {
  version: string;
  name: string;
  description: string;
  rendering: string;
  shapeLanguage: string;
  palettes: Record<string, ArtPalette>;
  background: { style: string; centerPolicy: string };
  promptFragments: { objectStyle: string; backgroundStyle: string; negative: string };
}

export const artDirection = artDirectionJson as ArtDirection;

/**
 * テーマ/ビジュアルスタイルから派生パレットを解決する。
 * 一致しなければ default パレットを返す（基調は常に定義ファイルが支配する）。
 */
export function resolvePalette(visualStyle?: string, theme?: string): ArtPalette {
  const palettes = artDirection.palettes;
  return (
    (visualStyle && palettes[visualStyle]) ||
    (theme && palettes[theme]) ||
    palettes.default
  );
}
