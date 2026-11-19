export type Message = { id: number; timestamp: number; sender: string | null; text: string };
export type Chat = {
  id: string;
  name: string;
  messages: Message[];
  dateOrder: string;
  ambiguous?: boolean;
  demo?: boolean;
  archiveKeys?: string[];
  updatedAt?: number;
};

export type Favorites = { days: string[]; media: string[] };
export type FavoriteMap = Record<string, Favorites>;
