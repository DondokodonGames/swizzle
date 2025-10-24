// src/social/components/CommunityFeatures.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile } from '../types/SocialTypes';
import { LikeButton } from './LikeButton';
import { SimpleReactionSystem, ReactionStats } from './SimpleReactionSystem';

interface CommunityFeaturesProps {
  userId: string;
  className?: string;
}

interface Community {
  id: string;
  name: string;
  description: string;
  banner: string;
  avatar: string;
  memberCount: number;
  gameCount: number;
  category: string;
  tags: string[];
  rules: string[];
  isJoined: boolean;
  joinedAt?: string;
  role?: 'member' | 'moderator' | 'admin' | 'owner';
  isPrivate: boolean;
  createdAt: string;
  owner: UserProfile;
  moderators: UserProfile[];
  stats: CommunityStats;
  settings: CommunitySettings;
}

interface CommunityStats {
  totalMembers: number;
  activeMembers: number; // 30日以内に活動
  totalGames: number;
  totalLikes: number;
  totalShares: number;
  weeklyGrowth: number;
  engagementRate: number;
  averageRating: number;
}

interface CommunitySettings {
  allowGameSubmissions: boolean;
  requireApproval: boolean;
  allowDiscussions: boolean;
  allowEvents: boolean;
  visibilityLevel: 'public' | 'private' | 'invite_only';
  joinRequiresApproval: boolean;
  allowMemberInvites: boolean;
}

interface CommunityPost {
  id: string;
  type: 'game_share' | 'discussion' | 'event' | 'announcement' | 'poll' | 'showcase';
  title: string;
  content: string;
  author: UserProfile;
  communityId: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  attachments: PostAttachment[];
  reactions: ReactionStats;
  comments: CommunityComment[];
  gameId?: string; // game_shareタイプの場合
  eventData?: EventData; // eventタイプの場合
  pollData?: PollData; // pollタイプの場合
}

interface PostAttachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface CommunityComment {
  id: string;
  content: string;
  author: UserProfile;
  postId: string;
  parentId?: string;
  createdAt: string;
  reactions: ReactionStats;
  replies: CommunityComment[];
}

interface EventData {
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  currentParticipants: number;
  requirements: string[];
  prizes: string[];
}

interface PollData {
  options: PollOption[];
  allowMultiple: boolean;
  endDate?: string;
  totalVotes: number;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[]; // user IDs
}

interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  type: 'game_jam' | 'contest' | 'collaboration' | 'tournament';
  startDate: string;
  endDate: string;
  prizes: string[];
  rules: string[];
  participants: UserProfile[];
  submissions: ChallengeSubmission[];
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  communityId: string;
  organizer: UserProfile;
}

interface ChallengeSubmission {
  id: string;
  challengeId: string;
  participant: UserProfile;
  gameId: string;
  title: string;
  description: string;
  submittedAt: string;
  votes: number;
  rank?: number;
}

const COMMUNITY_TABS = [
  { id: 'feed', label: 'フィード', icon: '📰' },
  { id: 'games', label: 'ゲーム', icon: '🎮' },
  { id: 'events', label: 'イベント', icon: '📅' },
  { id: 'challenges', label: 'チャレンジ', icon: '🏆' },
  { id: 'members', label: 'メンバー', icon: '👥' },
  { id: 'about', label: '情報', icon: 'ℹ️' }
];

const POST_TYPES = [
  { id: 'discussion', label: '💬 ディスカッション', icon: '💬' },
  { id: 'game_share', label: '🎮 ゲーム共有', icon: '🎮' },
  { id: 'showcase', label: '✨ ショーケース', icon: '✨' },
  { id: 'event', label: '📅 イベント', icon: '📅' },
  { id: 'poll', label: '📊 投票', icon: '📊' }
];

