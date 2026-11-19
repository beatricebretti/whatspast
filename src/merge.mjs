import {mediaName,mediaKind} from './media.mjs';
const normalize=text=>text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\r\n?/g,'\n').normalize('NFC').trim();
function attachment(m){
 const name=mediaName(m.text);if(name)return {kind:mediaKind(m.text),omitted:false,caption:normalize(m.text.replace(name,'').replace(/<attached:\s*>|<adjunto:\s*>|\((?:file attached|archivo adjunto)\)/gi,''))};
 const match=normalize(m.text).match(/^(?:<)?(image|photo|video|sticker|audio|document|imagen|foto|documento)(?: omitted| omitid[oa])(?:>)?$/i);
 if(!match)return null;
 const type=match[1].toLowerCase();return {kind:({photo:'image',imagen:'image',foto:'image',documento:'document'})[type]||type,omitted:true,caption:''};
}
export function mergeMessages(existing,incoming){
 const merged=existing.map(m=>({...m})),exact=new Map(),attachments=new Map(),used=new Set();
 const base=m=>JSON.stringify([m.timestamp,m.sender]);
 existing.forEach((m,index)=>{const key=base(m)+normalize(m.text);if(!exact.has(key))exact.set(key,[]);exact.get(key).push(index);const media=attachment(m);if(media){const key=base(m)+media.kind+media.caption;if(!attachments.has(key))attachments.set(key,[]);attachments.get(key).push({index,media});}});
 for(const message of incoming){
  const matches=exact.get(base(message)+normalize(message.text))||[];let index=matches.find(i=>!used.has(i));
  const media=attachment(message);
  if(index===undefined&&media){const candidates=attachments.get(base(message)+media.kind+media.caption)||[];index=candidates.find(c=>!used.has(c.index)&&(media.omitted||c.media.omitted))?.index;}
  if(index!==undefined){used.add(index);if(media&&!media.omitted&&attachment(merged[index])?.omitted)merged[index]={...message};}
  else merged.push({...message});
 }
 return merged.sort((a,b)=>a.timestamp-b.timestamp).map((m,id)=>({...m,id}));
}
