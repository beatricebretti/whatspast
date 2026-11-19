import type { Message } from './types';
export function matchingMessageIndexes(
  messages: Message[],
  query: string,
  wholeWord?: boolean,
): number[];
export function highlightParts(
  text: string,
  query: string,
  wholeWord?: boolean,
): { text: string; match: boolean }[];
export function nextSearchIndex(current: number, step: number, count: number): number;
