import { MessagesSquare, Clock, ArrowUpRight, X } from 'lucide-react';
import type { analyze } from './parser.mjs';
const number = (n: number) => n.toLocaleString();
export function ConversationDetails({
  stats,
  messageCount,
  onWord,
  onInsights,
  onClose,
}: {
  stats: ReturnType<typeof analyze>;
  messageCount: number;
  onWord: (word: string) => void;
  onInsights: () => void;
  onClose: () => void;
}) {
  const people = Object.keys(stats.counts);
  return (
    <aside className="details">
      <div className="details-title">
        A conversation in numbers
        <button
          className="icon-button details-close"
          aria-label="Close conversation details"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div className="total-stat">
        <div className="stat-icon">
          <MessagesSquare size={21} />
        </div>
        <strong>{number(messageCount)}</strong>
        <span>messages</span>
      </div>
      <div className="detail-divider" />
      <h4>Who’s the talkative one?</h4>
      <div className="talk-bar">
        {people.map((p, i) => (
          <div
            key={p}
            style={{
              width: `${(stats.counts[p] / Math.max(1, messageCount)) * 100}%`,
              background: `var(--participant-${i % 4})`,
            }}
          />
        ))}
      </div>
      {people.map((p, i) => (
        <div className="person-stat" key={p}>
          <span>
            <i
              style={{
                background: `var(--participant-${i % 4})`,
              }}
            />
            {p}
          </span>
          <strong>
            {Math.round((stats.counts[p] / Math.max(1, messageCount)) * 100)}%{' '}
            <small>{number(stats.counts[p])}</small>
          </strong>
        </div>
      ))}
      <div className="detail-divider" />
      <div className="detail-subheading">
        <h4>Words on repeat</h4>
        <span>TOP 8</span>
      </div>
      <div className="word-cloud">
        {stats.words.slice(0, 8).map(([w, n]: [string, number], i: number) => (
          <button
            key={w}
            className={i === 0 ? 'featured' : ''}
            onClick={() => {
              onWord(w);
            }}
          >
            {w}
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="detail-divider" />
      <h4>Your conversation rhythm</h4>
      <div className="rhythm">
        <span className="rhythm-icon">
          <Clock size={19} />
        </span>
        <div>
          <strong>
            {Math.max(...stats.hours) > 0
              ? new Date(
                  2000,
                  0,
                  1,
                  stats.hours.indexOf(Math.max(...stats.hours)),
                ).toLocaleTimeString(undefined, { hour: 'numeric' })
              : '—'}
          </strong>
          <span>Your busiest hour</span>
        </div>
      </div>
      <div className="insights-link">
        <button onClick={onInsights}>
          All insights
          <ArrowUpRight size={16} />
        </button>
      </div>
    </aside>
  );
}
