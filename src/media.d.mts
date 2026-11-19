import type { Message } from './types';
export type MediaKind = 'image' | 'video' | 'sticker' | 'audio' | 'document';
export function mediaName(text: string): string | undefined;
export function mediaKind(text: string): MediaKind | null;
export function dayKey(timestamp: number): string;
export function filterMessages(
  messages: Message[],
  options?: { day?: string; search?: string; kind?: string },
): Message[];
export type MediaOrder = 'newest' | 'oldest';
export function sortByTimestamp<T extends { timestamp: number }>(
  items: T[],
  order?: MediaOrder,
): T[];
export function sortByTimestamp<T>(
  items: T[],
  order: MediaOrder,
  getTimestamp: (item: T) => number,
): T[];
