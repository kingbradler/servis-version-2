"use client";

import { useEffect } from "react";

/**
 * Prevent background scroll while a mobile drawer/sheet is open.
 *
 * On verrouille <html> (et non <body>) : <html> a `overflow-x: clip` dans
 * globals.css, donc un `overflow: hidden` sur <body> le transforme en zone de
 * défilement et fait perdre à la barre `sticky` sa position à l'écran.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [locked]);
}
