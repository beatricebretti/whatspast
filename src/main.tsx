import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MessageCircle,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  FolderOpen,
  Image as ImageIcon,
  BarChart3,
  MoreHorizontal,
  X,
  Upload,
  FileArchive,
  CheckCheck,
  LockKeyhole,
  Trash2,
  Download,
  Smile,
  Clock,
  MessagesSquare,
  Heart,
  CalendarDays,
  ArrowRight,
  LoaderCircle,
  Play,
  Music,
  FileText,
  Check,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import { ZipReader, BlobReader, TextWriter } from '@zip.js/zip.js';
import { allChats, saveChat, removeChat } from './storage';
import { useArchiveStats } from './useArchiveStats';
import { ConversationStats } from './ConversationStats';
import { FavoritesView, FavoriteButton } from './Favorites';
import { useFavorites } from './useFavorites';
import { Calendar } from './Calendar';
import { MessageBody } from './Attachment';
import { mediaName, mediaKind, filterMessages, dayKey } from './media.mjs';
import type { Chat, Message } from './types';
import './style.css';
const avatarColors = ['#f7d4df', '#e8e1f3', '#dce9df', '#f6e4d0'];
const initials = (name: string) =>
  name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const date = (n: number) =>
  new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const number = (n: number) => n.toLocaleString();
