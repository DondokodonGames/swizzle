// src/social/components/AdvancedModeration.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile } from '../types/SocialTypes';

interface AdvancedModerationProps {
  userId: string;
  className?: string;
  permissions?: ModerationPermissions;
}

interface ModerationPermissions {
  canReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canBan: boolean;
  canEditRules: boolean;
  canViewReports: boolean;
  canManageComments: boolean;
}

interface ModerationItem {
  id: string;
  type: 'game' | 'comment' | 'user' | 'report';
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'auto_flagged';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content: GameContent | CommentContent | UserContent | ReportContent;
  flags: ModerationFlag[];
  aiScore: number; // 0-100, AIによる問題度スコア
  reportCount: number;
  reportReasons: string[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceInfo?: string;
  };
}

interface GameContent {
  gameId: string;
  title: string;
  description: string;
  thumbnail: string;
  author: UserProfile;
  category: string;
  tags: string[];
  createdAt: string;
}

interface CommentContent {
  commentId: string;
  text: string;
  author: UserProfile;
  gameId: string;
  parentId?: string;
  createdAt: string;
}

interface UserContent {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  joinedAt: string;
  activityLevel: number;
  violationHistory: ViolationRecord[];
}

interface ReportContent {
  reportId: string;
  targetType: 'game' | 'comment' | 'user';
  targetId: string;
  reporterUserId: string;
  reason: string;
  description: string;
  evidence: string[];
  createdAt: string;
}

interface ModerationFlag {
  id: string;
  type: 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'violence' | 'hate_speech' | 'misinformation' | 'adult_content';
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  source: 'ai' | 'user_report' | 'keyword' | 'image_analysis' | 'behavior_analysis';
  description: string;
  detectedAt: string;
}

interface ViolationRecord {
  id: string;
  type: string;
  severity: string;
  action: string;
  date: string;
  moderator: string;
}

interface ModerationStats {
  pendingReviews: number;
  reviewedToday: number;
  totalReports: number;
  autoFlagged: number;
  accuracyRate: number;
  averageReviewTime: number;
  escalatedCases: number;
}

interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  statistics: {
    triggered: number;
    accuracy: number;
  };
}

interface RuleCondition {
  type: 'keyword' | 'ai_score' | 'report_count' | 'user_history' | 'content_type';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'matches';
  value: string | number;
  weight: number;
}

interface RuleAction {
  type: 'flag' | 'auto_reject' | 'escalate' | 'notify_admin' | 'temporary_ban' | 'permanent_ban';
  parameters: Record<string, any>;
}

const MODERATION_TABS = [
  { id: 'queue', label: '審査待ち', icon: '📋', color: 'text-blue-600' },
  { id: 'flagged', label: 'フラグ済み', icon: '🚩', color: 'text-red-600' },
  { id: 'reports', label: '報告', icon: '📢', color: 'text-orange-600' },
  { id: 'users', label: 'ユーザー', icon: '👤', color: 'text-purple-600' },
  { id: 'rules', label: 'ルール', icon: '⚖️', color: 'text-green-600' },
  { id: 'analytics', label: '分析', icon: '📊', color: 'text-indigo-600' }
];

const PRIORITY_LEVELS = [
  { id: 'critical', label: '緊急', color: 'bg-red-500 text-white', icon: '🚨' },
  { id: 'high', label: '高', color: 'bg-orange-500 text-white', icon: '⚠️' },
  { id: 'medium', label: '中', color: 'bg-yellow-500 text-white', icon: '⚡' },
  { id: 'low', label: '低', color: 'bg-green-500 text-white', icon: '✅' }
];

const FLAG_TYPES = [
  { id: 'spam', label: 'スパム', icon: '🗑️', color: 'text-red-600' },
  { id: 'inappropriate', label: '不適切', icon: '⚠️', color: 'text-orange-600' },
  { id: 'copyright', label: '著作権', icon: '©️', color: 'text-purple-600' },
  { id: 'harassment', label: 'ハラスメント', icon: '🚫', color: 'text-red-600' },
  { id: 'violence', label: '暴力的', icon: '⚔️', color: 'text-red-700' },
  { id: 'hate_speech', label: 'ヘイト', icon: '💢', color: 'text-red-800' },
  { id: 'misinformation', label: '偽情報', icon: '❌', color: 'text-orange-700' },
  { id: 'adult_content', label: 'アダルト', icon: '🔞', color: 'text-pink-600' }
];

