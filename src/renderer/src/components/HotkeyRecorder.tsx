import { useCallback, useEffect, useRef, useState } from "react";
import {
  keyEventToAccelerator,
  formatAcceleratorDisplay,
} from "@shared/hotkey";
import { cn } from "../lib/utils";

interface HotkeyRecorderProps {
  value: string;
  onChange: (accel: string) => void;
  error?: string | null;
}

export function HotkeyRecorder({
  value,
  onChange,
  error,
}: HotkeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const stopRecording = useCallback(() => setRecording(false), []);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        stopRecording();
        return;
      }

      const accel = keyEventToAccelerator(e);
      if (accel) {
        onChange(accel);
        stopRecording();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange, stopRecording]);

  return (
    <div className="space-y-1">
      <button
        ref={ref}
        type="button"
        onClick={() => setRecording(true)}
        className={cn(
          "hotkey-field w-full text-left",
          recording && "hotkey-field-recording",
          error && "hotkey-field-error",
        )}
      >
        {recording ? (
          <span className="text-[var(--accent)]">
            Press keys… (Esc to cancel)
          </span>
        ) : (
          <span className="font-mono text-[12px]">
            {formatAcceleratorDisplay(value) || value}
          </span>
        )}
      </button>
      {error && <p className="text-[10px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}
