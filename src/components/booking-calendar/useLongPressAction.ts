import { useCallback, useEffect, useRef, useState } from "react";

export interface LongPressSnapshot {
  clientX: number;
  clientY: number;
  element: HTMLElement;
  pointerType: string;
  trigger: "longpress" | "contextmenu";
}

interface UseLongPressActionOptions {
  enabled?: boolean;
  delay?: number;
  moveThreshold?: number;
  onLongPress: (snapshot: LongPressSnapshot) => void;
}

const DEFAULT_DELAY_MS = 420;
const DEFAULT_MOVE_THRESHOLD_PX = 12;

export function useLongPressAction({
  enabled = true,
  delay = DEFAULT_DELAY_MS,
  moveThreshold = DEFAULT_MOVE_THRESHOLD_PX,
  onLongPress,
}: UseLongPressActionOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [isPressing, setIsPressing] = useState(false);

  const cancelPendingPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    setIsPressing(false);
  }, []);

  useEffect(() => cancelPendingPress, [cancelPendingPress]);

  const queueLongPress = useCallback(
    (snapshot: Omit<LongPressSnapshot, "trigger">) => {
      cancelPendingPress();
      startRef.current = { x: snapshot.clientX, y: snapshot.clientY };
      setIsPressing(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        startRef.current = null;
        setIsPressing(false);
        suppressClickRef.current = true;
        onLongPress({ ...snapshot, trigger: "longpress" });
      }, delay);
    },
    [cancelPendingPress, delay, onLongPress],
  );

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (typeof event.button === "number" && event.button !== 0) return;

      queueLongPress({
        clientX: event.clientX,
        clientY: event.clientY,
        element: event.currentTarget,
        pointerType: event.pointerType || "mouse",
      });
    },
    [enabled, queueLongPress],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!timerRef.current || !startRef.current) return;

      const deltaX = Math.abs(event.clientX - startRef.current.x);
      const deltaY = Math.abs(event.clientY - startRef.current.y);
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        cancelPendingPress();
      }
    },
    [cancelPendingPress, moveThreshold],
  );

  const onPointerUp = useCallback(() => {
    if (timerRef.current) {
      cancelPendingPress();
    } else {
      setIsPressing(false);
    }
  }, [cancelPendingPress]);

  const onPointerCancel = useCallback(() => {
    cancelPendingPress();
  }, [cancelPendingPress]);

  const onPointerLeave = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") {
        cancelPendingPress();
      }
    },
    [cancelPendingPress],
  );

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!enabled) return;

      event.preventDefault();
      cancelPendingPress();
      suppressClickRef.current = true;
      onLongPress({
        clientX: event.clientX,
        clientY: event.clientY,
        element: event.currentTarget,
        pointerType: "mouse",
        trigger: "contextmenu",
      });
    },
    [cancelPendingPress, enabled, onLongPress],
  );

  return {
    isPressing,
    consumeSuppressedClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
      onContextMenu,
    },
  };
}
