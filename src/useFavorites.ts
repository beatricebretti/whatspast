import { useEffect, useRef, useState } from 'react';
import { allFavorites, saveFavorites } from './storage';
import type { FavoriteMap, Favorites } from './types';
export function useFavorites(onError: (message: string) => void) {
  const [favorites, setFavorites] = useState<FavoriteMap>({}),
    latest = useRef<FavoriteMap>({}),
    ready = useRef(false),
    pending = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    allFavorites()
      .then((saved) => {
        if (active) {
          latest.current = saved;
          setFavorites(saved);
          ready.current = true;
        }
      })
      .catch(() => onError('Could not load favorites from browser storage.'));
    return () => {
      active = false;
    };
  }, [onError]);
  function toggle(chatId: string, type: keyof Favorites, value: string) {
    if (!ready.current) {
      onError('Favorites are still loading. Please try again.');
      return;
    }
    const previous = latest.current[chatId] || { days: [], media: [] };
    const list = previous[type];
    const next = {
      ...previous,
      [type]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    };
    latest.current = { ...latest.current, [chatId]: next };
    setFavorites(latest.current);
    pending.current = pending.current
      .then(() => saveFavorites(chatId, next))
      .catch(() => {
        if (latest.current[chatId] === next) {
          latest.current = { ...latest.current, [chatId]: previous };
          setFavorites(latest.current);
        }
        onError('Could not save this favorite. Check available browser storage.');
      });
  }
  function forget(chatId: string) {
    const next = { ...latest.current };
    delete next[chatId];
    latest.current = next;
    setFavorites(next);
  }
  return { favorites, toggle, forget, flush: () => pending.current };
}
