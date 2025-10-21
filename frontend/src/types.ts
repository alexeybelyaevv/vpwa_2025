export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export interface WorkspaceBadge {
  id: number;
  name: string;
  initials: string;
  color: string;
}

export interface WorkspaceSummary {
  id: number;
  name: string;
  plan: string;
}

export interface UserProfile {
  name: string;
  role: string;
  status: PresenceStatus;
  avatarUrl?: string;
}

export interface Chat {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  unread?: number;
  status?: PresenceStatus;
  active?: boolean;
  muted?: boolean;
  icon?: string;
  invited?: boolean;
  lastActiveAt?: string;
  type: ChannelType;
  admin: string;
  members: string[];
  banned: string[];
  kicks: Record<string, Set<string>>;
}
export type ChannelType = 'public' | 'private';

export interface Message {
  id: number;
  chatId: string;
  senderId: string;
  text: string;
  mentioned?: string[];
}
