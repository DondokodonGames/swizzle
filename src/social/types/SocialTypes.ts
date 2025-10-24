// src/social/types/SocialTypes.ts

export interface SocialStats {
  likes: number;
  shares: number;
  bookmarks: number;
  views: number;
  comments?: number;
}

export interface SocialState {
  isLiked: boolean;
  isShared: boolean;
  isBookmarked: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  website: string;
  stats: UserStats;
  isFollowing?: boolean;
  isOwner?: boolean;
}

export interface UserStats {
  totalGames: number;
  totalPlays: number;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  joinDate: string;
  lastActive: string;
}

export interface PublicGame {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  stats: SocialStats;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  projectData?: any;  // 🔧 追加: 完全なGameProjectデータ
}

export interface UserGame {
  id: string;
  title: string;
  thumbnail: string;
  stats: SocialStats;
  status: 'published' | 'draft' | 'private';
  createdAt: string;
  updatedAt: string;
}

export interface GameFilters {
  category?: string;
  sortBy?: 'latest' | 'popular' | 'trending' | 'mostPlayed' | 'relevance';
  search?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface FilterOption {
  id: string;
  label: string;
  icon: string;
}

export interface SortOption {
  id: string;
  label: string;
  icon: string;
}