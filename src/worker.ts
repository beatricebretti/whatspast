import {parseChat} from './parser.mjs';
import {mergeMessages} from './merge.mjs';
self.onmessage=e=>{try{const parsed=parseChat(e.data.text,e.data.dateOrder);if(!parsed.messages.some(m=>m.sender))throw new Error('No supported WhatsApp messages found. Try another date format.');if(e.data.existing)parsed.messages=mergeMessages(e.data.existing,parsed.messages);self.postMessage(parsed);}catch(error){self.postMessage({error:String(error)});}};
