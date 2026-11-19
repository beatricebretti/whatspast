import { analyze } from './parser.mjs';
import { conversationInsights } from './insights.mjs';
self.onmessage = (e) => {
  try {
    self.postMessage({ stats: analyze(e.data), insights: conversationInsights(e.data) });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
