// Payment Link への拠点(spot)付与。
// Stripe は client_reference_id をそのまま webhook の session に返すため、
// 「どの設置台で発生した売上か」をサーバー側の purchase イベントに残せる。
// UI から切り出してあるのは、この1行の組み立てミス(? と & の取り違え等)が
// 売上の取りこぼしに直結するため単体テストで固定したいから。

export function buildPayLinkHref(url: string, spotId: string | null): string {
  if (!spotId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}client_reference_id=${encodeURIComponent(spotId)}`;
}
