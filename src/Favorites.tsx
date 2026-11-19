import { useMemo, useState } from 'react';
import { Star, CalendarDays, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';
import { MessageBody } from './Attachment';
import { dayKey, mediaName, mediaKind, sortByTimestamp } from './media.mjs';
import { MediaSort } from './MediaSort';
import type { MediaOrder } from './media.mjs';
import type { Chat, FavoriteMap, Message } from './types';
export function FavoriteButton({
  active,
  onClick,
  label = 'media',
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      className={`favorite-button ${active ? 'is-favorite' : ''}`}
      aria-label={`${active ? 'Unfavorite' : 'Favorite'} ${label}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <Star size={14} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
export function FavoritesView({
  chats,
  favorites,
  onDay,
  onToggleDay,
  onToggleMedia,
  sortOrder,
  onSortChange,
}: {
  chats: Chat[];
  favorites: FavoriteMap;
  onDay: (id: string, day: string) => void;
  onToggleDay: (id: string, day: string) => void;
  onToggleMedia: (id: string, name: string) => void;
  sortOrder: MediaOrder;
  onSortChange: (order: MediaOrder) => void;
}) {
  const [view, setView] = useState('days'),
    [kind, setKind] = useState('all');
  const saved = useMemo(() => {
    const days: { chat: Chat; day: string; messages: number; media: number }[] = [],
      media: { chat: Chat; message: Message; name: string }[] = [];
    for (const chat of chats) {
      const f = favorites[chat.id];
      if (!f) continue;
      const daySet = new Set(f.days),
        fileSet = new Set(f.media),
        seen = new Set(),
        counts = new Map<string, { messages: number; media: number }>();
      for (const m of chat.messages) {
        const day = dayKey(m.timestamp),
          name = mediaName(m.text);
        if (daySet.has(day)) {
          const n = counts.get(day) || { messages: 0, media: 0 };
          n.messages++;
          if (name) n.media++;
          counts.set(day, n);
        }
        if (name && fileSet.has(name) && !seen.has(name)) {
          seen.add(name);
          media.push({ chat, message: m, name });
        }
      }
      for (const day of f.days) {
        const count = counts.get(day);
        if (count) days.push({ chat, day, ...count });
      }
    }
    return {
      days: days.sort((a, b) => b.day.localeCompare(a.day)),
      media: media.sort((a, b) => b.message.timestamp - a.message.timestamp),
    };
  }, [chats, favorites]);
  const visible = sortByTimestamp(
    saved.media.filter((m) => kind === 'all' || mediaKind(m.message.text) === kind),
    sortOrder,
    (item) => item.message.timestamp,
  );
  return (
    <div className="favorites-view">
      <div className="section-heading">
        <div>
          <h2>Your favorites</h2>
          <p>Saved days and media from all your conversations.</p>
        </div>
        <Star size={24} />
      </div>
      <div className="favorites-switch" role="group" aria-label="Favorite category">
        <button
          className={view === 'days' ? 'active' : ''}
          aria-pressed={view === 'days'}
          onClick={() => setView('days')}
        >
          <CalendarDays size={15} />
          Days<span>{saved.days.length}</span>
        </button>
        <button
          className={view === 'media' ? 'active' : ''}
          aria-pressed={view === 'media'}
          onClick={() => setView('media')}
        >
          <ImageIcon size={15} />
          Media<span>{saved.media.length}</span>
        </button>
      </div>
      {view === 'days' ? (
        <div className="favorite-days">
          {saved.days.length ? (
            saved.days.map((item) => (
              <article key={item.chat.id + item.day} className="favorite-day-card">
                <div className="favorite-day-heading">
                  <CalendarDays size={20} />
                  <FavoriteButton
                    active
                    onClick={() => onToggleDay(item.chat.id, item.day)}
                    label={`${item.day} in ${item.chat.name}`}
                  />
                </div>
                <h3>
                  {new Date(item.day + 'T12:00:00').toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p>{item.chat.name}</p>
                <span>
                  {item.messages.toLocaleString()} messages · {item.media.toLocaleString()} media
                </span>
                <button className="favorite-open" onClick={() => onDay(item.chat.id, item.day)}>
                  Revisit this day
                  <ArrowRight size={14} />
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Star size={30} />
              <h3>Star a day from the calendar or date bar</h3>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="media-toolbar">
            <div className="media-filters" role="group" aria-label="Favorite media type">
              {[
                ['all', 'All media'],
                ['image', 'Photos'],
                ['video', 'Videos'],
                ['sticker', 'Stickers'],
                ['audio', 'Audio'],
                ['document', 'Documents'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={kind === id ? 'active' : ''}
                  aria-pressed={kind === id}
                  onClick={() => setKind(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <MediaSort value={sortOrder} onChange={onSortChange} />
          </div>
          {visible.length ? (
            <VirtuosoGrid
              style={{ flex: 1, minHeight: 0 }}
              key={kind + sortOrder}
              data={visible}
              computeItemKey={(_, item) => item.chat.id + item.name}
              listClassName="media-grid"
              itemClassName="media-tile"
              itemContent={(_, item) => (
                <>
                  <div className="media-card-top">
                    <span title={item.chat.name}>{item.chat.name}</span>
                    <FavoriteButton active onClick={() => onToggleMedia(item.chat.id, item.name)} />
                  </div>
                  <MessageBody
                    key={item.chat.updatedAt}
                    chatId={item.chat.id}
                    message={item.message}
                    compact
                  />
                  <small>{new Date(item.message.timestamp).toLocaleDateString()}</small>
                </>
              )}
            />
          ) : (
            <div className="empty-state">
              <Star size={30} />
              <h3>Use the star on a media preview to save</h3>
            </div>
          )}
        </>
      )}
    </div>
  );
}
