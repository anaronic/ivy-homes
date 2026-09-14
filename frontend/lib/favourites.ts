const KEY = "ivy_favourites";

export function getFavouriteIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function isFavourited(id: string): boolean {
  return getFavouriteIds().includes(id);
}

export function addFavourite(id: string) {
  const ids = new Set(getFavouriteIds());
  ids.add(id);
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function removeFavourite(id: string) {
  const ids = getFavouriteIds().filter((x) => x !== id);
  localStorage.setItem(KEY, JSON.stringify(ids));
}