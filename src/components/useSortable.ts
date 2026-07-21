import { useState } from 'react';

const LONG_PRESS_DELAY = 350; // ms — touch only
const MOVE_CANCEL_PX  = 6;   // px — cancel long-press if user is scrolling

/**
 * Pointer-event drag-to-reorder hook.
 *
 * Mouse:  drag starts immediately on pointerdown.
 * Touch:  requires a 350 ms long-press; moving > 6 px before the timer fires
 *         cancels drag so normal page scroll still works.
 *
 * Uses native DOM listeners (not React synthetic events) for pointermove /
 * pointerup — React's event delegation does not reliably receive captured
 * pointer events on mobile, especially after DOM mutations.
 *
 * The DOM is NOT reordered during drag to avoid pointer-capture loss on mobile.
 * Instead, `over` is returned so the caller can render a drop indicator.
 */
export function useSortable(
  count: number,
  onReorder: (from: number, to: number) => void,
) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver]         = useState<number | null>(null);

  function handleProps(originalIndex: number): React.HTMLAttributes<HTMLElement> {
    return {
      onPointerDown(e) {
        const el      = e.currentTarget as HTMLElement;
        const row     = el.closest('[data-sortable-row]') as HTMLElement | null;
        const itemH   = row?.getBoundingClientRect().height ?? 44;
        const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
        const pid     = e.pointerId;

        const state = {
          from:        originalIndex,
          startY:      e.clientY,
          startX:      e.clientX,
          itemH,
          currentOver: originalIndex,
          active:      false,
          timer:       null as ReturnType<typeof setTimeout> | null,
        };

        function onMove(ev: PointerEvent) {
          if (!state.active) {
            // Cancel long-press if finger moved too much (user is scrolling)
            if (
              Math.abs(ev.clientX - state.startX) > MOVE_CANCEL_PX ||
              Math.abs(ev.clientY - state.startY) > MOVE_CANCEL_PX
            ) {
              cleanup();
            }
            return;
          }
          const delta   = ev.clientY - state.startY;
          const newOver = Math.max(0, Math.min(count - 1,
            Math.round(state.from + delta / state.itemH),
          ));
          state.currentOver = newOver;
          setOver(newOver);
        }

        function onUp() {
          if (state.timer) clearTimeout(state.timer);
          if (state.active) {
            el.releasePointerCapture(pid);
            if (state.from !== state.currentOver) {
              onReorder(state.from, state.currentOver);
            }
          }
          cleanup();
        }

        function cleanup() {
          el.removeEventListener('pointermove',   onMove);
          el.removeEventListener('pointerup',     onUp);
          el.removeEventListener('pointercancel', onUp);
          setDragging(null);
          setOver(null);
        }

        el.addEventListener('pointermove',   onMove);
        el.addEventListener('pointerup',     onUp);
        el.addEventListener('pointercancel', onUp);

        if (isTouch) {
          state.timer = setTimeout(() => {
            state.active = true;
            el.setPointerCapture(pid);
            setDragging(originalIndex);
            setOver(originalIndex);
          }, LONG_PRESS_DELAY);
        } else {
          e.preventDefault();
          state.active = true;
          el.setPointerCapture(pid);
          setDragging(originalIndex);
          setOver(originalIndex);
        }
      },
    };
  }

  return { dragging, over, handleProps };
}
