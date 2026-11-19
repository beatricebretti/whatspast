import {useEffect,useRef,useState} from 'react';
import {Download,LoaderCircle,FileText,Image as ImageIcon,Music,Play} from 'lucide-react';
import {getFile} from './storage';
import {mediaName,mediaKind} from './media.mjs';
import type {Message} from './types';
// Bound concurrent reads and ZIP decompression while scrolling through large archives.
let running=0;
const waiting:(()=>void)[]=[];
async function bounded<T>(work:()=>Promise<T>):Promise<T>{if(running>=3)await new Promise<void>(resolve=>waiting.push(resolve));running++;try{return await work();}finally{running--;waiting.shift()?.();}}
function mime(name:string){return ({opus:'audio/ogg; codecs=opus',ogg:'audio/ogg',mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'video/mp4',mov:'video/quicktime',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',pdf:'application/pdf'} as Record<string,string>)[name.split('.').pop()?.toLowerCase()||'']||'application/octet-stream';}
export function MessageBody({message,chatId,compact=false}:{message:Message;chatId:string;compact?:boolean}){
 const name=mediaName(message.text),kind=mediaKind(message.text),root=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[url,setUrl]=useState(''),[loading,setLoading]=useState(false),[err,setErr]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{setVisible(false);const node=root.current;if(!node||!name)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'120px'});observer.observe(node);return()=>observer.disconnect();},[chatId,name,message.id]);
 useEffect(()=>{if(!name||!visible)return;let disposed=false,owned='';setLoading(true);setErr('');setUrl('');bounded(async()=>{if(disposed)return;let blob=await getFile(chatId,name);if(!blob){const {allFiles}=await import('./zip-media');blob=await allFiles(chatId,name);}if(disposed)return;if(!blob)throw new Error('Not included in this export. Import the folder with its media.');if(!blob.type||blob.type==='application/octet-stream')blob=blob.slice(0,blob.size,mime(name));owned=URL.createObjectURL(blob);setUrl(owned);}).catch(e=>{if(!disposed)setErr(e instanceof Error?e.message:String(e));}).finally(()=>{if(!disposed)setLoading(false);});return()=>{disposed=true;if(owned)URL.revokeObjectURL(owned);};},[chatId,name,visible,retry]);
 if(!name)return <span className="message-text">{message.text}</span>;
 const Icon=kind==='audio'?Music:kind==='video'?Play:kind==='document'?FileText:ImageIcon;
 return <div ref={root} className={`attachment ${kind==='sticker'?'sticker':''} ${compact?'compact':''}`}>
 {url?(kind==='image'||kind==='sticker')?<a className="image-preview" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${kind}: ${name}`}><img src={url} alt={kind==='sticker'?'Sticker':name} loading="lazy" onError={()=>setErr('This image cannot be previewed. Download it to open.')}/></a>:kind==='video'?<video key={url} src={url+'#t=0.1'} controls playsInline preload="metadata" aria-label={name} onError={()=>setErr('This browser cannot play this video. You can download it.')}/>:kind==='audio'?<div className="audio-preview"><span><Music size={16}/>{/\.opus$/i.test(name)?'Voice note':'Audio'}</span><audio key={url} src={url} controls preload="metadata" aria-label={name} onError={()=>setErr('This browser cannot play this audio. You can download it.')}/></div>:<a className="document-preview" href={url} download={name}><FileText size={26}/><span>{name}</span></a>:<div className="preview-placeholder">{loading?<LoaderCircle className="spin" size={23}/>:<Icon size={25}/>}<span>{loading?'Loading preview…':err?'Preview unavailable':'Waiting for preview'}</span></div>}
 {err&&<div className="attachment-error"><span>{err}</span><button onClick={()=>setRetry(n=>n+1)}>Retry</button></div>}
 {url&&<a className="attachment-download" href={url} download={name} title={`Download ${name}`}><Download size={12}/><span>{name}</span></a>}
 </div>;
}