function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <MessageCircle size={25} />
        <span className="offline-dot" />
      </span>
      <span>
        whatspast<span className="brand-period">.</span>
      </span>
    </div>
  );
}
function App() {
  const [chats, setChats] = useState<Chat[]>([]),
    [selected, setSelected] = useState(''),
    [tab, setTab] = useState('chat'),
    [search, setSearch] = useState(''),
    [chatSearch, setChatSearch] = useState(''),
    [importOpen, setImportOpen] = useState(false),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [order, setOrder] = useState('auto'),
    [notice, setNotice] = useState(''),
    [menu, setMenu] = useState(false),
    [showInfo, setShowInfo] = useState(true),
    [word, setWord] = useState(''),
    [selectedDay, setSelectedDay] = useState(''),
    [mediaFilter, setMediaFilter] = useState('all'),
    [importTarget, setImportTarget] = useState('');
  const {
    favorites,
    toggle: toggleFavorite,
    forget: forgetFavorites,
    flush: flushFavorites,
  } = useFavorites(setNotice);
  const fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        openImport();
      }
      if (e.key === 'Escape') {
        if (!busy) setImportOpen(false);
        setMenu(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [busy]);
  useEffect(() => {
    allChats()
      .then((saved) => {
        const real = saved.filter((c) => !c.demo && c.id !== 'demo');
        setChats(real);
        setSelected(real[0]?.id || '');
      })
      .catch(() =>
        setNotice('Browser storage is unavailable. Imports will work for this session.'),
      );
    navigator.storage?.persist?.().catch(() => {});
    if (import.meta.env?.PROD && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  const chat: Chat = chats.find((c) => c.id === selected) ||
    chats[0] || { id: '', name: '', messages: [], dateOrder: 'dmy' };
  const scopedMessages = useMemo(
    () => filterMessages(chat.messages, { day: selectedDay }),
    [chat, selectedDay],
  );
  const { stats, insights, loading: analyzing } = useArchiveStats(scopedMessages, setNotice);
  const currentFavorites = favorites[chat.id] || { days: [], media: [] };
  const messageCount = scopedMessages.filter((m) => m.sender).length;
  const allPeople = useMemo(
    () => [...new Set(chat.messages.map((m) => m.sender).filter((s): s is string => !!s))],
    [chat],
  );
  const people = Object.keys(stats.counts);
  const me = allPeople.includes('You') ? 'You' : allPeople[1] || allPeople[0];
  const filtered = useMemo(
    () => filterMessages(scopedMessages, { search }),
    [scopedMessages, search],
  );
  const mediaMessages = useMemo(
    () => scopedMessages.filter((m) => mediaName(m.text)),
    [scopedMessages],
  );
  const visibleMedia = useMemo(
    () => filterMessages(mediaMessages, { kind: mediaFilter }),
    [mediaMessages, mediaFilter],
  );
  const mediaCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mediaMessages.length };
    for (const m of mediaMessages) {
      const k = mediaKind(m.text)!;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [mediaMessages]);
  function openImport(target = '') {
    setImportTarget(target);
    setError('');
    setImportOpen(true);
    setMenu(false);
  }
  function select(id: string) {
    setSelected(id);
    setSearch('');
    setTab('chat');
    setWord('');
    setSelectedDay('');
    setMediaFilter('all');
  }
  async function importFiles(input: FileList | File[] | null) {
    if (!input?.length) return;
    setError('');
    setBusy('Opening your export…');
    try {
      const files = Array.from(input);
      const estimate = await navigator.storage?.estimate?.();
      const size = files.reduce((n, f) => n + f.size, 0);
      if (estimate?.quota && size > (estimate.quota - (estimate.usage || 0)) * 0.95)
        throw new Error(
          'This export exceeds the available browser storage. Free some device space or import a smaller export.',
        );
      let texts: { name: string; text: string }[] = [];
      let stored = files;
      const archive = files.find((f) => /\.zip$/i.test(f.name));
      if (archive) {
        const zip = new ZipReader(new BlobReader(archive));
        const entries = await zip.getEntries();
        for (const entry of entries) {
          if (
            !entry.directory &&
            /\.txt$/i.test(entry.filename) &&
            'getData' in entry &&
            entry.getData
          )
            texts.push({
              name: entry.filename.split('/').pop()!,
              text: await entry.getData(new TextWriter()),
            });
        }
        await zip.close();
        stored = [archive];
      } else
        for (const f of files.filter((f) => /\.txt$/i.test(f.name)))
          texts.push({ name: f.name, text: await f.text() });
      texts = texts.filter((t) =>
        /^\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},?\s+\d{1,2}:\d{2}/m.test(
          t.text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ''),
        ),
      );
      if (!texts.length)
        throw new Error(
          'No chat text found. Choose the WhatsApp ZIP, or a folder containing _chat.txt and its media.',
        );
      if (importTarget && texts.length !== 1)
        throw new Error('Choose one chat export when updating a conversation.');
      const target = chats.find((c) => c.id === importTarget);
      if (importTarget && !target) throw new Error('Choose an existing conversation to update.');
      let first = '',
        added = 0;
      for (const t of texts) {
        setBusy(`Reading ${t.name}…`);
        const result: any = await new Promise((resolve, reject) => {
          const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (e) => {
            worker.terminate();
            e.data.error ? reject(new Error(e.data.error)) : resolve(e.data);
          };
          worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message));
          };
          worker.postMessage({ text: t.text, dateOrder: order, existing: target?.messages });
        });
        if (!result.messages.some((m: Message) => m.sender)) continue;
        const names = [
          ...new Set<string>(result.messages.map((m: Message) => m.sender).filter(Boolean)),
        ];
        const name =
          t.name
            .replace(/\.txt$/i, '')
            .replace(/^WhatsApp Chat (with|–|-)\s*/i, '')
            .replace(/^_chat$/i, '') || names.join(' & ');
        const c: Chat = target
          ? {
              ...target,
              messages: result.messages,
              dateOrder: result.dateOrder,
              ambiguous: target.ambiguous || result.ambiguous,
            }
          : {
              id: crypto.randomUUID(),
              name,
              messages: result.messages,
              dateOrder: result.dateOrder,
              ambiguous: result.ambiguous,
            };
        added += c.messages.length - (target?.messages.length || 0);
        setBusy('Saving your conversation & media…');
        const saved = await saveChat(c, stored);
        const { releaseArchive } = await import('./zip-media');
        await releaseArchive(saved.id);
        setChats((prev) => [...prev.filter((c) => !c.demo && c.id !== saved.id), saved]);
        first ||= saved.id;
      }
      if (!first)
        throw new Error('No supported WhatsApp messages found. Try a different date format.');
      select(first);
      setImportOpen(false);
      setNotice(
        importTarget
          ? `Conversation updated: ${number(added)} new messages. Earlier history and favorites kept.`
          : 'Conversation imported. Everything stays on this device.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
      if (folderInput.current) folderInput.current.value = '';
    }
  }
  function exportStats() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            conversation: chat.name,
            day: selectedDay || null,
            messages: scopedMessages.length,
            ...stats,
            ...insights,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.name}-insights.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function deleteCurrent() {
    const { releaseArchive } = await import('./zip-media');
    await releaseArchive(chat.id);
    await flushFavorites();
    await removeChat(chat.id);
    forgetFavorites(chat.id);
    const remaining = chats.filter((c) => c.id !== chat.id);
    setChats(remaining);
    setSelected(remaining[0]?.id || '');
    setSelectedDay('');
    setMenu(false);
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <Logo />
        <button className="new-import" onClick={() => openImport()}>
          <Plus size={18} />
          Import a conversation<span>⌘ I</span>
        </button>
        <div className="nav-label">YOUR SPACE</div>
        <button
          className={`nav-item ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          <MessagesSquare size={18} />
          Conversations<span className="pill">{chats.length}</span>
        </button>
        <button
          className={`nav-item ${tab === 'insights' ? 'active' : ''}`}
          onClick={() => setTab('insights')}
        >
          <BarChart3 size={18} />
          Conversation insights
          <ArrowUpRight size={15} />
        </button>
        <button
          className={`nav-item ${tab === 'favorites' ? 'active' : ''}`}
          onClick={() => setTab('favorites')}
        >
          <Star size={18} />
          Favorites
        </button>
        <div className="sidebar-divider" />
        <div className="list-heading">
          All conversations <span>{chats.length}</span>
        </div>
        <label className="chat-filter">
          <Search size={16} />
          <input
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder="Find a conversation"
          />
        </label>
        <div className="chat-list">
          {chats
            .filter((c) => c.name.toLowerCase().includes(chatSearch.toLowerCase()))
            .map((c, i) => (
              <button
                className={`chat-card ${c.id === chat?.id ? 'selected' : ''}`}
                key={c.id}
                onClick={() => select(c.id)}
              >
                <span className="avatar" style={{ background: avatarColors[i % 4] }}>
                  {initials(c.name)}
                </span>
                <span className="chat-summary">
                  <span className="chat-name">
                    {c.name}
                    <small>
                      {new Date(c.messages.at(-1)!.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </small>
                  </span>
                  <span className="chat-snippet">{c.messages.at(-1)?.text}</span>
                  <span className="chat-meta">{number(c.messages.length)} messages </span>
                </span>
              </button>
            ))}
        </div>
        <div className="privacy-card">
          <span className="privacy-icon">
            <ShieldCheck size={21} />
          </span>
          <strong>Your memories. Only yours.</strong>
          <p>No clouds. No accounts. Your chats never leave this device.</p>
          <span>
            <span className="green-dot" />
            100% private & local
          </span>
        </div>
        <div className="sidebar-footer">
          <span className="mini-logo">
            <MessageCircle size={16} />
          </span>
          Made for the conversations that matter
          <Heart size={12} />
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <span>Your personal chat archive</span>
          <span className="local-badge">
            <span className="green-dot" />
            Offline by design
          </span>
          <button
            className="icon-button mobile-import"
            aria-label="Import"
            onClick={() => openImport()}
          >
            <Plus size={19} />
          </button>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">A LITTLE LOOK BACK</div>
            <h1>
              Good conversations deserve a home<span>.</span>
            </h1>
            <p>Keep the messages. Relive the moments. Discover the little things.</p>
          </div>
          <button className="outline-button" onClick={() => openImport()}>
            <Upload size={16} />
            Import chat
          </button>
        </div>
        <section className="workspace">
          {tab === 'favorites' ? (
            <FavoritesView
              chats={chats}
              favorites={favorites}
              onDay={(id, day) => {
                select(id);
                setSelectedDay(day);
              }}
              onToggleDay={(id, day) => toggleFavorite(id, 'days', day)}
              onToggleMedia={(id, name) => toggleFavorite(id, 'media', name)}
            />
          ) : !chat.id ? (
            <div className="welcome-empty">
              <span className="modal-icon">
                <MessagesSquare size={30} />
              </span>
              <div className="eyebrow">YOUR STORIES START HERE</div>
              <h2>A home for your conversations.</h2>
              <p>
                Import your WhatsApp export to explore messages,
                <br />
                relive your media, and discover your conversation’s story.
              </p>
              <button className="primary-button" onClick={() => openImport()}>
                <Plus size={17} />
                Import your first conversation
              </button>
              <span className="welcome-private">
                <ShieldCheck size={15} />
                Private, local, and entirely yours.
              </span>
            </div>
          ) : (
            <>
              <div className="conversation-main" key={chat.id + chat.updatedAt}>
                <header className="conversation-header">
                  <span className="avatar">{initials(chat.name)}</span>
                  <div>
                    <h2>{chat.name}</h2>
                    <span className="subtle">
                      {allPeople.length} participants <span className="dot-sep">·</span>{' '}
                      {date(chat.messages[0].timestamp)} – {date(chat.messages.at(-1)!.timestamp)}
                    </span>
                  </div>
                  <div className="header-actions">
                    <button
                      className="icon-button"
                      aria-label="Toggle conversation details"
                      onClick={() => setShowInfo(!showInfo)}
                    >
                      <BarChart3 size={19} />
                    </button>
                    <div className="menu-wrap">
                      <button
                        className="icon-button"
                        aria-label="Conversation options"
                        onClick={() => setMenu(!menu)}
                      >
                        <MoreHorizontal size={22} />
                      </button>
                      {menu && (
                        <div className="dropdown">
                          <button onClick={() => openImport(chat.id)}>
                            <RefreshCw size={15} />
                            Update from export
                          </button>
                          <button onClick={exportStats}>
                            <Download size={15} />
                            Export insights
                          </button>
                          <button onClick={deleteCurrent}>
                            <Trash2 size={15} />
                            Remove conversation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </header>
                <div className="tabs">
                  <div>
                    {[
                      ['chat', MessageCircle, 'Messages'],
                      ['media', ImageIcon, 'Media'],
                      ['calendar', CalendarDays, 'Calendar'],
                      ['insights', BarChart3, 'Insights'],
                    ].map(([id, Icon, label]: any) => (
                      <button
                        key={id}
                        className={tab === id ? 'current' : ''}
                        onClick={() => setTab(id)}
                      >
                        <Icon size={16} />
                        {label}
                        {id === 'media' && <span>{mediaMessages.length}</span>}
                      </button>
                    ))}
                  </div>
                  <span className="archive-label">
                    <LockKeyhole size={12} />
                    Private archive
                  </span>
                </div>
                <div className="date-toolbar">
                  <CalendarDays size={14} />
                  <label htmlFor="day-filter">
                    {selectedDay ? 'Viewing one day' : 'All dates'}
                  </label>
                  <input
                    id="day-filter"
                    aria-label="Filter conversation by day"
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                  />
                  {selectedDay && (
                    <>
                      {scopedMessages.length > 0 && (
                        <FavoriteButton
                          active={currentFavorites.days.includes(selectedDay)}
                          onClick={() => toggleFavorite(chat.id, 'days', selectedDay)}
                          label={selectedDay}
                        />
                      )}
                      <button onClick={() => setSelectedDay('')}>
                        <X size={13} />
                        Clear
                      </button>
                    </>
                  )}
                  <span>{number(scopedMessages.length)} messages</span>
                </div>
                {analyzing && (
                  <div className="analysis-status" role="status">
                    <LoaderCircle size={12} className="spin" />
                    Finding the story in your conversation…
                  </div>
                )}
                {tab === 'calendar' ? (
                  <Calendar
                    key={chat.id}
                    messages={chat.messages}
                    day={selectedDay}
                    favoriteDays={currentFavorites.days}
                    onToggleDay={(day) => toggleFavorite(chat.id, 'days', day)}
                    onChange={(day) => {
                      setSelectedDay(day);
                      setSearch('');
                      if (day) setTab('chat');
                    }}
                  />
                ) : tab === 'chat' ? (
                  <>
                    <div className="message-search">
                      <Search size={17} />
                      <input
                        placeholder="Search this conversation…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <>
                          <span>{number(filtered.length)} results</span>
                          <button
                            className="icon-button"
                            aria-label="Clear search"
                            onClick={() => setSearch('')}
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                      <span className="search-hint">⌕</span>
                    </div>
                    {chat.ambiguous && (
                      <div className="demo-notice">
                        Dates interpreted as day/month/year. If incorrect, reimport using
                        month/day/year.
                      </div>
                    )}
                    <div className="message-area">
                      {filtered.length ? (
                        <Virtuoso
                          key={chat.id + search + selectedDay}
                          style={{ height: '100%' }}
                          data={filtered}
                          initialTopMostItemIndex={
                            selectedDay ? 0 : Math.max(0, filtered.length - 14)
                          }
                          itemContent={(index, m) => (
                            <div className="message-row-wrap">
                              {(index === 0 ||
                                new Date(filtered[index - 1].timestamp).toDateString() !==
                                  new Date(m.timestamp).toDateString()) && (
                                <div className="day-chip">
                                  <span>{date(m.timestamp)}</span>
                                  <FavoriteButton
                                    active={currentFavorites.days.includes(dayKey(m.timestamp))}
                                    onClick={() =>
                                      toggleFavorite(chat.id, 'days', dayKey(m.timestamp))
                                    }
                                    label={dayKey(m.timestamp)}
                                  />
                                </div>
                              )}
                              {!m.sender ? (
                                <div className="system-message">{m.text}</div>
                              ) : (
                                <div className={`message-row ${m.sender === me ? 'outgoing' : ''}`}>
                                  <div className="bubble">
                                    {allPeople.length > 2 && (
                                      <span className="sender">{m.sender}</span>
                                    )}
                                    <MessageBody message={m} chatId={chat.id} />
                                    {mediaName(m.text) && (
                                      <FavoriteButton
                                        active={currentFavorites.media.includes(mediaName(m.text)!)}
                                        onClick={() =>
                                          toggleFavorite(chat.id, 'media', mediaName(m.text)!)
                                        }
                                        label="attachment"
                                      />
                                    )}
                                    <span className="message-time">
                                      {new Date(m.timestamp).toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                      {m.sender === me && <CheckCheck size={13} />}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        />
                      ) : (
                        <div className="empty-state">
                          <Search />
                          <h3>No messages found</h3>
                          <p>Try another word or phrase.</p>
                        </div>
                      )}
                    </div>
                    <footer className="archive-footer">
                      <LockKeyhole size={13} />
                      <span>This is your archive. Every message, just as you remember it.</span>
                      <span className="read-only">READ ONLY</span>
                    </footer>
                  </>
                ) : tab === 'media' ? (
                  <div className="media-panel">
                    <div className="section-heading">
                      <div>
                        <h3>All the little moments</h3>
                        <p>Photos, videos, stickers, and voice notes.</p>
                      </div>
                      <span className="pill">{visibleMedia.length} files</span>
                    </div>
                    <div className="media-filters" role="group" aria-label="Filter media by type">
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
                          aria-pressed={mediaFilter === id}
                          className={mediaFilter === id ? 'active' : ''}
                          onClick={() => setMediaFilter(id)}
                        >
                          {label}
                          <span>{mediaCounts[id] || 0}</span>
                        </button>
                      ))}
                    </div>
                    {visibleMedia.length ? (
                      <VirtuosoGrid
                        style={{ flex: 1, minHeight: 200 }}
                        key={chat.id + selectedDay + mediaFilter}
                        data={visibleMedia}
                        computeItemKey={(_, m) => m.id}
                        listClassName="media-grid"
                        itemClassName="media-tile"
                        itemContent={(_, m) => (
                          <>
                            <div className="media-card-top">
                              <span>{mediaKind(m.text)}</span>
                              <FavoriteButton
                                active={currentFavorites.media.includes(mediaName(m.text)!)}
                                onClick={() => toggleFavorite(chat.id, 'media', mediaName(m.text)!)}
                              />
                            </div>
                            <MessageBody message={m} chatId={chat.id} compact />
                            <small>{date(m.timestamp)}</small>
                          </>
                        )}
                      />
                    ) : (
                      <div className="empty-state">
                        <ImageIcon size={34} />
                        <h3>No media in this view</h3>
                        <p>Try another media type or choose a different date.</p>
                        <button
                          className="outline-button"
                          onClick={() => {
                            setMediaFilter('all');
                            setSelectedDay('');
                          }}
                        >
                          Show all media
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="insights-panel">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">BETWEEN THE LINES</div>
                        <h3>Every conversation has a story.</h3>
                        <p>Here’s a little more of yours.</p>
                      </div>
                      <button className="outline-button" onClick={exportStats}>
                        <Download size={15} />
                        Export
                      </button>
                    </div>
                    <div className="stat-cards">
                      <Stat
                        icon={<MessageCircle />}
                        value={number(messageCount)}
                        label="Messages exchanged"
                      />
                      <Stat
                        icon={<FileText />}
                        value={number(stats.wordCount)}
                        label="Words shared"
                      />
                      <Stat
                        icon={<CalendarDays />}
                        value={number(
                          new Set(scopedMessages.map((m) => new Date(m.timestamp).toDateString()))
                            .size,
                        )}
                        label="Days with a conversation"
                      />
                    </div>
                    <ConversationStats data={insights} />
                    <div className="insight-box">
                      <h3>When you catch up</h3>
                      <p>Messages by hour of the day</p>
                      <div className="hour-chart">
                        {stats.hours.map((n: number, i: number) => (
                          <div className="hour-column" key={i} title={`${i}:00 · ${n} messages`}>
                            <div
                              style={{
                                height: `${Math.max(2, (n / Math.max(...stats.hours)) * 100)}%`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="chart-axis">
                        <span>12 AM</span>
                        <span>6 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>11 PM</span>
                      </div>
                    </div>
                    <div className="insight-box">
                      <h3>Find your favorite phrase</h3>
                      <p>Count messages containing a word or phrase, by participant.</p>
                      <label className="message-search">
                        <Search size={16} />
                        <input
                          value={word}
                          onChange={(e) => setWord(e.target.value)}
                          placeholder="Try ‘love’, ‘coffee’, or an inside joke…"
                        />
                      </label>
                      {word &&
                        people.map((p) => (
                          <div className="word-result" key={p}>
                            <span>{p}</span>
                            <strong>
                              {number(
                                scopedMessages.filter(
                                  (m) =>
                                    m.sender === p &&
                                    m.text.toLowerCase().includes(word.toLowerCase()),
                                ).length,
                              )}{' '}
                              messages
                            </strong>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {showInfo && (
                <aside className="details">
                  <div className="details-title">
                    A conversation in numbers
                    <BarChart3 size={16} />
                  </div>
                  <div className="total-stat">
                    <div className="stat-icon">
                      <MessagesSquare size={21} />
                    </div>
                    <strong>{number(messageCount)}</strong>
                    <span>messages, countless memories</span>
                  </div>
                  <div className="detail-divider" />
                  <h4>Who’s the talkative one?</h4>
                  <div className="talk-bar">
                    {people.map((p, i) => (
                      <div
                        key={p}
                        style={{
                          width: `${(stats.counts[p] / Math.max(1, messageCount)) * 100}%`,
                          background:
                            i === 0 ? '#ca688b' : i === 1 ? '#f3b8cd' : avatarColors[i % 4],
                        }}
                      />
                    ))}
                  </div>
                  {people.map((p, i) => (
                    <div className="person-stat" key={p}>
                      <span>
                        <i
                          style={{
                            background:
                              i === 0 ? '#ca688b' : i === 1 ? '#f3b8cd' : avatarColors[i % 4],
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
                          setSearch(w);
                          setTab('chat');
                        }}
                      >
                        {w}
                        <span>{n}</span>
                      </button>
                    ))}
                  </div>
                  <p className="tiny-note">Common words, laughter, and media labels excluded.</p>
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
                    <button onClick={() => setTab('insights')}>
                      Explore all insights
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="memory-note">
                    <Heart size={20} />
                    <p>
                      Behind every number,
                      <br />
                      there’s a moment.
                    </p>
                  </div>
                </aside>
              )}
            </>
          )}
        </section>
        <div className="bottom-note">
          <ShieldCheck size={14} />
          Stored on your device. Never on a server.<span>Built with a little nostalgia.</span>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {importOpen && (
        <div className="modal-backdrop" onClick={() => !busy && setImportOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="import-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close import"
              disabled={!!busy}
              onClick={() => setImportOpen(false)}
            >
              <X size={21} />
            </button>
            <div className="modal-icon">
              <FolderOpen size={28} />
            </div>
            <div className="eyebrow">MAKE ROOM FOR YOUR MEMORIES</div>
            <h2 id="import-title">
              {importTarget
                ? 'Keep your conversation up to date.'
                : 'Bring your conversations home.'}
            </h2>
            <p>
              {importTarget
                ? 'Import a later export. Overlapping messages are merged, and earlier history, media, and favorites are kept.'
                : 'Export a WhatsApp chat with media, then choose the ZIP or folder. We’ll take care of the rest.'}
            </p>
            <label className="date-select import-target">
              Import into
              <select
                disabled={!!busy}
                aria-label="Import destination"
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value)}
              >
                <option value="">New conversation</option>
                {chats.map((c) => (
                  <option key={c.id} value={c.id}>
                    Update: {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              disabled={!!busy}
              className="dropzone"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) importFiles(e.dataTransfer.files);
              }}
            >
              {busy ? <LoaderCircle className="spin" size={31} /> : <FileArchive size={32} />}
              <strong>{busy || 'Drop your WhatsApp export here'}</strong>
              <span>
                {busy
                  ? 'Keep this window open while your chat is saved.'
                  : 'ZIP, or TXT with media · Photos, videos, stickers & audio'}
              </span>
              {!busy && (
                <span className="primary-button">
                  Choose files
                  <ArrowUpRight size={16} />
                </span>
              )}
            </button>
            <button
              disabled={!!busy}
              className="folder-button"
              onClick={() => folderInput.current?.click()}
            >
              <FolderOpen size={16} />
              Or choose an entire export folder
              <ArrowRight size={15} />
            </button>
            <label className="date-select">
              Export date format
              <select disabled={!!busy} value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="auto">Auto-detect (defaults to day/month)</option>
                <option value="dmy">Day / month / year</option>
                <option value="mdy">Month / day / year</option>
              </select>
              <ChevronDown size={14} />
            </label>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <div className="import-help">
              <strong>How to export from WhatsApp</strong>
              <p>
                Open a chat → tap the contact or group name → Export Chat → Attach Media. Save the
                export as a ZIP or folder.
              </p>
            </div>
            <div className="modal-privacy">
              <ShieldCheck size={15} />
              Processed on your device. Your chats stay yours.
            </div>
          </section>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".zip,.txt,.jpg,.jpeg,.png,.webp,.mp4,.opus,.ogg,.mp3,.m4a,.pdf"
        hidden
        onChange={(e) => importFiles(e.target.files)}
      />
      <input
        ref={folderInput}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        hidden
        onChange={(e) => importFiles(e.target.files)}
      />
    </div>
  );
}
function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
