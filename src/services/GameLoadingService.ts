// src/services/GameLoadingService.ts
// ゲーム読込の単一窓口（WP33 §1 / 報告書 §A）。
//
// 同一の「公開ゲームの project_data を取得して GameProject 化する」操作が
// GameSequence / PlayGamePage 等に独立したインライン fetch + `as GameProject` 生キャストで
// 散在していた。本サービスに集約し、公開ゲート(is_published=true)と正規化を1箇所へ寄せる。
//
// 注: エディタ経由(ProjectStorageManager の IndexedDB+TTLキャッシュ)と AI生成書込
// (SupabaseUploader)は別キャッシュ/別責務のため本サービスには畳み込まない（報告書 §1 の
// 「最小統合」許容条件どおり、再生系の公開チェックと正規化の一元化を優先）。
import { supabase } from '../lib/supabase';
import type { GameProject } from '../types/editor/GameProject';

export interface PlayableGameMeta {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  /** 正規化済み（project_data が無ければ null） */
  project: GameProject | null;
}

export class GameLoadingService {
  /**
   * JSONB 由来の任意値(project_data: any)を GameProject へ正規化する唯一の窓口。
   * オブジェクト以外（null / 配列 / プリミティブ）は null を返す。
   * 挙動を変えないため追加のスキーマ検証は行わず、型の絞り込みのみを担う
   * （散在していた `as GameProject` 生キャストの集約が目的）。
   */
  static toGameProject(source: unknown): GameProject | null {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    return source as GameProject;
  }

  /**
   * 公開ゲームの project_data を取得して正規化する（再生用・軽量）。
   * 該当行なし / project_data 無しは null。クエリの reject は呼び出し側へ伝播させる
   * （従来のインライン fetch と同じ挙動）。
   */
  static async loadPublishedProject(gameId: string): Promise<GameProject | null> {
    const { data } = await supabase
      .from('user_games')
      .select('id, project_data')
      .eq('id', gameId)
      .eq('is_published', true)
      .single();
    return data?.project_data ? this.toGameProject(data.project_data) : null;
  }

  /**
   * 公開ゲームをメタ情報付きで取得する（単体プレイページ用）。
   * 行が無い / エラー時は null。project は正規化済み（project_data 無しは null）。
   */
  static async loadPublishedGameWithMeta(gameId: string): Promise<PlayableGameMeta | null> {
    const { data, error } = await supabase
      .from('user_games')
      .select('title, thumbnail_url, project_data')
      .eq('id', gameId)
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as { title: string; thumbnail_url: string | null; project_data: unknown };
    return {
      id: gameId,
      title: row.title,
      thumbnailUrl: row.thumbnail_url ?? null,
      project: this.toGameProject(row.project_data),
    };
  }
}
