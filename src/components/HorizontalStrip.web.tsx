import { useEffect, useRef, type ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

// Web counterpart of HorizontalStrip — the native file is a plain horizontal
// ScrollView, which on a desktop browser is close to unusable:
//
//  - a mouse wheel only scrolls a horizontal container with shift held;
//  - click-and-drag doesn't pan a scroll container at all (that's touch);
//  - and with showsHorizontalScrollIndicator off there is no visible bar to
//    grab either.
//
// The net effect was a row that genuinely could not be scrolled with a mouse,
// which is how it was reported. This adds the two interactions a desktop user
// actually reaches for — wheel and drag — without touching native, where both
// already work via touch.
interface Props {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Style for the scroll container itself, not its content — used to cancel
   *  a card's padding so the strip can bleed to its edges. */
  style?: StyleProp<ViewStyle>;
}

// Below this the pointer is treated as a click, not a drag, so a stray
// wobble while pressing doesn't nudge the row.
const DRAG_THRESHOLD_PX = 3;

// scrollWidth/clientWidth are rounded integers while scrollLeft can settle on
// a fractional value, so "am I at the end" is never an exact equality. Without
// this tolerance the row stayed one sub-pixel short of its own maximum, kept
// claiming the wheel, and the page underneath would not scroll on past it.
const EDGE_TOLERANCE_PX = 1;

export default function HorizontalStrip({ children, contentContainerStyle, style }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const instance = scrollRef.current as (ScrollView & { getScrollableNode?: () => unknown }) | null;
    const node = instance?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node) return;

    node.style.cursor = "grab";

    const maxScroll = () => node.scrollWidth - node.clientWidth;

    function onWheel(event: WheelEvent) {
      const max = maxScroll();
      if (max <= 0) return;
      // Trackpads send horizontal intent as deltaX; a wheel only has deltaY,
      // so fall back to it. Taking whichever axis is larger keeps a diagonal
      // trackpad gesture from fighting itself.
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      // At either end, let the event through so the page keeps scrolling
      // vertically instead of the row swallowing the gesture.
      const atStart = node!.scrollLeft <= EDGE_TOLERANCE_PX;
      const atEnd = node!.scrollLeft >= max - EDGE_TOLERANCE_PX;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      node!.scrollLeft = Math.max(0, Math.min(max, node!.scrollLeft + delta));
    }

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    function onPointerDown(event: PointerEvent) {
      // Touch and pen already pan natively — hijacking them would break
      // momentum scrolling on a real phone running the web build.
      if (event.pointerType !== "mouse") return;
      if (maxScroll() <= 0) return;
      dragging = true;
      startX = event.clientX;
      startScrollLeft = node!.scrollLeft;
      node!.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      // Stops the browser turning the drag into a text/image selection.
      event.preventDefault();
      node!.scrollLeft = startScrollLeft - dx;
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      node!.style.cursor = "grab";
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("pointerdown", onPointerDown);
    // On window, not the node, so a drag that leaves the row still tracks and
    // still ends when the button comes up somewhere else.
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
}
