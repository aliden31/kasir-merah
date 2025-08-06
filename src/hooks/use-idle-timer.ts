
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const useIdleTimer = (timeout: number, onIdle: () => void) => {
  const timeoutId = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onIdle, timeout);
  }, [onIdle, timeout]);

  const handleEvent = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Initial timer start
    resetTimer();

    // Add event listeners
    events.forEach(event => window.addEventListener(event, handleEvent));

    // Cleanup
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => window.removeEventListener(event, handleEvent));
    };
  }, [resetTimer, handleEvent]);
};

export default useIdleTimer;
