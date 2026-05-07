"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "slopwerk-cookie-consent";

export function CookieBanner() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) !== "accepted") {
      setShown(true);
    }
  }, []);

  if (!shown) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie-Einwilligung">
      <small>
        Wir verwenden technisch notwendige Cookies. Mehr Infos in der Datenschutzerklärung.
      </small>
      <button
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setShown(false);
        }}
      >
        OK
      </button>
    </div>
  );
}