export const AdvancedModeration: React.FC<AdvancedModerationProps> = ({
  userId,
  className = '',
  permissions = {
    canReview: true,
    canApprove: true,
    canReject: true,
    canBan: false,
    canEditRules: false,
    canViewReports: true,
    canManageComments: true
  }
}) => {
  // 状態管理
  const [activeTab, setActiveTab] = useState<string>('queue');
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pendingReviews: 0,
    reviewedToday: 0,
    totalReports: 0,
    autoFlagged: 0,
    accuracyRate: 0,
    averageReviewTime: 0,
    escalatedCases: 0
  });
  const [moderationRules, setModerationRules] = useState<ModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<ModerationRule | null>(null);

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // モックデータ生成
  const generateMockModerationItems = useCallback((count: number = 20): ModerationItem[] => {
    const items: ModerationItem[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const type = ['game', 'comment', 'user', 'report'][Math.floor(Math.random() * 4)] as ModerationItem['type'];
      const status = ['pending', 'auto_flagged', 'escalated'][Math.floor(Math.random() * 3)] as ModerationItem['status'];
      const priority = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as ModerationItem['priority'];

      let content: any;
      const mockUser: UserProfile = {
        id: `user_${i}`,
        username: `user${i}`,
        displayName: `ユーザー${i}`,
        avatar: `https://picsum.photos/40/40?random=${i + 400}`,
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

      switch (type) {
        case 'game':
          content = {
            gameId: `game_${i}`,
            title: `問題のあるゲーム ${i}`,
            description: '問題が報告されているゲームです',
            thumbnail: `https://picsum.photos/200/150?random=${i + 500}`,
            author: mockUser,
            category: 'action',
            tags: ['問題', 'フラグ'],
            createdAt: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          };
          break;
        case 'comment':
          content = {
            commentId: `comment_${i}`,
            text: 'これは不適切なコメントの例です',
            author: mockUser,
            gameId: `game_${Math.floor(Math.random() * 100)}`,
            createdAt: new Date(now - Math.random() * 24 * 60 * 60 * 1000).toISOString()
          };
          break;
        case 'user':
          content = {
            ...mockUser,
            userId: mockUser.id,
            activityLevel: Math.floor(Math.random() * 100),
            violationHistory: Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => ({
              id: `violation_${j}`,
              type: 'spam',
              severity: 'medium',
              action: 'warning',
              date: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              moderator: 'mod_1'
            }))
          };
          break;
        case 'report':
          content = {
            reportId: `report_${i}`,
            targetType: 'game' as const,
            targetId: `game_${Math.floor(Math.random() * 100)}`,
            reporterUserId: `user_${Math.floor(Math.random() * 50)}`,
            reason: 'inappropriate',
            description: '不適切なコンテンツが含まれています',
            evidence: [`evidence_${i}.png`],
            createdAt: new Date(now - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
          };
          break;
      }

      const flags: ModerationFlag[] = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => {
        const flagType = FLAG_TYPES[Math.floor(Math.random() * FLAG_TYPES.length)];
        return {
          id: `flag_${i}_${j}`,
          type: flagType.id as ModerationFlag['type'],
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as ModerationFlag['severity'],
          confidence: Math.random(),
          source: ['ai', 'user_report', 'keyword'][Math.floor(Math.random() * 3)] as ModerationFlag['source'],
          description: `${flagType.label}コンテンツが検出されました`,
          detectedAt: new Date(now - Math.random() * 24 * 60 * 60 * 1000).toISOString()
        };
      });

      items.push({
        id: `item_${i}`,
        type,
        status,
        priority,
        content,
        flags,
        aiScore: Math.floor(Math.random() * 100),
        reportCount: Math.floor(Math.random() * 10),
        reportReasons: ['inappropriate', 'spam'].slice(0, Math.floor(Math.random() * 2) + 1),
        submittedAt: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: '東京, 日本'
        }
      });
    }

    return items.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, []);

  // モックルール生成
  const generateMockRules = useCallback((): ModerationRule[] => {
    return [
      {
        id: 'rule_1',
        name: 'スパム検出',
        description: '同一ユーザーによる短時間での大量投稿を検出',
        enabled: true,
        priority: 1,
        conditions: [
          { type: 'user_history', operator: 'greater_than', value: 10, weight: 0.8 },
          { type: 'ai_score', operator: 'greater_than', value: 70, weight: 0.9 }
        ],
        actions: [
          { type: 'flag', parameters: { flagType: 'spam' } },
          { type: 'escalate', parameters: { priority: 'high' } }
        ],
        statistics: { triggered: 245, accuracy: 87.5 }
      },
      {
        id: 'rule_2',
        name: '不適切コンテンツ',
        description: 'AIによる不適切コンテンツの自動検出',
        enabled: true,
        priority: 2,
        conditions: [
          { type: 'ai_score', operator: 'greater_than', value: 85, weight: 1.0 },
          { type: 'keyword', operator: 'contains', value: '禁止ワード', weight: 0.7 }
        ],
        actions: [
          { type: 'auto_reject', parameters: {} },
          { type: 'notify_admin', parameters: { urgency: 'high' } }
        ],
        statistics: { triggered: 89, accuracy: 92.1 }
      },
      {
        id: 'rule_3',
        name: 'ハラスメント対策',
        description: 'ハラスメント行為の検出と対処',
        enabled: true,
        priority: 3,
        conditions: [
          { type: 'report_count', operator: 'greater_than', value: 3, weight: 0.9 },
          { type: 'ai_score', operator: 'greater_than', value: 60, weight: 0.6 }
        ],
        actions: [
          { type: 'escalate', parameters: { priority: 'critical' } },
          { type: 'temporary_ban', parameters: { duration: 24 } }
        ],
        statistics: { triggered: 34, accuracy: 94.1 }
      }
    ];
  }, []);

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 実装時はSupabase APIで置き換え
      const mockItems = generateMockModerationItems();
      const mockRules = generateMockRules();

      // フィルター適用
      let filteredItems = mockItems;
      
      if (filterPriority !== 'all') {
        filteredItems = filteredItems.filter(item => item.priority === filterPriority);
      }
      
      if (filterType !== 'all') {
        filteredItems = filteredItems.filter(item => item.type === filterType);
      }
      
      if (searchQuery) {
        filteredItems = filteredItems.filter(item => {
          const content = item.content as any;
          return JSON.stringify(content).toLowerCase().includes(searchQuery.toLowerCase());
        });
      }

      // タブ別フィルタリング
      switch (activeTab) {
        case 'queue':
          filteredItems = filteredItems.filter(item => item.status === 'pending');
          break;
        case 'flagged':
          filteredItems = filteredItems.filter(item => item.status === 'auto_flagged');
          break;
        case 'reports':
          filteredItems = filteredItems.filter(item => item.type === 'report');
          break;
        case 'users':
          filteredItems = filteredItems.filter(item => item.type === 'user');
          break;
      }

      setModerationItems(filteredItems);
      setModerationRules(mockRules);

      // 統計計算
      setStats({
        pendingReviews: mockItems.filter(item => item.status === 'pending').length,
        reviewedToday: Math.floor(Math.random() * 50) + 20,
        totalReports: mockItems.filter(item => item.type === 'report').length,
        autoFlagged: mockItems.filter(item => item.status === 'auto_flagged').length,
        accuracyRate: 89.5,
        averageReviewTime: 4.2,
        escalatedCases: mockItems.filter(item => item.status === 'escalated').length
      });

    } catch (error) {
      console.error('Error loading moderation data:', error);
    } finally {
      setLoading(false);
    }
  }, [generateMockModerationItems, generateMockRules, activeTab, filterPriority, filterType, searchQuery]);

  // 初期読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // アイテム承認
  const handleApprove = useCallback(async (itemId: string) => {
    if (!permissions.canApprove) return;

    try {
      // 実装時はAPI呼び出し
      setModerationItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: userId }
          : item
      ));
      
      console.log(`Approved item: ${itemId}`);
    } catch (error) {
      console.error('Approve error:', error);
    }
  }, [permissions.canApprove, userId]);

  // アイテム拒否
  const handleReject = useCallback(async (itemId: string, reason: string = '') => {
    if (!permissions.canReject) return;

    try {
      setModerationItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: 'rejected' as const, 
              reviewedAt: new Date().toISOString(), 
              reviewedBy: userId,
              reviewNotes: reason
            }
          : item
      ));
      
      console.log(`Rejected item: ${itemId}, reason: ${reason}`);
    } catch (error) {
      console.error('Reject error:', error);
    }
  }, [permissions.canReject, userId]);

  // エスカレーション
  const handleEscalate = useCallback(async (itemId: string) => {
    try {
      setModerationItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'escalated' as const, priority: 'critical' as const }
          : item
      ));
      
      console.log(`Escalated item: ${itemId}`);
    } catch (error) {
      console.error('Escalate error:', error);
    }
  }, []);

  // 一括操作
  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    try {
      const itemIds = Array.from(selectedItems);
      
      switch (bulkAction) {
        case 'approve':
          if (permissions.canApprove) {
            for (const itemId of itemIds) {
              await handleApprove(itemId);
            }
          }
          break;
        case 'reject':
          if (permissions.canReject) {
            for (const itemId of itemIds) {
              await handleReject(itemId, '一括拒否');
            }
          }
          break;
        case 'escalate':
          for (const itemId of itemIds) {
            await handleEscalate(itemId);
          }
          break;
      }

      setSelectedItems(new Set());
      setBulkAction('');

    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [bulkAction, selectedItems, permissions, handleApprove, handleReject, handleEscalate]);

  // アイテム選択
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  // 全選択
  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedItems(new Set(moderationItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [moderationItems]);

  // ルール保存
  const handleSaveRule = useCallback((rule: ModerationRule) => {
    if (!permissions.canEditRules) return;

    setModerationRules(prev => {
      if (editingRule) {
        return prev.map(r => r.id === rule.id ? rule : r);
      } else {
        return [...prev, { ...rule, id: `rule_${Date.now()}` }];
      }
    });

    setShowRuleEditor(false);
    setEditingRule(null);
  }, [permissions.canEditRules, editingRule]);

  // 優先度ラベル取得
  const getPriorityInfo = useCallback((priority: string) => {
    return PRIORITY_LEVELS.find(p => p.id === priority) || PRIORITY_LEVELS[3];
  }, []);

  // フラグタイプ情報取得
  const getFlagTypeInfo = useCallback((type: string) => {
    return FLAG_TYPES.find(f => f.id === type) || FLAG_TYPES[0];
  }, []);

  // アイテムレンダー
  const renderModerationItem = useCallback((item: ModerationItem) => {
    const priorityInfo = getPriorityInfo(item.priority);
    
    return (
      <ModernCard key={item.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={selectedItems.has(item.id)}
            onChange={(e) => handleItemSelect(item.id, e.target.checked)}
            className="mt-2"
          />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${priorityInfo.color}`}>
                {priorityInfo.icon} {priorityInfo.label}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {item.type}
              </span>
              <span className="text-xs text-gray-500">
                AI: {item.aiScore}/100
              </span>
              {item.reportCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  {item.reportCount}件報告
                </span>
              )}
            </div>

            {/* コンテンツ表示 */}
            {item.type === 'game' && (
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={(item.content as GameContent).thumbnail} 
                  alt={(item.content as GameContent).title}
                  className="w-16 h-12 object-cover rounded"
                />
                <div>
                  <h4 className="font-medium">{(item.content as GameContent).title}</h4>
                  <p className="text-sm text-gray-600">{(item.content as GameContent).description}</p>
                  <p className="text-xs text-gray-500">作者: {(item.content as GameContent).author.displayName}</p>
                </div>
              </div>
            )}

            {item.type === 'comment' && (
              <div className="mb-2">
                <p className="text-sm">{(item.content as CommentContent).text}</p>
                <p className="text-xs text-gray-500">
                  {(item.content as CommentContent).author.displayName} - 
                  {new Date((item.content as CommentContent).createdAt).toLocaleString('ja-JP')}
                </p>
              </div>
            )}

            {item.type === 'user' && (
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={(item.content as UserContent).avatar} 
                  alt={(item.content as UserContent).displayName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h4 className="font-medium">{(item.content as UserContent).displayName}</h4>
                  <p className="text-sm text-gray-600">@{(item.content as UserContent).username}</p>
                  <p className="text-xs text-gray-500">
                    違反履歴: {(item.content as UserContent).violationHistory.length}件
                  </p>
                </div>
              </div>
            )}

            {item.type === 'report' && (
              <div className="mb-2">
                <h4 className="font-medium">{(item.content as ReportContent).reason}</h4>
                <p className="text-sm text-gray-600">{(item.content as ReportContent).description}</p>
                <p className="text-xs text-gray-500">
                  対象: {(item.content as ReportContent).targetType} - {(item.content as ReportContent).targetId}
                </p>
              </div>
            )}

            {/* フラグ表示 */}
            {item.flags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.flags.map(flag => {
                  const flagInfo = getFlagTypeInfo(flag.type);
                  return (
                    <span key={flag.id} className={`text-xs px-2 py-1 rounded ${flagInfo.color} bg-gray-100`}>
                      {flagInfo.icon} {flagInfo.label} ({Math.round(flag.confidence * 100)}%)
                    </span>
                  );
                })}
              </div>
            )}

            <div className="text-xs text-gray-500">
              提出: {new Date(item.submittedAt).toLocaleString('ja-JP')}
              {item.metadata.location && ` | ${item.metadata.location}`}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col gap-2">
            {permissions.canApprove && (
              <ModernButton
                onClick={() => handleApprove(item.id)}
                className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1"
              >
                ✓ 承認
              </ModernButton>
            )}
            {permissions.canReject && (
              <ModernButton
                onClick={() => handleReject(item.id)}
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1"
              >
                ✗ 拒否
              </ModernButton>
            )}
            <ModernButton
              onClick={() => handleEscalate(item.id)}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1"
            >
              ⬆ エスカレ
            </ModernButton>
          </div>
        </div>
      </ModernCard>
    );
  }, [selectedItems, handleItemSelect, getPriorityInfo, getFlagTypeInfo, permissions, handleApprove, handleReject, handleEscalate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">モデレーションデータを読み込んでいます...</span>
      </div>
    );
  }

  return (
    <div className={`advanced-moderation ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">⚖️ コンテンツモデレーション</h2>
          <div className="flex gap-2">
            {permissions.canEditRules && (
              <ModernButton
                onClick={() => setShowRuleEditor(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                ⚙️ ルール管理
              </ModernButton>
            )}
            <ModernButton
              onClick={loadData}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              🔄 更新
            </ModernButton>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.pendingReviews}</div>
            <div className="text-sm text-gray-600">審査待ち</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.reviewedToday}</div>
            <div className="text-sm text-gray-600">今日の審査</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.totalReports}</div>
            <div className="text-sm text-gray-600">総報告数</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.autoFlagged}</div>
            <div className="text-sm text-gray-600">自動フラグ</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{stats.accuracyRate}%</div>
            <div className="text-sm text-gray-600">精度</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-lg font-bold text-indigo-600">{stats.averageReviewTime}分</div>
            <div className="text-sm text-gray-600">平均審査時間</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.escalatedCases}</div>
            <div className="text-sm text-gray-600">エスカレ済み</div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODERATION_TABS.map((tab) => (
          <ModernButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span className={tab.color}>{tab.icon}</span> {tab.label}
          </ModernButton>
        ))}
      </div>

      {/* フィルター・検索 */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="all">全優先度</option>
            {PRIORITY_LEVELS.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="all">全タイプ</option>
            <option value="game">ゲーム</option>
            <option value="comment">コメント</option>
            <option value="user">ユーザー</option>
            <option value="report">報告</option>
          </select>
        </div>
      </div>

      {/* 一括操作 */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedItems.size}件選択中
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-1 border border-blue-300 rounded text-sm"
          >
            <option value="">一括操作を選択</option>
            {permissions.canApprove && <option value="approve">承認</option>}
            {permissions.canReject && <option value="reject">拒否</option>}
            <option value="escalate">エスカレーション</option>
          </select>
          <ModernButton
            onClick={handleBulkAction}
            disabled={!bulkAction}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          >
            実行
          </ModernButton>
          <ModernButton
            onClick={() => setSelectedItems(new Set())}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            選択解除
          </ModernButton>
        </div>
      )}

      {/* アイテム一覧 */}
      {moderationItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚖️</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">審査アイテムがありません</h3>
          <p className="text-gray-500">現在処理が必要なアイテムはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 全選択チェックボックス */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedItems.size === moderationItems.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span className="text-sm text-gray-600">全て選択</span>
          </div>

          {moderationItems.map(renderModerationItem)}
        </div>
      )}

      {/* ルールエディターモーダル */}
      {showRuleEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">モデレーションルール管理</h3>
              <ModernButton
                onClick={() => setShowRuleEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </ModernButton>
            </div>

            <div className="space-y-4">
              {moderationRules.map(rule => (
                <ModernCard key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{rule.name}</h4>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span>トリガー: {rule.statistics.triggered}回</span>
                        <span>精度: {rule.statistics.accuracy}%</span>
                        <span className={`px-2 py-1 rounded ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {rule.enabled ? '有効' : '無効'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <ModernButton
                        onClick={() => {
                          setEditingRule(rule);
                        }}
                        className="text-sm bg-blue-100 text-blue-700"
                      >
                        編集
                      </ModernButton>
                      <ModernButton
                        onClick={() => {
                          setModerationRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          ));
                        }}
                        className={`text-sm ${rule.enabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {rule.enabled ? '無効化' : '有効化'}
                      </ModernButton>
                    </div>
                  </div>
                </ModernCard>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};