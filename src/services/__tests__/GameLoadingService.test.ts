// src/services/__tests__/GameLoadingService.test.ts
// キャラクタライゼーション/スモークテスト（WP33 §1/§8）:
// 読込窓口の正規化と公開ゲーム取得の挙動を固定する。
import { describe, it, expect, vi, beforeEach } from 'vitest';

// supabase クエリビルダをチェーン可能なモックに差し替え、最終 resolve 値を制御する
const mockState = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));

vi.mock('../../lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.single = () => Promise.resolve(mockState.result);
  builder.maybeSingle = () => Promise.resolve(mockState.result);
  return { supabase: { from: () => builder } };
});

import { GameLoadingService } from '../GameLoadingService';

describe('GameLoadingService.toGameProject', () => {
  it('オブジェクトは同一参照を GameProject として返す', () => {
    const obj = { id: 'g1', script: { rules: [] } };
    expect(GameLoadingService.toGameProject(obj)).toBe(obj);
  });

  it('null / 配列 / プリミティブ / undefined は null', () => {
    expect(GameLoadingService.toGameProject(null)).toBeNull();
    expect(GameLoadingService.toGameProject([])).toBeNull();
    expect(GameLoadingService.toGameProject('x')).toBeNull();
    expect(GameLoadingService.toGameProject(42)).toBeNull();
    expect(GameLoadingService.toGameProject(undefined)).toBeNull();
  });
});

describe('GameLoadingService.loadPublishedProject', () => {
  beforeEach(() => { mockState.result = { data: null, error: null }; });

  it('project_data があれば正規化して返す', async () => {
    const project = { id: 'g1', script: { rules: [] } };
    mockState.result = { data: { id: 'g1', project_data: project }, error: null };
    expect(await GameLoadingService.loadPublishedProject('g1')).toBe(project);
  });

  it('行が無ければ null', async () => {
    mockState.result = { data: null, error: null };
    expect(await GameLoadingService.loadPublishedProject('missing')).toBeNull();
  });

  it('project_data が空なら null', async () => {
    mockState.result = { data: { id: 'g1', project_data: null }, error: null };
    expect(await GameLoadingService.loadPublishedProject('g1')).toBeNull();
  });
});

describe('GameLoadingService.loadPublishedGameWithMeta', () => {
  beforeEach(() => { mockState.result = { data: null, error: null }; });

  it('メタ情報と正規化済み project を返す', async () => {
    const project = { id: 'g1' };
    mockState.result = { data: { title: 'タイトル', thumbnail_url: 'u', project_data: project }, error: null };
    expect(await GameLoadingService.loadPublishedGameWithMeta('g1')).toEqual({
      id: 'g1', title: 'タイトル', thumbnailUrl: 'u', project,
    });
  });

  it('thumbnail_url が無ければ null 埋め', async () => {
    mockState.result = { data: { title: 'T', thumbnail_url: null, project_data: { id: 'g1' } }, error: null };
    const r = await GameLoadingService.loadPublishedGameWithMeta('g1');
    expect(r?.thumbnailUrl).toBeNull();
  });

  it('エラー時は null', async () => {
    mockState.result = { data: null, error: { message: 'boom' } };
    expect(await GameLoadingService.loadPublishedGameWithMeta('g1')).toBeNull();
  });
});
