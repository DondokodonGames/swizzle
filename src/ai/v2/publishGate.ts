/**
 * 公開ゲート判定
 *
 * QualityScorer の総合スコアが閾値（QUALITY_PUBLISH_THRESHOLD、既定70）以上なら
 * 自動公開、未満なら is_published=false + review_status='pending_review' で保存し
 * 管理者の審査（GameReviewQueue）に回す。
 */
export function shouldAutoPublish(score: number, threshold: number): boolean {
  return score >= threshold;
}
