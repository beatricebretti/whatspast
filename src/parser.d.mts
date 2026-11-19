import type { Message } from './types';
export function parseChat(
  text: string,
  dateOrder?: string,
): { messages: Message[]; dateOrder: string; ambiguous: boolean };
export function analyze(messages: Message[]): {
  counts: Record<string, number>;
  words: [string, number][];
  hours: number[];
  days: number[];
  wordCount: number;
};
