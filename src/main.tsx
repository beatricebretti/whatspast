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
  MessagesSquare,
  CalendarDays,
  ArrowRight,
  LoaderCircle,
  FileText,
  Check,
  Star,
  RefreshCw,
  PencilLine,
  ChevronUp,
} from 'lucide-react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { ZipReader, BlobReader, TextWriter } from '@zip.js/zip.js';
import { allChats, saveChat, removeChat, saveConversationProfile } from './storage';
import { ConversationAvatar } from './Avatar';
import { ConversationEditor } from './ConversationEditor';
import { AppearanceControl } from './AppearanceControl';
import { useAppearance } from './useAppearance';
import { ConversationDetails } from './ConversationDetails';
import { MediaSort } from './MediaSort';
import { HighlightedText } from './HighlightedText';
import { matchingMessageIndexes, nextSearchIndex } from './search.mjs';
import type { MediaOrder } from './media.mjs';
import { useArchiveStats } from './useArchiveStats';
import { ConversationStats } from './ConversationStats';
import { FavoritesView, FavoriteButton } from './Favorites';
import { useFavorites } from './useFavorites';
import { Calendar } from './Calendar';
import { MessageBody } from './Attachment';
import { mediaName, mediaKind, filterMessages, dayKey, sortByTimestamp } from './media.mjs';
import type { Chat, Message } from './types';
import './style.css';
const date = (n: number) =>
  new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const number = (n: number) => n.toLocaleString();
