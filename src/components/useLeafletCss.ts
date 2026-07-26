import { useEffect } from "react";
import { LEAFLET_CSS } from "./leafletCss";

// Injects the vendored Leaflet stylesheet once per document — see
// leafletCss.ts's header for why it's vendored-and-injected rather than
// imported or CDN-linked. Both web maps (JourneyMap.web.tsx,
// LocationPickerMap.web.tsx) had a byte-identical copy of this effect plus
// its own private copy of the element id; a single hook keeps them from
// drifting into two different ids and injecting the stylesheet twice.
const LEAFLET_STYLE_ID = "leaflet-vendored-css";

export default function useLeafletCss(): void {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(LEAFLET_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = LEAFLET_STYLE_ID;
    style.textContent = LEAFLET_CSS;
    document.head.appendChild(style);
  }, []);
}
