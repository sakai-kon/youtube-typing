import type { TypingMap } from './types';

const KEY = 'youtube-typing:maps:v1';

export function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function loadMaps(): TypingMap[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as TypingMap[];
  } catch {
    return [];
  }
}

export function saveMap(map: TypingMap): void {
  const maps = loadMaps();
  const next = [map, ...maps.filter((item) => item.id !== map.id)];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteMap(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadMaps().filter((map) => map.id !== id)));
}

export function findMap(id: string): TypingMap | undefined {
  return loadMaps().find((map) => map.id === id);
}

export function exportMap(map: TypingMap): void {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${map.title || 'typing-map'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
