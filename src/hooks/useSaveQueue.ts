"use client";

import { useRef, useCallback, useEffect } from "react";

interface SaveQueueOptions {
  onSaving: () => void;
  onSaved: () => void;
  onError: (retryCount: number) => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * A save queue that ensures no content is lost on save failure.
 * Queues the latest content and retries with exponential backoff.
 */
export function useSaveQueue(
  saveFn: (content: string) => Promise<void>,
  options: SaveQueueOptions
) {
  const { onSaving, onSaved, onError, maxRetries = 5, retryDelay = 2000 } = options;

  const pendingContentRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isSavingRef.current || pendingContentRef.current === null) return;

    const content = pendingContentRef.current;
    pendingContentRef.current = null;
    isSavingRef.current = true;
    onSaving();

    try {
      await saveFn(content);
      if (unmountedRef.current) return;
      retryCountRef.current = 0;
      onSaved();
      isSavingRef.current = false;

      // Process any content that arrived during save
      if (pendingContentRef.current !== null) {
        processQueue();
      }
    } catch {
      if (unmountedRef.current) return;
      isSavingRef.current = false;
      retryCountRef.current++;

      if (retryCountRef.current <= maxRetries) {
        // Re-queue the content for retry (keep latest if new content arrived)
        if (pendingContentRef.current === null) {
          pendingContentRef.current = content;
        }
        onError(retryCountRef.current);

        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
        retryTimerRef.current = setTimeout(() => {
          if (!unmountedRef.current) processQueue();
        }, delay);
      } else {
        // Max retries exceeded — keep content in queue, notify user
        pendingContentRef.current = content;
        onError(retryCountRef.current);
      }
    }
  }, [saveFn, onSaving, onSaved, onError, maxRetries, retryDelay]);

  const enqueue = useCallback(
    (content: string) => {
      pendingContentRef.current = content;
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      processQueue();
    },
    [processQueue]
  );

  const hasPending = useCallback(() => {
    return pendingContentRef.current !== null || isSavingRef.current;
  }, []);

  return { enqueue, hasPending };
}
