// src/social/components/AdvancedSearchSystem.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, GameFilters } from '../types/SocialTypes';
import { useDebounce } from '../hooks/useSocialData';

interface AdvancedSearchSystemProps {
  className?: string;
  onResults?: (games: PublicGame[], totalCount: number) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  autoSearch?: boolean;
  showAdvanced?: boolean;
}

interface SearchFilters extends GameFilters {
  title?: string;
  author?: string;
  minLikes?: number;
  maxLikes?: number;
  minViews?: number;
  maxViews?: number;
  createdAfter?: string;
  createdBefore?: string;
  hasTag?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: 'short' | 'medium' | 'long';
  language?: string;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'game' | 'author' | 'tag' | 'category';
  count?: number;
  icon: string;
}

interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: string;
  resultCount: number;
}

// カテゴリ・タグ定義
const GAME_CATEGORIES = [
  { id: 'action', label: 'アクション', icon: '⚡' },
  { id: 'puzzle', label: 'パズル', icon: '🧩' },
  { id: 'casual', label: 'カジュアル', icon: '😊' },
  { id: 'arcade', label: 'アーケード', icon: '🕹️' },
  { id: 'strategy', label: 'ストラテジー', icon: '🧠' },
  { id: 'simulation', label: 'シミュレーション', icon: '🌍' }
];

const POPULAR_TAGS = [
  '楽しい', 'カンタン', '中毒性', 'かわいい', 'カッコいい', 
  'チャレンジ', 'リラックス', 'スピード', 'タイミング', 'パターン'
];

const SORT_OPTIONS = [
  { id: 'relevance', label: '関連度順', icon: '🎯' },
  { id: 'latest', label: '新着順', icon: '🆕' },
  { id: 'popular', label: '人気順', icon: '❤️' },
  { id: 'trending', label: 'トレンド', icon: '📈' },
  { id: 'mostPlayed', label: 'プレイ数', icon: '🎮' },
  { id: 'alphabetical', label: '名前順', icon: '🔤' }
];

