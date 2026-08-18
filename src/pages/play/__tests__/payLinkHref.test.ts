// 売上の拠点帰属は「Payment Link に client_reference_id を載せる」1点に依存する。
// ここを外すと課金は成立するのに拠点別売上だけが取れなくなるので、組み立てを固定する。
import { describe, it, expect } from 'vitest';
import { buildPayLinkHref } from '../payLinkHref';

describe('buildPayLinkHref', () => {
  it('拠点コンテキストが無ければURLを変えない', () => {
    expect(buildPayLinkHref('https://buy.stripe.com/abc', null)).toBe('https://buy.stripe.com/abc');
  });

  it('クエリの無いURLには ? で付ける', () => {
    expect(buildPayLinkHref('https://buy.stripe.com/abc', 'spot_a1')).toBe(
      'https://buy.stripe.com/abc?client_reference_id=spot_a1'
    );
  });

  it('既存クエリがあるURLには & で付ける', () => {
    expect(buildPayLinkHref('https://buy.stripe.com/abc?locale=ja', 'spot_a1')).toBe(
      'https://buy.stripe.com/abc?locale=ja&client_reference_id=spot_a1'
    );
  });

  it('spot_id をURLエンコードする', () => {
    expect(buildPayLinkHref('https://buy.stripe.com/abc', 'spot a/1')).toContain(
      'client_reference_id=spot%20a%2F1'
    );
  });
});
