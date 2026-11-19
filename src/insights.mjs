import {dayKey,mediaName} from './media.mjs';

export function messageContent(text) {
 const name=mediaName(text);
 return text.replace(name||'\u0000','').replace(/<attached:[^>]*>|<adjunto:[^>]*>/gi,'').replace(/\((?:file attached|archivo adjunto)\)/gi,'');
}

// An exported call record is not always evidence of who initiated it.
export function callRecord(message,participants=[]) {
 const text=message.text.trim();
 const explicit=/^(?:(?:started|initiated) (?:a )?(?:(?:voice|video|group) )?call|outgoing (?:(?:voice|video) )?call|llamada (?:de voz |de v[ií]deo )?(?:iniciada|saliente))(?:\s*[,.:]|$)/i;
 if(message.sender&&explicit.test(text))return {caller:message.sender,missed:false};
 for(const person of participants){
  if(text.startsWith(person+' ')&&/^(?:started|initiated) (?:a )?(?:(?:voice|video|group) )?call(?:\s*[,.:]|$)/i.test(text.slice(person.length+1)))return {caller:person,missed:false};
 }
 const generic=/^(?:(?:missed|incoming|outgoing|cancelled|canceled|unanswered) )?(?:(?:voice|video|group) )?call(?:\s*[,.:()]|$)|^llamada(?:s)?(?: de (?:voz|v[ií]deo))?(?: perdida| entrante| saliente)?(?:\s*[,.:()]|$)/i;
 if(generic.test(text))return {caller:null,missed:/missed|unanswered|perdida/i.test(text)};
 return null;
}

export function conversationInsights(messages) {
 const emojis=new Map(),emojiByPerson={},starters={},firstByDay=new Map(),calls={events:0,byCaller:{},unattributed:0,missed:0};
 const participants=[...new Set(messages.map(m=>m.sender).filter(Boolean))];
 const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 for(const m of messages){
  const call=callRecord(m,participants);
  if(call){calls.events++;if(call.caller)calls.byCaller[call.caller]=(calls.byCaller[call.caller]||0)+1;else calls.unattributed++;if(call.missed)calls.missed++;continue;}
  if(!m.sender)continue;
  const day=dayKey(m.timestamp),first=firstByDay.get(day);
  if(!first||m.timestamp<first.timestamp)firstByDay.set(day,m);
  for(const {segment} of segmenter.segment(messageContent(m.text))){
   if(!/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(segment))continue;
   emojis.set(segment,(emojis.get(segment)||0)+1);
   emojiByPerson[m.sender]??={};emojiByPerson[m.sender][segment]=(emojiByPerson[m.sender][segment]||0)+1;
  }
 }
 for(const m of firstByDay.values())starters[m.sender]=(starters[m.sender]||0)+1;
 return {emojis:[...emojis].sort((a,b)=>b[1]-a[1]).slice(0,30),emojiByPerson,starters,days:firstByDay.size,calls};
}
