import {openDB} from 'idb';
import {ZipReader,BlobReader,BlobWriter} from '@zip.js/zip.js';
import type {Chat} from './types';
async function openIndex(blob:Blob){const reader=new ZipReader(new BlobReader(blob));try{const entries=await reader.getEntries();return {reader,entries:new Map(entries.filter(e=>!e.directory).map(e=>[e.filename.split('/').pop()!,e]))};}catch(error){await reader.close();throw error;}}
type Archive={key:IDBValidKey;index?:ReturnType<typeof openIndex>};
async function locateArchives(chatId:string){
 const db=await openDB('whatspast');const chat=await db.get('chats',chatId) as Chat|undefined;
 const known=(await db.getAllKeys('files',IDBKeyRange.bound(chatId+'/',chatId+'/\uffff'))).filter(k=>/\.zip$/i.test(String(k)));
 const keys=[...(chat?.archiveKeys||[]),...known.filter(k=>!chat?.archiveKeys?.includes(String(k)))];
 db.close();return keys.map(key=>({key} as Archive));
}
const archives=new Map<string,ReturnType<typeof locateArchives>>();
export async function releaseArchive(chatId:string){const pending=archives.get(chatId);archives.delete(chatId);if(pending){const sources=await pending.catch(()=>[]);await Promise.allSettled(sources.map(async s=>{if(s.index){const index=await s.index;await index.reader.close();}}));}}
export async function allFiles(chatId:string,name:string):Promise<Blob|undefined>{
 if(!archives.has(chatId))archives.set(chatId,locateArchives(chatId));
 const sources=await archives.get(chatId)!;
 for(const source of sources){
  if(!source.index){source.index=(async()=>{const db=await openDB('whatspast');const blob=await db.get('files',source.key) as Blob;db.close();return openIndex(blob);})();}
  let index;try{index=await source.index;}catch(error){source.index=undefined;throw error;}
  const entry=index.entries.get(name);
  if(entry&&'getData'in entry&&entry.getData)return entry.getData(new BlobWriter());
 }
}
