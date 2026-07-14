"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Segment = "b2c" | "b2b";
export type CartItem = { productId: number; slug: string; name: string; image: string | null; unitPrice: number; stock: number; qty: number };
export type SessionUser = { userId: number; email: string; name: string; role: "customer" | "manager" | "admin"; segment: Segment; b2bStatus: "none" | "pending" | "approved" | "rejected"; canUseWholesale: boolean } | null;

type StoreState = {
  segment: Segment; setSegment: (segment: Segment) => void;
  cart: CartItem[]; addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void; updateQty: (productId: number, qty: number) => void; removeFromCart: (productId: number) => void; clearCart: () => void;
  cartOpen: boolean; setCartOpen: (open: boolean) => void;
  favorites: number[]; toggleFavorite: (productId: number) => void;
  compare: number[]; toggleCompare: (productId: number) => void; clearCompare: () => void;
  user: SessionUser; refreshUser: () => Promise<void>; cartCount: number; cartTotal: number;
};

const StoreContext = createContext<StoreState | null>(null);
const CART_KEY = "gs_cart_v2";
const FAV_KEY = "gs_favorites_v1";
const COMPARE_KEY = "gs_compare_v1";
const SEGMENT_KEY = "gs_segment_v1";

function readLocal<T>(key: string, fallback: T): T {
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

async function jsonOrNull(response: Response | Promise<Response>) {
  const resolved = await response;
  if (!resolved.ok) return null;
  return resolved.json();
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [segment, setSegmentState] = useState<Segment>("b2c");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compare, setCompare] = useState<number[]>([]);
  const [user, setUser] = useState<SessionUser>(null);
  const [hydrated, setHydrated] = useState(false);
  const syncedUserId = useRef<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSegmentState(readLocal(SEGMENT_KEY, "b2c" as Segment));
      setCart(readLocal(CART_KEY, [] as CartItem[]));
      setFavorites(readLocal(FAV_KEY, [] as number[]));
      setCompare(readLocal(COMPARE_KEY, [] as number[]));
      setHydrated(true);
    });
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compare)); }, [compare, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(SEGMENT_KEY, segment); }, [segment, hydrated]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await jsonOrNull(await fetch("/api/auth/me", { cache: "no-store" }));
      setUser(data?.user ?? null);
      if (data?.user?.canUseWholesale) setSegmentState("b2b");
    } catch { setUser(null); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void refreshUser(); }); }, [refreshUser]);

  // On first authenticated visit merge only guest data. Later item-level actions
  // update the server directly, so a second device is never wiped by an empty local cache.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { syncedUserId.current = null; return; }
    if (syncedUserId.current === user.userId) return;
    syncedUserId.current = user.userId;
    const guestCart = cart.map(({ productId, qty }) => ({ productId, qty }));
    const guestFavorites = favorites;
    async function mergeGuestState() {
      const [cartData, favoritesData] = await Promise.all([
        jsonOrNull(fetch("/api/cart/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: guestCart }) })),
        jsonOrNull(fetch("/api/favorites/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: guestFavorites }) })),
      ]);
      if (cartData?.items) setCart(cartData.items);
      if (favoritesData?.items) setFavorites(favoritesData.items);
    }
    void mergeGuestState();
  }, [favorites, hydrated, cart, user]);

  const setSegment = useCallback((nextSegment: Segment) => setSegmentState(nextSegment), []);

  const addToCart = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const safeQty = Math.max(1, Math.min(Math.floor(qty), item.stock || 99));
    setCart((previous) => {
      const existing = previous.find((product) => product.productId === item.productId);
      return existing
        ? previous.map((product) => product.productId === item.productId ? { ...product, qty: Math.min(product.qty + safeQty, product.stock || 99), unitPrice: item.unitPrice } : product)
        : [...previous, { ...item, qty: safeQty }];
    });
    if (user) void jsonOrNull(fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.productId, qty: safeQty }) })).then((data) => { if (data?.items) setCart(data.items); });
    setCartOpen(true);
  }, [user]);

  const updateQty = useCallback((productId: number, qty: number) => {
    const safeQty = Math.max(1, Math.floor(qty));
    setCart((previous) => previous.map((product) => product.productId === productId ? { ...product, qty: Math.min(safeQty, product.stock || 99) } : product));
    if (user) void jsonOrNull(fetch(`/api/cart/${productId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qty: safeQty }) })).then((data) => { if (data?.items) setCart(data.items); });
  }, [user]);

  const removeFromCart = useCallback((productId: number) => {
    setCart((previous) => previous.filter((product) => product.productId !== productId));
    if (user) void jsonOrNull(fetch(`/api/cart/${productId}`, { method: "DELETE" })).then((data) => { if (data?.items) setCart(data.items); });
  }, [user]);

  const clearCart = useCallback(() => {
    setCart([]);
    if (user) void fetch("/api/cart", { method: "DELETE" });
  }, [user]);

  const toggleFavorite = useCallback((productId: number) => {
    const wasFavorite = favorites.includes(productId);
    setFavorites((previous) => wasFavorite ? previous.filter((id) => id !== productId) : [...previous, productId]);
    if (user) void fetch(wasFavorite ? `/api/favorites/${productId}` : "/api/favorites", {
      method: wasFavorite ? "DELETE" : "POST", headers: wasFavorite ? undefined : { "Content-Type": "application/json" }, body: wasFavorite ? undefined : JSON.stringify({ productId }),
    }).then(async (response) => { if (!response.ok) { const latest = await jsonOrNull(fetch("/api/favorites")); if (latest?.items) setFavorites(latest.items); } });
  }, [favorites, user]);

  const toggleCompare = useCallback((productId: number) => setCompare((previous) => previous.includes(productId) ? previous.filter((id) => id !== productId) : previous.length >= 4 ? previous : [...previous, productId]), []);
  const clearCompare = useCallback(() => setCompare([]), []);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  const value: StoreState = { segment, setSegment, cart, addToCart, updateQty, removeFromCart, clearCart, cartOpen, setCartOpen, favorites, toggleFavorite, compare, toggleCompare, clearCompare, user, refreshUser, cartCount, cartTotal };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within AppProviders");
  return context;
}