export const AdvancedSearchSystem: React.FC<AdvancedSearchSystemProps> = ({
  className = '',
  onResults,
  onFiltersChange,
  autoSearch = true,
  showAdvanced = false
}) => {
  // 状態管理
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance'
  });
  const [results, setResults] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(showAdvanced);

  // refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // デバウンス処理
  const debouncedQuery = useDebounce(searchQuery, 300);
  const debouncedFilters = useDebounce(filters, 500);

  // 検索実行
  const executeSearch = useCallback(async (
    query: string = searchQuery,
    searchFilters: SearchFilters = filters,
    saveToHistory: boolean = true
  ) => {
    try {
      setLoading(true);
      
      // 検索クエリ構築
      const searchParams: GameFilters = {
        search: query || undefined,
        category: searchFilters.category,
        sortBy: searchFilters.sortBy || 'relevance',
        tags: searchFilters.tags,
        dateRange: (searchFilters.createdAfter || searchFilters.createdBefore) ? {
          start: searchFilters.createdAfter || '',
          end: searchFilters.createdBefore || ''
        } : undefined
      };

      // API呼び出し
      const result = await socialService.getPublicGames(searchParams, 1, 50);
      
      // 追加フィルタリング（クライアントサイド）
      let filteredResults = result.games;
      
      if (searchFilters.title) {
        filteredResults = filteredResults.filter(game =>
          game.title.toLowerCase().includes(searchFilters.title!.toLowerCase())
        );
      }
      
      if (searchFilters.author) {
        filteredResults = filteredResults.filter(game =>
          game.author.name.toLowerCase().includes(searchFilters.author!.toLowerCase())
        );
      }
      
      if (searchFilters.minLikes !== undefined) {
        filteredResults = filteredResults.filter(game => game.stats.likes >= searchFilters.minLikes!);
      }
      
      if (searchFilters.maxLikes !== undefined) {
        filteredResults = filteredResults.filter(game => game.stats.likes <= searchFilters.maxLikes!);
      }
      
      if (searchFilters.minViews !== undefined) {
        filteredResults = filteredResults.filter(game => (game.stats.views || 0) >= searchFilters.minViews!);
      }
      
      if (searchFilters.maxViews !== undefined) {
        filteredResults = filteredResults.filter(game => (game.stats.views || 0) <= searchFilters.maxViews!);
      }

      if (searchFilters.hasTag) {
        filteredResults = filteredResults.filter(game =>
          game.tags.some(tag => tag.toLowerCase().includes(searchFilters.hasTag!.toLowerCase()))
        );
      }

      setResults(filteredResults);
      setTotalCount(filteredResults.length);
      
      // コールバック実行
      onResults?.(filteredResults, filteredResults.length);
      
      // 検索履歴に保存
      if (saveToHistory && (query || Object.keys(searchFilters).length > 1)) {
        const historyItem: SearchHistory = {
          id: `search_${Date.now()}`,
          query,
          filters: searchFilters,
          timestamp: new Date().toISOString(),
          resultCount: filteredResults.length
        };
        
        setSearchHistory(prev => [historyItem, ...prev.slice(0, 19)]); // 最大20件
      }
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [socialService, searchQuery, filters, onResults]);

  // サジェスト生成
  const generateSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // モック実装（実装時はSupabase APIで置き換え）
    const mockSuggestions: SearchSuggestion[] = [
      // ゲーム名サジェスト
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `game_${i}`,
        text: `${query}ゲーム ${i + 1}`,
        type: 'game' as const,
        count: Math.floor(Math.random() * 100),
        icon: '🎮'
      })),
      
      // 作者名サジェスト
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `author_${i}`,
        text: `${query}クリエイター${i + 1}`,
        type: 'author' as const,
        count: Math.floor(Math.random() * 50),
        icon: '👤'
      })),
      
      // タグサジェスト
      ...POPULAR_TAGS
        .filter(tag => tag.includes(query))
        .slice(0, 3)
        .map(tag => ({
          id: `tag_${tag}`,
          text: tag,
          type: 'tag' as const,
          count: Math.floor(Math.random() * 200),
          icon: '🏷️'
        })),
      
      // カテゴリサジェスト
      ...GAME_CATEGORIES
        .filter(cat => cat.label.includes(query))
        .slice(0, 2)
        .map(cat => ({
          id: `category_${cat.id}`,
          text: cat.label,
          type: 'category' as const,
          count: Math.floor(Math.random() * 300),
          icon: cat.icon
        }))
    ];

    setSuggestions(mockSuggestions.slice(0, 8));
  }, []);

  // オートサーチ
  useEffect(() => {
    if (autoSearch && (debouncedQuery || Object.keys(debouncedFilters).length > 1)) {
      executeSearch(debouncedQuery, debouncedFilters);
    }
  }, [debouncedQuery, debouncedFilters, autoSearch, executeSearch]);

  // サジェスト生成
  useEffect(() => {
    generateSuggestions(searchQuery);
  }, [searchQuery, generateSuggestions]);

  // フィルター変更時のコールバック
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  // 外部クリックでサジェスト非表示
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // localStorage管理
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }

    const savedSearches = localStorage.getItem('saved_searches');
    if (savedSearches) {
      try {
        setSavedSearches(JSON.parse(savedSearches));
      } catch (error) {
        console.error('Error loading saved searches:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // ハンドラー
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);
    setShowHistory(false);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category') {
      setFilters(prev => ({ ...prev, category: suggestion.text }));
      setSearchQuery('');
    } else if (suggestion.type === 'tag') {
      setFilters(prev => ({ ...prev, hasTag: suggestion.text }));
      setSearchQuery('');
    } else if (suggestion.type === 'author') {
      setFilters(prev => ({ ...prev, author: suggestion.text }));
      setSearchQuery('');
    } else {
      setSearchQuery(suggestion.text);
    }
    setShowSuggestions(false);
  }, []);

  const handleHistoryClick = useCallback((historyItem: SearchHistory) => {
    setSearchQuery(historyItem.query);
    setFilters(historyItem.filters);
    setShowHistory(false);
    executeSearch(historyItem.query, historyItem.filters, false);
  }, [executeSearch]);

  const handleSaveSearch = useCallback(() => {
    if (!searchQuery && Object.keys(filters).length <= 1) return;

    const savedSearch: SearchHistory = {
      id: `saved_${Date.now()}`,
      query: searchQuery,
      filters,
      timestamp: new Date().toISOString(),
      resultCount: totalCount
    };

    setSavedSearches(prev => [savedSearch, ...prev.slice(0, 9)]); // 最大10件
  }, [searchQuery, filters, totalCount]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({ sortBy: 'relevance' });
    setResults([]);
    setTotalCount(0);
  }, []);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className={`advanced-search-system ${className}`}>
      {/* メイン検索バー */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 ゲーム、作者、タグで検索..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                setShowSuggestions(true);
                if (!searchQuery) setShowHistory(true);
              }}
              className="w-full px-4 py-3 pl-12 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute left-4 top-3.5 text-gray-400">🔍</div>
            
            {/* 検索ボタン */}
            <div className="absolute right-2 top-2 flex gap-1">
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              )}
              <ModernButton
                onClick={() => executeSearch()}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm"
              >
                検索
              </ModernButton>
            </div>
          </div>

          {/* 高度検索トグル */}
          <ModernButton
            onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            className={`px-4 py-3 ${showAdvancedPanel ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            ⚙️ 詳細
          </ModernButton>
        </div>

        {/* サジェスト・履歴 */}
        {(showSuggestions || showHistory) && (suggestions.length > 0 || searchHistory.length > 0) && (
          <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
            {/* サジェスト */}
            {showSuggestions && suggestions.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  検索候補
                </div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>{suggestion.icon}</span>
                      <span className="text-sm">{suggestion.text}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">
                        {suggestion.type}
                      </span>
                    </div>
                    {suggestion.count && (
                      <span className="text-xs text-gray-400">
                        {suggestion.count}件
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 検索履歴 */}
            {showHistory && searchHistory.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 flex items-center justify-between">
                  <span>最近の検索</span>
                  <button
                    onClick={() => setSearchHistory([])}
                    className="text-red-500 hover:text-red-600"
                  >
                    クリア
                  </button>
                </div>
                {searchHistory.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>⏰</span>
                      <span className="text-sm">{item.query || '詳細検索'}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {item.resultCount}件
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 高度検索パネル */}
      {showAdvancedPanel && (
        <ModernCard className="p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">🔍 詳細検索</h3>
            <div className="flex gap-2">
              <ModernButton
                onClick={handleSaveSearch}
                className="text-sm bg-green-500 hover:bg-green-600 text-white"
              >
                💾 保存
              </ModernButton>
              <ModernButton
                onClick={handleClearFilters}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                🗑️ クリア
              </ModernButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* タイトル検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ゲームタイトル</label>
              <input
                type="text"
                placeholder="タイトルで検索"
                value={filters.title || ''}
                onChange={(e) => handleFilterChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 作者検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作者名</label>
              <input
                type="text"
                placeholder="作者名で検索"
                value={filters.author || ''}
                onChange={(e) => handleFilterChange('author', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {GAME_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>

            {/* ソート */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.icon} {opt.label}</option>
                ))}
              </select>
            </div>

            {/* いいね数範囲 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">いいね数</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最小"
                  value={filters.minLikes || ''}
                  onChange={(e) => handleFilterChange('minLikes', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500 py-1">〜</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={filters.maxLikes || ''}
                  onChange={(e) => handleFilterChange('maxLikes', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            {/* ビュー数範囲 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再生数</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最小"
                  value={filters.minViews || ''}
                  onChange={(e) => handleFilterChange('minViews', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500 py-1">〜</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={filters.maxViews || ''}
                  onChange={(e) => handleFilterChange('maxViews', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            {/* 作成日範囲 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作成日</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.createdAfter || ''}
                  onChange={(e) => handleFilterChange('createdAfter', e.target.value || undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500 py-1">〜</span>
                <input
                  type="date"
                  value={filters.createdBefore || ''}
                  onChange={(e) => handleFilterChange('createdBefore', e.target.value || undefined)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            {/* タグ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
              <input
                type="text"
                placeholder="タグで検索"
                value={filters.hasTag || ''}
                onChange={(e) => handleFilterChange('hasTag', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 人気タグ */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">人気タグ</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map(tag => (
                <ModernButton
                  key={tag}
                  onClick={() => handleFilterChange('hasTag', tag)}
                  className={`text-sm ${
                    filters.hasTag === tag
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  🏷️ {tag}
                </ModernButton>
              ))}
            </div>
          </div>
        </ModernCard>
      )}

      {/* 保存済み検索 */}
      {savedSearches.length > 0 && (
        <ModernCard className="p-3 mb-4">
          <h4 className="font-medium text-gray-800 mb-2">💾 保存済み検索</h4>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map(saved => (
              <ModernButton
                key={saved.id}
                onClick={() => handleHistoryClick(saved)}
                className="text-sm bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
              >
                {saved.query || '詳細検索'} ({saved.resultCount}件)
              </ModernButton>
            ))}
          </div>
        </ModernCard>
      )}

      {/* 検索結果サマリー */}
      {(results.length > 0 || loading) && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                検索中...
              </span>
            ) : (
              <span>
                {totalCount}件のゲームが見つかりました
                {searchQuery && ` (「${searchQuery}」での検索結果)`}
              </span>
            )}
          </div>

          {!loading && totalCount > 0 && (
            <div className="flex gap-2">
              <ModernButton
                onClick={() => executeSearch()}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                🔄 再検索
              </ModernButton>
            </div>
          )}
        </div>
      )}

      {/* 検索結果が空の場合 */}
      {!loading && totalCount === 0 && (searchQuery || Object.keys(filters).length > 1) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">検索結果が見つかりません</h3>
          <p className="text-gray-500 mb-4">検索条件を変更してお試しください</p>
          <ModernButton
            onClick={handleClearFilters}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            🗑️ 検索条件をクリア
          </ModernButton>
        </div>
      )}
    </div>
  );
};