const COMMUNITY_CATEGORIES = [
  { id: 'general', label: '一般', icon: '🌐' },
  { id: 'gamedev', label: 'ゲーム開発', icon: '💻' },
  { id: 'art', label: 'アート', icon: '🎨' },
  { id: 'music', label: '音楽', icon: '🎵' },
  { id: 'education', label: '教育', icon: '📚' },
  { id: 'showcase', label: 'ショーケース', icon: '✨' }
];

export const CommunityFeatures: React.FC<CommunityFeaturesProps> = ({
  userId,
  className = ''
}) => {
  // 状態管理
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [newPostType, setNewPostType] = useState<string>('discussion');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // モックコミュニティ生成
  const generateMockCommunities = useCallback((): Community[] => {
    return Array.from({ length: 12 }, (_, i) => {
      const category = COMMUNITY_CATEGORIES[Math.floor(Math.random() * COMMUNITY_CATEGORIES.length)];
      const memberCount = Math.floor(Math.random() * 5000) + 100;
      
      return {
        id: `community_${i}`,
        name: `${category.label}コミュニティ ${i + 1}`,
        description: `${category.label}に関する情報共有やコラボレーションを行うコミュニティです。初心者から上級者まで歓迎！`,
        banner: `https://picsum.photos/800/200?random=${i + 600}`,
        avatar: `https://picsum.photos/100/100?random=${i + 700}`,
        memberCount,
        gameCount: Math.floor(Math.random() * 200) + 20,
        category: category.id,
        tags: ['初心者歓迎', 'コラボ', '情報共有'].slice(0, Math.floor(Math.random() * 3) + 1),
        rules: [
          '他のメンバーを尊重してください',
          'スパムや宣伝は禁止です',
          '建設的なフィードバックを心がけてください'
        ],
        isJoined: Math.random() > 0.6,
        role: Math.random() > 0.8 ? 'moderator' : 'member',
        isPrivate: Math.random() > 0.8,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        owner: {
          id: `owner_${i}`,
          username: `owner${i}`,
          displayName: `オーナー${i}`,
          avatar: `https://picsum.photos/40/40?random=${i + 800}`,
          banner: '',
          bio: '',
          location: '',
          website: '',
          stats: {
            totalGames: 0,
            totalPlays: 0,
            totalLikes: 0,
            totalFollowers: 0,
            totalFollowing: 0,
            joinDate: '',
            lastActive: ''
          }
        },
        moderators: [],
        stats: {
          totalMembers: memberCount,
          activeMembers: Math.floor(memberCount * 0.3),
          totalGames: Math.floor(Math.random() * 200) + 20,
          totalLikes: Math.floor(Math.random() * 10000) + 1000,
          totalShares: Math.floor(Math.random() * 1000) + 100,
          weeklyGrowth: Math.round((Math.random() * 20 - 5) * 100) / 100,
          engagementRate: Math.round((Math.random() * 15 + 5) * 100) / 100,
          averageRating: Math.round((Math.random() * 2 + 3) * 100) / 100
        },
        settings: {
          allowGameSubmissions: true,
          requireApproval: Math.random() > 0.7,
          allowDiscussions: true,
          allowEvents: true,
          visibilityLevel: Math.random() > 0.8 ? 'private' : 'public',
          joinRequiresApproval: Math.random() > 0.6,
          allowMemberInvites: true
        }
      };
    });
  }, []);

  // モック投稿生成
  const generateMockPosts = useCallback((communityId: string): CommunityPost[] => {
    return Array.from({ length: 15 }, (_, i) => {
      const type = POST_TYPES[Math.floor(Math.random() * POST_TYPES.length)].id as CommunityPost['type'];
      const author: UserProfile = {
        id: `user_${i}`,
        username: `user${i}`,
        displayName: `メンバー${i + 1}`,
        avatar: `https://picsum.photos/40/40?random=${i + 900}`,
        banner: '',
        bio: '',
        location: '',
        website: '',
        stats: {
          totalGames: 0,
          totalPlays: 0,
          totalLikes: 0,
          totalFollowers: 0,
          totalFollowing: 0,
          joinDate: '',
          lastActive: ''
        }
      };

      let title = '';
      let content = '';
      let eventData: EventData | undefined;
      let pollData: PollData | undefined;

      switch (type) {
        case 'discussion':
          title = `ディスカッション: ${['ゲーム制作のコツ', '新しいアイデア募集', '技術的な質問', 'コラボレーション相手募集'][Math.floor(Math.random() * 4)]}`;
          content = 'みなさんの意見をお聞かせください。経験談や具体的なアドバイスを共有していただけると嬉しいです。';
          break;
        case 'game_share':
          title = `新作ゲーム: アクションゲーム ${i + 1}`;
          content = '新しいゲームを公開しました！フィードバックをお待ちしています。';
          break;
        case 'event':
          title = `ゲームジャム開催: 48時間チャレンジ`;
          content = 'みんなでゲームジャムに参加しませんか？テーマは当日発表です。';
          eventData = {
            startDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000 + 48 * 60 * 60 * 1000).toISOString(),
            maxParticipants: 50,
            currentParticipants: Math.floor(Math.random() * 30) + 5,
            requirements: ['ゲーム制作経験不問', 'チーム参加OK'],
            prizes: ['優勝賞金5万円', 'スポンサー賞品']
          };
          break;
        case 'poll':
          title = '次のチャレンジテーマを決めよう！';
          content = 'コミュニティの次のチャレンジテーマを投票で決めましょう。';
          pollData = {
            options: [
              { id: 'option1', text: 'レトロゲーム', votes: Math.floor(Math.random() * 20) + 5, voters: [] },
              { id: 'option2', text: 'パズルゲーム', votes: Math.floor(Math.random() * 25) + 8, voters: [] },
              { id: 'option3', text: 'アクションゲーム', votes: Math.floor(Math.random() * 15) + 3, voters: [] }
            ],
            allowMultiple: false,
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            totalVotes: 0
          };
          if (pollData) {
            pollData.totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
          }
          break;
        default:
          title = `投稿 ${i + 1}`;
          content = 'コミュニティへの投稿です。';
      }

      return {
        id: `post_${i}`,
        type,
        title,
        content,
        author,
        communityId,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: Math.random() > 0.9,
        isLocked: false,
        tags: ['質問', 'ヘルプ', '情報共有'].slice(0, Math.floor(Math.random() * 2) + 1),
        attachments: [],
        reactions: {
          fun: { count: Math.floor(Math.random() * 20) + 5, userReacted: false },
          amazing: { count: Math.floor(Math.random() * 15) + 2, userReacted: false },
          completed: { count: Math.floor(Math.random() * 10) + 1, userReacted: false }
        },
        comments: [],
        gameId: type === 'game_share' ? `game_${i}` : undefined,
        eventData,
        pollData
      };
    });
  }, []);

  // モックチャレンジ生成
  const generateMockChallenges = useCallback((): CommunityChallenge[] => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `challenge_${i}`,
      title: `${['ゲームジャム', 'コンテスト', 'コラボ企画', 'トーナメント'][Math.floor(Math.random() * 4)]} #${i + 1}`,
      description: '素晴らしいゲームを作って、コミュニティと共有しましょう！',
      type: ['game_jam', 'contest', 'collaboration', 'tournament'][Math.floor(Math.random() * 4)] as CommunityChallenge['type'],
      startDate: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      prizes: ['1位: 10万円', '2位: 5万円', '3位: 2万円'],
      rules: ['オリジナル作品であること', '制作期間内に完成させること'],
      participants: [],
      submissions: [],
      status: ['upcoming', 'active', 'voting'][Math.floor(Math.random() * 3)] as CommunityChallenge['status'],
      communityId: 'community_0',
      organizer: {
        id: 'organizer_1',
        username: 'organizer',
        displayName: '主催者',
        avatar: 'https://picsum.photos/40/40?random=1000',
        banner: '',
        bio: '',
        location: '',
        website: '',
        stats: {
          totalGames: 0,
          totalPlays: 0,
          totalLikes: 0,
          totalFollowers: 0,
          totalFollowing: 0,
          joinDate: '',
          lastActive: ''
        }
      }
    }));
  }, []);

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const mockCommunities = generateMockCommunities();
      setCommunities(mockCommunities);
      
      if (!selectedCommunity && mockCommunities.length > 0) {
        setSelectedCommunity(mockCommunities[0]);
      }
      
      if (selectedCommunity) {
        const mockPosts = generateMockPosts(selectedCommunity.id);
        setPosts(mockPosts);
      }
      
      const mockChallenges = generateMockChallenges();
      setChallenges(mockChallenges);

    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  }, [generateMockCommunities, generateMockPosts, generateMockChallenges, selectedCommunity]);

  // 初期読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // コミュニティ参加/脱退
  const handleJoinCommunity = useCallback(async (communityId: string) => {
    try {
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { 
              ...community, 
              isJoined: !community.isJoined,
              memberCount: community.isJoined ? community.memberCount - 1 : community.memberCount + 1
            }
          : community
      ));

      if (selectedCommunity?.id === communityId) {
        setSelectedCommunity(prev => prev ? {
          ...prev,
          isJoined: !prev.isJoined,
          memberCount: prev.isJoined ? prev.memberCount - 1 : prev.memberCount + 1
        } : null);
      }

    } catch (error) {
      console.error('Join community error:', error);
    }
  }, [selectedCommunity]);

  // 投稿作成
  const handleCreatePost = useCallback(async (postData: Partial<CommunityPost>) => {
    if (!selectedCommunity) return;

    try {
      const newPost: CommunityPost = {
        id: `post_${Date.now()}`,
        type: newPostType as CommunityPost['type'],
        title: postData.title || '',
        content: postData.content || '',
        author: {
          id: userId,
          username: 'current_user',
          displayName: 'あなた',
          avatar: 'https://picsum.photos/40/40?random=current',
          banner: '',
          bio: '',
          location: '',
          website: '',
          stats: {
            totalGames: 0,
            totalPlays: 0,
            totalLikes: 0,
            totalFollowers: 0,
            totalFollowing: 0,
            joinDate: '',
            lastActive: ''
          }
        },
        communityId: selectedCommunity.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: false,
        isLocked: false,
        tags: [],
        attachments: [],
        reactions: {
          fun: { count: 0, userReacted: false },
          amazing: { count: 0, userReacted: false },
          completed: { count: 0, userReacted: false }
        },
        comments: []
      };

      setPosts(prev => [newPost, ...prev]);
      setShowCreatePost(false);

    } catch (error) {
      console.error('Create post error:', error);
    }
  }, [selectedCommunity, newPostType, userId]);

  // フィルタリング済みコミュニティ
  const filteredCommunities = useMemo(() => {
    let filtered = communities;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(community => community.category === filterCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(community => 
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return b.memberCount - a.memberCount;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'games':
          return b.gameCount - a.gameCount;
        case 'popular':
        default:
          return b.stats.engagementRate - a.stats.engagementRate;
      }
    });
  }, [communities, filterCategory, searchQuery, sortBy]);

  // 投稿レンダー
  const renderPost = useCallback((post: CommunityPost) => {
    return (
      <ModernCard key={post.id} className="p-4 hover:shadow-md transition-shadow">
        {post.isPinned && (
          <div className="flex items-center gap-2 mb-2 text-sm text-blue-600">
            <span>📌</span>
            <span>ピン留め投稿</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <img 
            src={post.author.avatar} 
            alt={post.author.displayName}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{post.author.displayName}</span>
              <span className="text-sm text-gray-500">@{post.author.username}</span>
              <span className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleString('ja-JP')}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {POST_TYPES.find(t => t.id === post.type)?.label || post.type}
              </span>
            </div>

            <h3 className="font-semibold text-gray-800 mb-2">{post.title}</h3>
            <p className="text-gray-700 mb-3">{post.content}</p>

            {/* イベントデータ */}
            {post.eventData && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span>📅</span>
                  <span className="font-medium">
                    {new Date(post.eventData.startDate).toLocaleDateString('ja-JP')} - 
                    {new Date(post.eventData.endDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>参加者: {post.eventData.currentParticipants}/{post.eventData.maxParticipants}人</p>
                  {post.eventData.prizes.length > 0 && (
                    <p>賞品: {post.eventData.prizes.join(', ')}</p>
                  )}
                </div>
                <ModernButton className="text-sm bg-blue-500 text-white mt-2">
                  参加する
                </ModernButton>
              </div>
            )}

            {/* 投票データ */}
            {post.pollData && (
              <div className="bg-green-50 rounded-lg p-3 mb-3">
                <div className="space-y-2">
                  {post.pollData.options.map(option => {
                    const percentage = post.pollData!.totalVotes > 0 
                      ? (option.votes / post.pollData!.totalVotes) * 100 
                      : 0;
                    
                    return (
                      <div key={option.id} className="cursor-pointer hover:bg-green-100 p-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{option.text}</span>
                          <span className="text-sm text-gray-600">{option.votes}票</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  総投票数: {post.pollData.totalVotes}票
                  {post.pollData.endDate && (
                    <span> | 終了: {new Date(post.pollData.endDate).toLocaleDateString('ja-JP')}</span>
                  )}
                </div>
              </div>
            )}

            {/* タグ */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* アクション */}
            <div className="flex items-center justify-between">
              <SimpleReactionSystem
                gameId={post.id}
                initialStats={post.reactions}
                compact={true}
                showCounts={true}
                animated={true}
              />
              
              <div className="flex gap-2">
                <ModernButton className="text-sm bg-gray-100 text-gray-700">
                  💬 コメント ({post.comments.length})
                </ModernButton>
                <ModernButton className="text-sm bg-gray-100 text-gray-700">
                  📤 シェア
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      </ModernCard>
    );
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">コミュニティを読み込んでいます...</span>
      </div>
    );
  }

  return (
    <div className={`community-features ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* サイドバー: コミュニティ一覧 */}
        <div className="lg:col-span-1">
          <ModernCard className="p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">コミュニティ</h3>
              <ModernButton
                onClick={() => setShowCreateCommunity(true)}
                className="text-sm bg-blue-500 text-white"
              >
                + 作成
              </ModernButton>
            </div>

            {/* 検索・フィルター */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="all">全カテゴリ</option>
                {COMMUNITY_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="popular">人気順</option>
                <option value="members">メンバー数</option>
                <option value="newest">新着順</option>
                <option value="games">ゲーム数</option>
              </select>
            </div>

            {/* コミュニティリスト */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCommunities.map(community => (
                <div
                  key={community.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCommunity?.id === community.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCommunity(community)}
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={community.avatar} 
                      alt={community.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{community.name}</h4>
                      <p className="text-xs text-gray-500">{community.memberCount.toLocaleString()}人</p>
                    </div>
                    {community.isJoined && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        参加中
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>
        </div>

        {/* メインコンテンツ */}
        <div className="lg:col-span-3">
          {selectedCommunity ? (
            <div>
              {/* コミュニティヘッダー */}
              <ModernCard className="mb-6 overflow-hidden">
                <div className="relative">
                  <img 
                    src={selectedCommunity.banner} 
                    alt={selectedCommunity.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                
                <div className="p-4 -mt-8 relative">
                  <div className="flex items-end gap-4">
                    <img 
                      src={selectedCommunity.avatar} 
                      alt={selectedCommunity.name}
                      className="w-16 h-16 rounded-full border-4 border-white"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-xl font-bold text-gray-800">{selectedCommunity.name}</h1>
                          <p className="text-gray-600">{selectedCommunity.description}</p>
                        </div>
                        <ModernButton
                          onClick={() => handleJoinCommunity(selectedCommunity.id)}
                          className={`${
                            selectedCommunity.isJoined
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {selectedCommunity.isJoined ? '✓ 参加中' : '+ 参加する'}
                        </ModernButton>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>👥 {selectedCommunity.memberCount.toLocaleString()}人</span>
                        <span>🎮 {selectedCommunity.gameCount}ゲーム</span>
                        <span>⭐ {selectedCommunity.stats.averageRating.toFixed(1)}</span>
                        {selectedCommunity.isPrivate && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                            🔒 プライベート
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ModernCard>

              {/* タブナビゲーション */}
              <div className="flex flex-wrap gap-2 mb-6">
                {COMMUNITY_TABS.map((tab) => (
                  <ModernButton
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-sm ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </ModernButton>
                ))}
              </div>

              {/* フィード */}
              {activeTab === 'feed' && (
                <div className="space-y-4">
                  {selectedCommunity.isJoined && (
                    <ModernCard className="p-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <ModernButton
                            onClick={() => setShowCreatePost(true)}
                            className="w-full text-left bg-gray-100 hover:bg-gray-200 text-gray-600"
                          >
                            💭 コミュニティに投稿する...
                          </ModernButton>
                        </div>
                      </div>
                    </ModernCard>
                  )}

                  {posts.map(renderPost)}
                </div>
              )}

              {/* チャレンジ */}
              {activeTab === 'challenges' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {challenges.map(challenge => (
                    <ModernCard key={challenge.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="font-semibold">{challenge.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          challenge.status === 'active' ? 'bg-green-100 text-green-700' :
                          challenge.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {challenge.status === 'active' ? '開催中' :
                           challenge.status === 'upcoming' ? '開催予定' : '終了'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                      <div className="text-xs text-gray-500 mb-3">
                        期間: {new Date(challenge.startDate).toLocaleDateString('ja-JP')} - 
                        {new Date(challenge.endDate).toLocaleDateString('ja-JP')}
                      </div>
                      {challenge.prizes.length > 0 && (
                        <div className="text-sm mb-3">
                          <strong>賞品:</strong>
                          <ul className="list-disc list-inside text-gray-600">
                            {challenge.prizes.map((prize, index) => (
                              <li key={index}>{prize}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ModernButton className="w-full bg-blue-500 text-white">
                        参加する
                      </ModernButton>
                    </ModernCard>
                  ))}
                </div>
              )}

              {/* その他のタブは簡易実装 */}
              {!['feed', 'challenges'].includes(activeTab) && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">開発中</h3>
                  <p className="text-gray-500">この機能は近日公開予定です</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">コミュニティを選択してください</h3>
              <p className="text-gray-500">左側からコミュニティを選んで参加しましょう</p>
            </div>
          )}
        </div>
      </div>

      {/* 投稿作成モーダル */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">投稿を作成</h3>
              <ModernButton
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </ModernButton>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">投稿タイプ</label>
                <div className="flex flex-wrap gap-2">
                  {POST_TYPES.map(type => (
                    <ModernButton
                      key={type.id}
                      onClick={() => setNewPostType(type.id)}
                      className={`text-sm ${
                        newPostType === type.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {type.label}
                    </ModernButton>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="投稿のタイトルを入力..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="投稿の内容を入力..."
                />
              </div>

              <div className="flex gap-2">
                <ModernButton
                  onClick={() => handleCreatePost({ title: '新しい投稿', content: 'サンプル投稿です' })}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  投稿する
                </ModernButton>
                <ModernButton
                  onClick={() => setShowCreatePost(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  キャンセル
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};