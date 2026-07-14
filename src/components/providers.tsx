"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Segment = "b2c" | "b2b";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  stock: number;
  qty: number;
};

type SessionUser = {
  userId: number;
  email: string;
  name: string;
  role: "customer" | "manager" | "admin";
  segment: Segment;
  b2bStatus: "none" | "pending" | "approved" | "rejected";
  canUseWholesale: boolean;
} | null;

type StoreState = {
  segment: Segment;
  setSegment: (segment: Segment) => void;
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
  cartTotal: number;
};

const StoreContext = createContext<StoreState | null>(null);
const CART_KEY = "gs_cart_v2";
const FAV_KEY = "gs_favorites_v1";
const COMPARE_KEY = "gs_compare_v1";
const SEGMENT_KEY = "gs_segment_v1";

function readLocal<T>(key: string, fallback: T): T {
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
    // Browser storage is read only after hydration to keep SSR deterministic.
    queueMicrotask(() => {
      setSegmentState(readLocal(SEGMENT_KEY, "b2c" as Segment));
      setCart(readLocal(CART_KEY, [] as CartItem[]));
      setFavorites(readLocal(FAV_KEY, [] as number[]));
      setCompare(readLocal(COMPARE_KEY, [] as number[]));
      setHydrated(true);
    });
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
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to read session");
      const data = await res.json();
      setUser(data.user ?? null);
      if (data.user?.canUseWholesale) setSegmentState("b2b");
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void refreshUser(); });
  }, [refreshUser]);

  const setSegment = useCallback((nextSegment: Segment) => {
    // This changes a browsing preference only. Product prices always come from the server.
    setSegmentState(nextSegment);
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const safeQty = Math.max(1, Math.min(Math.floor(qty), item.stock || 99));
    setCart((previous) => {
      const existing = previous.find((product) => product.productId === item.productId);
      if (existing) {
        return previous.map((product) =>
          product.productId === item.productId
            ? { ...product, qty: Math.min(product.qty + safeQty, product.stock || 99), unitPrice: item.unitPrice }
            : product
        );
      }
      return [...previous, { ...item, qty: safeQty }];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((productId: number, qty: number) => {
    setCart((previous) =>
      previous.map((product) => product.productId === productId
        ? { ...product, qty: Math.max(1, Math.min(Math.floor(qty), product.stock || 99)) }
        : product)
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((previous) => previous.filter((product) => product.productId !== productId));
  }, []);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleFavorite = useCallback((productId: number) => {
    setFavorites((previous) => previous.includes(productId) ? previous.filter((id) => id !== productId) : [...previous, productId]);
  }, []);
  const toggleCompare = useCallback((productId: number) => {
    setCompare((previous) => {
      if (previous.includes(productId)) return previous.filter((id) => id !== productId);
      return previous.length >= 4 ? previous : [...previous, productId];
    });
  }, []);
  const clearCompare = useCallback(() => setCompare([]), []);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  const value: StoreState = {
    segment, setSegment, cart, addToCart, updateQty, removeFromCart, clearCart,
    cartOpen, setCartOpen, favorites, toggleFavorite, compare, toggleCompare, clearCompare,
    user, refreshUser, cartCount, cartTotal,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within AppProviders");
  return context;
}
