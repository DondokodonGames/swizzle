/**
 * Marketing Module
 * マーケティング自動化システムのエントリーポイント
 */

export { MarketingOrchestrator } from './MarketingOrchestrator';
export { SwizzleDiscordBot } from './discord/DiscordBot';
export { TwitterAutomation } from './twitter/TwitterAutomation';
export { TikTokAutomation } from './tiktok/TikTokAutomation';
export { InstagramAutomation } from './instagram/InstagramAutomation';
export { ContentGenerator } from './content/ContentGenerator';

// ゲームキャプチャ・ソーシャルシェアリング
export { GameCaptureService } from './capture/GameCaptureService';
export { GameSocialSharingService } from './social/GameSocialSharingService';
export { PostGenerationPublisher } from './social/PostGenerationPublisher';
export { GameGenerationHooks } from './social/GameGenerationHooks';

export * from './types';
