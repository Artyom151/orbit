

export type ProfileTheme = 'default' | 'ocean' | 'sunset' | 'forest' | 'matrix' | 'sakura' | 'dracula' | 'retro' | 'cyberpunk' | 'custom';

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverPhoto: string;
  profileBackground?: string;
  bio: string;
  role?: 'user' | 'moderator' | 'developer';
  profileSong?: Track;
  storyBorder?: 'none' | 'rainbow' | 'gold' | 'neon' | 'custom' | { gradient: [string, string], glow: string };
  profileTheme?: ProfileTheme | { name: 'custom', colors: { primary: string, background: string, accent: string } };
  pinnedPostId?: string;
};

export type MediaItem = {
    src: string;
    type: 'image' | 'video';
}

export type Post = {
  id: string;
  userId: string;
  content: string;
  media?: MediaItem[];
  track?: Track;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: number;
  likes?: Record<string, boolean>;
  groupId?: string;
};

export type Article = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  coverImage?: string;
  createdAt: number;
  author?: User; // Populated client-side
};


export type Message = {
  id: string;
  senderId: string;
  text: string;
  audioUrl?: string;
  timestamp: any;
  isEdited?: boolean;
}

export type Comment = {
  id: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: number;
  user?: User;
}

export type Bookmark = {
    id: string;
    postId: string;
    userId: string;
    bookmarkedAt: number;
}

export type Track = {
    trackId: number;
    artistName: string;
    trackName: string;
    previewUrl: string;
    artworkUrl100: string;
};

export type FavoriteTrack = Track & {
  id: string; // Will be the trackId
  userId: string;
  favoritedAt: number;
};

export type Playlist = {
    id: string;
    userId: string;
    name: string;
    createdAt: any;
    trackCount?: number;
};

export type PlaylistTrack = FavoriteTrack & {
    playlistId: string;
    addedAt: any;
}

export type Connection = {
    id: string; // Will be the other user's ID
    status: 'pending' | 'accepted';
    createdAt: number;
};

export type Group = {
    id: string;
    name: string;
    description: string;
    bannerUrl: string;
    createdBy: string;
    createdAt: number;
    memberCount: number;
};

export type GroupMember = {
    id: string; // Will be the user's ID
    userId: string;
    groupId: string;
    joinedAt: number;
};

export type Call = {
  id: string;
  caller: User;
  receiver: User;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'declined';
  createdAt: any;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

export type Report = {
  id: string;
  postId: string;
  reportedBy: string;
  reason: string;
  createdAt: number;
  post?: Post & { user: User }; // Populated client-side
}

export type Notification = {
    id: string;
    recipientId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderUsername: string;
    type: 'like' | 'comment' | 'repost' | 'follow';
    postId?: string;
    createdAt: number;
    read: boolean;
};
    
export type Status = {
  id: string;
  state: 'online' | 'offline';
  last_changed: number;
  customStatus?: string;
  emoji?: string;
};
    
