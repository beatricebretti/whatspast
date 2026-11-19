import type {Message} from './types';
export type ConversationInsights={emojis:[string,number][];emojiByPerson:Record<string,Record<string,number>>;starters:Record<string,number>;days:number;calls:{events:number;byCaller:Record<string,number>;unattributed:number;missed:number}};
export function messageContent(text:string):string;
export function callRecord(message:Message,participants?:string[]):{caller:string|null;missed:boolean}|null;
export function conversationInsights(messages:Message[]):ConversationInsights;