const emptyChat: Chat = { id: '', name: '', messages: [], dateOrder: 'dmy' };
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
    [showInfo, setShowInfo] = useState(() => window.matchMedia('(min-width: 1100px)').matches),
    [word, setWord] = useState(''),
    [selectedDay, setSelectedDay] = useState(''),
    [mediaFilter, setMediaFilter] = useState('all'),
    [importTarget, setImportTarget] = useState(''),
    [editing, setEditing] = useState(false),
    [mediaSort, setMediaSort] = useState<MediaOrder>('newest'),
    [searchMode, setSearchMode] = useState<'text' | 'word'>('text'),
    [resultIndex, setResultIndex] = useState(0);
  const { appearance, setAppearance } = useAppearance();
  const messageList = useRef<VirtuosoHandle>(null),
    searchInput = useRef<HTMLInputElement>(null);
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTab('chat');
        requestAnimationFrame(() => searchInput.current?.focus());
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
    const blocked = () =>
      setNotice('Close other whatspast tabs, then reload to finish upgrading local storage.');
    const reload = () =>
      setNotice('Local storage was upgraded in another tab. Please reload this tab.');
    window.addEventListener('whatspast-storage-blocked', blocked);
    window.addEventListener('whatspast-storage-reload', reload);
    return () => {
      window.removeEventListener('whatspast-storage-blocked', blocked);
      window.removeEventListener('whatspast-storage-reload', reload);
    };
  }, []);
  useEffect(() => {
    allChats()
      .then((saved) => {
        const real = saved.filter((c) => !c.demo && c.id !== 'demo');
        setChats(real);
        setSelected(real[0]?.id || '');
      })
      .catch(() =>
        setNotice(
          'Browser storage is unavailable. Please enable site storage to import your chats.',
        ),
      );
    navigator.storage?.persist?.().catch(() => {});
    if (import.meta.env?.PROD && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  const chat: Chat = chats.find((c) => c.id === selected) || chats[0] || emptyChat;
  const scopedMessages = useMemo(
    () => filterMessages(chat.messages, { day: selectedDay }),
    [chat.messages, selectedDay],
  );
  const { stats, insights, loading: analyzing } = useArchiveStats(scopedMessages, setNotice);
  const currentFavorites = favorites[chat.id] || { days: [], media: [] };
  const messageCount = scopedMessages.filter((m) => m.sender).length;
  const allPeople = useMemo(
    () => [...new Set(chat.messages.map((m) => m.sender).filter((s): s is string => !!s))],
    [chat.messages],
  );
  const people = Object.keys(stats.counts);
  const me = allPeople.includes('You') ? 'You' : allPeople[1] || allPeople[0];
  const matchingIndexes = useMemo(
    () => matchingMessageIndexes(scopedMessages, search.trim(), searchMode === 'word'),
    [scopedMessages, search, searchMode],
  );
  const matchSet = useMemo(() => new Set(matchingIndexes), [matchingIndexes]);
  const activeMatch = matchingIndexes[Math.min(resultIndex, matchingIndexes.length - 1)];
  useEffect(() => {
    setResultIndex(0);
    if (tab === 'chat' && search.trim() && matchingIndexes.length) {
      const frame = requestAnimationFrame(() =>
        messageList.current?.scrollToIndex({
          index: matchingIndexes[0],
          align: 'center',
          behavior: 'auto',
        }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [matchingIndexes, tab]);
  function navigateSearch(step: number) {
    if (!matchingIndexes.length) return;
    const next = nextSearchIndex(resultIndex, step, matchingIndexes.length);
    setResultIndex(next);
    messageList.current?.scrollToIndex({
      index: matchingIndexes[next],
      align: 'center',
      behavior: 'auto',
    });
  }
  function startWordSearch(word: string) {
    if (search === word && searchMode === 'word' && tab === 'chat') {
      navigateSearch(1);
      return;
    }
    setSearchMode('word');
    setSearch(word);
    setResultIndex(0);
    setTab('chat');
  }
  const mediaMessages = useMemo(
    () => scopedMessages.filter((m) => mediaName(m.text)),
    [scopedMessages],
  );
  const visibleMedia = useMemo(
    () => sortByTimestamp(filterMessages(mediaMessages, { kind: mediaFilter }), mediaSort),
    [mediaMessages, mediaFilter, mediaSort],
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
    setEditing(false);
    setSearchMode('text');
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
  async function editConversation(name: string, avatar?: Blob) {
    const id = chat.id;
    await saveConversationProfile(id, name, avatar);
    setChats((previous) => previous.map((c) => (c.id === id ? { ...c, name, avatar } : c)));
    setEditing(false);
    setNotice('Conversation name and photo saved.');
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
        <div className="sidebar-heading">
          <Logo />
          <AppearanceControl value={appearance} onChange={setAppearance} />
        </div>
        <button className="new-import" onClick={() => openImport()}>
          <Plus size={18} />
          Import a conversation<span>⌘ I</span>
        </button>
        <div className="nav-label">YOUR COLLECTION</div>
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
            .map((c) => (
              <button
                className={`chat-card ${c.id === chat?.id ? 'selected' : ''}`}
                key={c.id}
                onClick={() => select(c.id)}
              >
                <ConversationAvatar chat={c} />
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
      </aside>
      <main className="main">
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
              sortOrder={mediaSort}
              onSortChange={setMediaSort}
            />
          ) : !chat.id ? (
            <div className="welcome-empty">
              <span className="modal-icon">
                <MessagesSquare size={30} />
              </span>
              <h2>Your conversations.</h2>
              <p>
                Import your WhatsApp export to explore messages,
                <br />
                relive your media and discover your conversation’s story.
              </p>
              <button className="primary-button" onClick={() => openImport()}>
                <Plus size={17} />
                Import your first conversation
              </button>
            </div>
          ) : (
            <>
              <div className="conversation-main" key={chat.id + chat.updatedAt}>
                <header className="conversation-header">
                  <button
                    className="avatar-edit"
                    aria-label="Edit conversation photo and name"
                    onClick={() => setEditing(true)}
                  >
                    <ConversationAvatar chat={chat} />
                  </button>
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
                      aria-label="Edit conversation"
                      onClick={() => setEditing(true)}
                    >
                      <PencilLine size={18} />
                    </button>
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
                          <button
                            onClick={() => {
                              setMenu(false);
                              setEditing(true);
                            }}
                          >
                            <PencilLine size={15} />
                            Edit conversation
                          </button>
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
                <div className="conversation-content">
                  <div className="conversation-view">
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
                            ref={searchInput}
                            placeholder="Search messages, words, or people…"
                            value={search}
                            onChange={(e) => {
                              setSearchMode('text');
                              setSearch(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                navigateSearch(e.shiftKey ? -1 : 1);
                              }
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                setSearch('');
                              }
                            }}
                          />
                          {search && (
                            <>
                              <span className="search-count" aria-live="polite">
                                {matchingIndexes.length
                                  ? number(Math.min(resultIndex + 1, matchingIndexes.length))
                                  : 0}{' '}
                                / {number(matchingIndexes.length)}
                              </span>
                              <button
                                className="icon-button"
                                disabled={!matchingIndexes.length}
                                aria-label="Previous search result"
                                title="Previous result (Shift+Enter)"
                                onClick={() => navigateSearch(-1)}
                              >
                                <ChevronUp size={17} />
                              </button>
                              <button
                                className="icon-button"
                                disabled={!matchingIndexes.length}
                                aria-label="Next search result"
                                title="Next result (Enter)"
                                onClick={() => navigateSearch(1)}
                              >
                                <ChevronDown size={17} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label="Clear search"
                                onClick={() => setSearch('')}
                              >
                                <X size={15} />
                              </button>
                            </>
                          )}
                          <span className="search-hint">⌘ K</span>
                        </div>
                        {chat.ambiguous && (
                          <div className="demo-notice">
                            Dates interpreted as day/month/year. If incorrect, reimport using
                            month/day/year.
                          </div>
                        )}
                        <div className="message-area">
                          {scopedMessages.length && (!search.trim() || matchingIndexes.length) ? (
                            <Virtuoso
                              key={chat.id + selectedDay}
                              ref={messageList}
                              style={{ height: '100%' }}
                              data={scopedMessages}
                              initialTopMostItemIndex={
                                search.trim() && matchingIndexes.length
                                  ? matchingIndexes[0]
                                  : selectedDay
                                    ? 0
                                    : Math.max(0, scopedMessages.length - 14)
                              }
                              itemContent={(index, m) => (
                                <div
                                  className={`message-row-wrap ${search.trim() && matchSet.has(index) ? 'search-match' : ''} ${search.trim() && index === activeMatch ? 'search-current' : ''}`}
                                >
                                  {(index === 0 ||
                                    new Date(scopedMessages[index - 1].timestamp).toDateString() !==
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
                                    <div className="system-message">
                                      <HighlightedText
                                        text={m.text}
                                        query={search.trim()}
                                        wholeWord={searchMode === 'word'}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className={`message-row ${m.sender === me ? 'outgoing' : ''}`}
                                    >
                                      <div className="bubble">
                                        {allPeople.length > 2 && (
                                          <span className="sender">
                                            <HighlightedText
                                              text={m.sender}
                                              query={search.trim()}
                                              wholeWord={searchMode === 'word'}
                                            />
                                          </span>
                                        )}
                                        <MessageBody
                                          message={m}
                                          chatId={chat.id}
                                          highlight={search.trim()}
                                          wholeWord={searchMode === 'word'}
                                        />
                                        {mediaName(m.text) && (
                                          <FavoriteButton
                                            active={currentFavorites.media.includes(
                                              mediaName(m.text)!,
                                            )}
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
                          <span>This is your archive.</span>
                          <span className="read-only">READ ONLY</span>
                        </footer>
                      </>
                    ) : tab === 'media' ? (
                      <div className="media-panel">
                        <div className="section-heading">
                          <div>
                            <h3>All media</h3>
                            <p>Photos, videos, stickers and voice notes.</p>
                          </div>
                          <div className="media-heading-actions">
                            <span className="pill">{visibleMedia.length} files</span>
                            <MediaSort value={mediaSort} onChange={setMediaSort} />
                          </div>
                        </div>
                        <div
                          className="media-filters"
                          role="group"
                          aria-label="Filter media by type"
                        >
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
                            style={{ flex: 1, minHeight: 0 }}
                            key={chat.id + selectedDay + mediaFilter + mediaSort}
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
                                    onClick={() =>
                                      toggleFavorite(chat.id, 'media', mediaName(m.text)!)
                                    }
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
                            <h3>Insights</h3>
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
                              new Set(
                                scopedMessages.map((m) => new Date(m.timestamp).toDateString()),
                              ).size,
                            )}
                            label="Days with a conversation"
                          />
                        </div>
                        <ConversationStats data={insights} />
                        <div className="insight-box">
                          <h3>Messages by hour of the day</h3>
                          <div className="hour-chart">
                            {stats.hours.map((n: number, i: number) => (
                              <div
                                className="hour-column"
                                key={i}
                                title={`${i}:00 · ${n} messages`}
                              >
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
                              placeholder="Try ‘love’"
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
                    <ConversationDetails
                      stats={stats}
                      messageCount={messageCount}
                      onWord={startWordSearch}
                      onInsights={() => setTab('insights')}
                      onClose={() => setShowInfo(false)}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </section>
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
      {editing && chat.id && (
        <ConversationEditor
          chat={chat}
          onSave={editConversation}
          onClose={() => setEditing(false)}
        />
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
            <h2 id="import-title">
              {importTarget
                ? 'Keep your conversation up to date.'
                : 'Bring your conversations.'}
            </h2>
            <p>
              {importTarget
                ? 'Import a later export. Overlapping messages are merged, and earlier history, media and favorites are kept.'
                : 'Export a WhatsApp chat with media, then choose the ZIP or folder.'}
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
