import {useEffect,useState} from 'react';
import type {analyze} from './parser.mjs';
import type {ConversationInsights} from './insights.mjs';
import type {Message} from './types';
const empty={stats:{counts:{},words:[],hours:Array(24).fill(0),days:Array(7).fill(0),wordCount:0} as ReturnType<typeof analyze>,insights:{emojis:[],emojiByPerson:{},starters:{},days:0,calls:{events:0,byCaller:{},unattributed:0,missed:0}} as ConversationInsights};
export function useArchiveStats(messages:Message[],onError:(message:string)=>void){
 const [state,setState]=useState({...empty,source:messages,loading:!!messages.length});
 useEffect(()=>{if(!messages.length){setState({...empty,source:messages,loading:false});return;}
  setState({...empty,source:messages,loading:true});
  const worker=new Worker(new URL('./stats-worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=e=>{if(e.data.error){setState({...empty,source:messages,loading:false});onError('Could not calculate these insights. Try a smaller date range.');}else setState({...e.data,source:messages,loading:false});};
  worker.onerror=()=>{setState({...empty,source:messages,loading:false});onError('Could not start conversation analysis. Please reload the app.');};
  worker.postMessage(messages);return()=>worker.terminate();
 },[messages,onError]);
 return state.source===messages?state:{...empty,source:messages,loading:!!messages.length};
}
