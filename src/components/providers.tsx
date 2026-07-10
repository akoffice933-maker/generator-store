"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Segment = "b2c" | "b2b";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  priceRetail: number;
  priceWholesale: number;
  qty: number;
  stock: number;
};

export type SessionUser = {
  userId: number;
  email: string;
  name: string;
  role: "customer" | "manager" | "admin";
  segment: Segment;
} | null;

type StoreState = {
  segment: Segment;
  setSegment: (s: Segment) => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  updateQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  favorites: number[];
  toggleFavorite: (productId: number) => void;
  compare: number[];
  toggleCompare: (productId: number) => void;
  clearCompare: () => void;
  user: SessionUser;
  refreshUser: () => Promise<void>;
  cartCount: number;
  cartTotal: (segment: Segment) => number;
};

const StoreContext = createContext<StoreState | null>(null);

const CART_KEY = "gs_cart_v1";
const FAV_KEY = "gs_favorites_v1";
const COMPARE_KEY = "gs_compare_v1";
const SEGMENT_KEY = "gs_segment_v1";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [segment, setSegmentState] = useState<Segment>("b2c");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compare, setCompare] = useState<number[]>([]);
  const [user, setUser] = useState<SessionUser>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSegmentState(readLocal(SEGMENT_KEY, "b2c" as Segment));
    setCart(readLocal(CART_KEY, [] as CartItem[]));
    setFavorites(readLocal(FAV_KEY, [] as number[]));
    setCompare(readLocal(COMPARE_KEY, [] as number[]));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
  }, [compare, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(SEGMENT_KEY, segment);
  }, [segment, hydrated]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.segment) setSegmentState(data.user.segment);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const setSegment = useCallback((s: Segment) => setSegmentState(s), []);

  const addToCart = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.productId ? { ...p, qty: Math.min(p.qty + qty, p.stock || 99) } : p
        );
      }
      return [...prev, { ...item, qty }];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((productId: number, qty: number) => {
    setCart((prev) =>
      prev
        .map((p) => (p.productId === productId ? { ...p, qty: Math.max(1, Math.min(qty, p.stock || 99)) } : p))
        .filter((p) => p.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleFavorite = useCallback((productId: number) => {
    setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  }, []);

  const toggleCompare = useCallback((productId: number) => {
    setCompare((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= 4) return prev;
      return [...prev, productId];
    });
  }, []);

  const clearCompare = useCallback(() => setCompare([]), []);

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);
  const cartTotal = useCallback(
    (seg: Segment) => cart.reduce((sum, i) => sum + (seg === "b2b" ? i.priceWholesale : i.priceRetail) * i.qty, 0),
    [cart]
  );

  const value: StoreState = {
    segment,
    setSegment,
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartOpen,
    setCartOpen,
    favorites,
    toggleFavorite,
    compare,
    toggleCompare,
    clearCompare,
    user,
    refreshUser,
    cartCount,
    cartTotal,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppProviders");
  return ctx;
}
