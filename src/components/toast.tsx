"use client";
import { useEffect, useState, useRef } from "react";
import { ToastProps } from "./types";

export default function Toast({
  message,
  isVisible,
  onClose,
  duration = 2000,
  position = "default"
}: ToastProps) {
  const [show, setShow] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onCloseRef up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Clear any existing timers
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isVisible) {
      // Small delay to trigger slide-in animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShow(true);
        });
      });

      // Start hide animation after duration
      hideTimerRef.current = setTimeout(() => {
        setShow(false);

        // Call onClose after animation completes
        closeTimerRef.current = setTimeout(() => {
          onCloseRef.current();
        }, 500);
      }, duration);
    } else {
      setShow(false);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [isVisible, duration]);

  if (!isVisible && !show) return null;

  // Different styles based on position
  const isEditor = position === "editor";

  return (
    <div
      className={`absolute bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl transition-all duration-500 z-[100] ${
        isEditor
          ? `right-3 ${show ? "top-3 opacity-100 scale-100" : "-top-20 opacity-0 scale-90"}`
          : `top-20 right-6 ${show ? "opacity-100" : "opacity-0"}`
      }`}
      style={isEditor ? {
        transform: show ? "translateY(0) scale(1)" : "translateY(-100px) scale(0.9)"
      } : undefined}
    >
      <div className="flex items-center gap-3">
        <svg
          className={`${isEditor ? "w-7 h-7" : "w-5 h-5"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className={`font-bold ${isEditor ? "text-xl" : "text-base"}`}>
          {message}
        </span>
      </div>
    </div>
  );
}
