// 権利ルール（docs/specifications/IP_SAFETY_RULES.md）の機械チェック。
// 重点: (1) 明白な固有名詞を落とす (2) ジャンル/メカニクスは通す
//       (3) 一般語との衝突で誤検出しない (4) 許諾済みIP(CAPCOM/SNK)は違反にしない
import { describe, it, expect } from 'vitest';
import { checkIpSafety, filterIpSafeNetas } from '../IpSafetyChecker';

const wrap = (header: string) => `// test-game.js
// ${header}
(function(game) {
  game.onStart(function() {});
  game.end.success();
  game.end.failure();
})(game);`;

describe('checkIpSafety — 落とすべきもの', () => {
  it('任天堂IPの固有名詞を error で落とす', () => {
    const r = checkIpSafety(wrap('マリオみたいに土管から出てくる敵を踏む'));
    expect(r.ok).toBe(false);
    expect(r.violations[0].owner).toBe('任天堂');
  });

  it('「メイドインワリオ風」のような寄せた呼称を落とす', () => {
    const r = checkIpSafety(wrap('メイドインワリオ風のマイクロゲーム集'));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.term === 'ワリオ')).toBe(true);
  });

  it('リズム天国風の指示を落とす', () => {
    const r = checkIpSafety(wrap('リズム天国風のノリでタップ'));
    expect(r.ok).toBe(false);
  });

  it('ファイル名(slug)に入った固有名詞も検出する', () => {
    const r = checkIpSafety(wrap('普通のゲーム'), { filename: '801-pacman-chase.js' });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.term === 'パックマン')).toBe(true);
  });

  it('Simple2000 のブランド名は落とす', () => {
    const r = checkIpSafety(wrap('SIMPLE2000シリーズ THE ゾンビ'));
    expect(r.ok).toBe(false);
  });

  it('画面に描画される文字列リテラルも走査対象', () => {
    const code = `(function(game){ game.draw.text('POKEMON', 10, 10); })(game);`;
    expect(checkIpSafety(code).ok).toBe(false);
  });

  it('ハードウェア名は warning（内部呼称は可・公開名に使わない）', () => {
    const r = checkIpSafety(wrap('ファミコン風のドット絵'));
    expect(r.ok).toBe(true);
    expect(r.violations[0].severity).toBe('warning');
  });
});

describe('checkIpSafety — 通すべきもの', () => {
  it('ジャンル・メカニクスの記述は通す', () => {
    const r = checkIpSafety(wrap('マイクロゲーム集/落ち物パズル/ボードパーティ/固定砲台シューティング'));
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('Simple2000 的な題材（ゾンビ・電車・巨大生物）は通す', () => {
    const r = checkIpSafety(wrap('ゾンビの群れをかわして電車で逃げる。巨大生物が街を襲う'));
    expect(r.violations).toHaveLength(0);
  });

  it('一般語と衝突しない（マリオネット / 鉄拳制裁）', () => {
    expect(checkIpSafety(wrap('マリオネットの糸を切る')).violations).toHaveLength(0);
    expect(checkIpSafety(wrap('鉄拳制裁のタイミングを合わせる')).violations).toHaveLength(0);
  });

  it('「大乱闘」単体は一般語として通す', () => {
    expect(checkIpSafety(wrap('酒場の大乱闘をさばく')).violations).toHaveLength(0);
  });

  it('ドット様式・レトロ表現そのものは通す', () => {
    const r = checkIpSafety(wrap('8bitドット絵、CRTスキャンライン、チップチューン'));
    expect(r.violations).toHaveLength(0);
  });
});

describe('checkIpSafety — 許諾済みIP', () => {
  it('CAPCOM/SNK は違反にせず licensedHits に記録する', () => {
    const r = checkIpSafety(wrap('ストリートファイター風の対戦（許諾済み）'));
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(r.licensedHits[0].owner).toBe('CAPCOM');
  });

  it('メタルスラッグ（SNK）も同様', () => {
    const r = checkIpSafety(wrap('メタルスラッグ的な横スクロール'));
    expect(r.ok).toBe(true);
    expect(r.licensedHits[0].owner).toBe('SNK');
  });
});

describe('checkIpSafety — 出力の形', () => {
  it('同じ語の重複は1件に丸める', () => {
    const r = checkIpSafety(wrap('マリオ、マリオ、マリオ'));
    expect(r.violations.filter((v) => v.term === 'マリオ')).toHaveLength(1);
  });

  it('違反には行番号・抜粋・対処方針が付く', () => {
    const r = checkIpSafety(wrap('ゼルダのような探索'));
    const v = r.violations[0];
    expect(v.line).toBeGreaterThan(0);
    expect(v.excerpt.length).toBeGreaterThan(0);
    expect(v.note.length).toBeGreaterThan(0);
  });
});

describe('filterIpSafeNetas — ネタ段階のふるい', () => {
  const netas = [
    { id: 1, title: 'パックマン', idea: 'ゴーストが集まった瞬間にタップ' },
    { id: 2, title: '迷路の集合待ち', idea: '追跡者が一箇所に集まった瞬間にタップ' },
    { id: 3, title: 'ブロック落とし', idea: 'テトリスのように隙間なく積む' },
  ];

  it('固有名詞を含むネタを除外し、理由を返す', () => {
    const { safe, rejected } = filterIpSafeNetas(netas);
    expect(safe.map((n) => n.id)).toEqual([2]);
    expect(rejected.map((r) => r.id)).toEqual([1, 3]);
    expect(rejected[0].terms).toContain('パックマン');
  });

  it('idea 側だけに固有名詞がある場合も落とす', () => {
    const { rejected } = filterIpSafeNetas([{ id: 9, title: '積み上げ', idea: 'テトリス風に積む' }]);
    expect(rejected).toHaveLength(1);
  });

  it('idea 未指定でも落ちない（title のみで判定）', () => {
    const { safe } = filterIpSafeNetas([{ id: 10, title: '風船割り' }]);
    expect(safe).toHaveLength(1);
  });
});
