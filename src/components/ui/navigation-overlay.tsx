"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PadelLoader } from "@/components/ui/padel-loader";

type NavigationOverlayContextValue = {
  startNavigation: () => void;
};

const NavigationOverlayContext = createContext<NavigationOverlayContextValue | null>(null);

const MIN_DURATION_MS = 300;
const FAILSAFE_DURATION_MS = 10000;

const isModifiedClick = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const isSamePageHashOnly = (url: URL) =>
  url.pathname === window.location.pathname &&
  url.search === window.location.search &&
  url.hash &&
  url.hash !== window.location.hash;

const isInternalNavigation = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const rawHref = anchor.getAttribute("href");
  if (!rawHref) return false;
  if (rawHref.startsWith("#")) return false;
  if (rawHref.startsWith("mailto:")) return false;
  if (rawHref.startsWith("tel:")) return false;
  if (rawHref.startsWith("javascript:")) return false;

  const url = new URL(rawHref, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (isSamePageHashOnly(url)) return false;
  return true;
};

export function NavigationOverlayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const failSafeTimeoutRef = useRef<number | null>(null);

  const routeKey = useMemo(
    () => `${pathname ?? ""}?${searchParams?.toString() ?? ""}`,
    [pathname, searchParams]
  );

  const clearFailSafe = useCallback(() => {
    if (failSafeTimeoutRef.current !== null) {
      window.clearTimeout(failSafeTimeoutRef.current);
      failSafeTimeoutRef.current = null;
    }
  }, []);

  const endNavigation = useCallback(() => {
    clearFailSafe();
    activeRef.current = false;
    setVisible(false);
  }, [clearFailSafe]);

  const startNavigation = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    startTimeRef.current = Date.now();
    setVisible(true);
    clearFailSafe();
    failSafeTimeoutRef.current = window.setTimeout(() => {
      endNavigation();
    }, FAILSAFE_DURATION_MS);
  }, [clearFailSafe, endNavigation]);

  useEffect(() => {
    if (!activeRef.current) return;
    const elapsed = Date.now() - (startTimeRef.current ?? 0);
    const remaining = Math.max(MIN_DURATION_MS - elapsed, 0);
    const timeout = window.setTimeout(() => {
      endNavigation();
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [endNavigation, routeKey]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (isModifiedClick(event)) return;
      const target = event.target as Element | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (!isInternalNavigation(anchor)) return;
      startNavigation();
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [startNavigation]);

  useEffect(() => {
    const handlePopState = () => {
      startNavigation();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [startNavigation]);

  return (
    <NavigationOverlayContext.Provider value={{ startNavigation }}>
      {children}
      {visible ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <PadelLoader size="xl" className="drop-shadow" />
          <span className="sr-only">Chargement en cours...</span>
        </div>
      ) : null}
    </NavigationOverlayContext.Provider>
  );
}

export function useNavigationOverlay(): NavigationOverlayContextValue {
  const context = useContext(NavigationOverlayContext);
  if (!context) {
    throw new Error("useNavigationOverlay must be used within NavigationOverlayProvider");
  }
  return context;
}
