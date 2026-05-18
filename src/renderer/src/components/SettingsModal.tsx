import { useCallback, useState } from "react";
import { PASTE_SLOT_DISPLAY } from "@shared/hotkey";
import type { AppSettings } from "@shared/types";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { IconX } from "./icons";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings | null;
  hotkeyError?: string | null;
  onClose: () => void;
  onUpdate: (partial: Partial<AppSettings>) => Promise<unknown>;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function SettingsModal({
  open,
  settings,
  hotkeyError,
  onClose,
  onUpdate,
  onExport,
  onImport,
  onClear,
}: SettingsModalProps) {
  const [ignoreDraft, setIgnoreDraft] = useState<string | null>(null);

  const ignoreValue = ignoreDraft ?? settings?.ignorePatterns.join("\n") ?? "";

  const saveIgnore = useCallback(() => {
    if (ignoreDraft === null) return;
    void onUpdate({
      ignorePatterns: ignoreDraft.split("\n").filter(Boolean),
    });
    setIgnoreDraft(null);
  }, [ignoreDraft, onUpdate]);

  if (!open || !settings) return null;

  return (
    <div className="no-drag modal-scrim absolute inset-0 z-40 flex items-stretch justify-end">
      <div className="settings-panel">
        <div className="settings-header">
          <h2 className="text-[13px] font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn icon-btn-sm"
            aria-label="Close"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="settings-body">
          <SettingRow label="Auto paste">
            <MiniToggle
              checked={settings.autoPaste}
              onChange={(v) => void onUpdate({ autoPaste: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            {PASTE_SLOT_DISPLAY} global paste slots. ⌘⌥+numbers are unreliable
            on macOS — Clippy uses ⌘⌃ instead. Requires Accessibility
            permission.
          </p>
          <SettingRow label="Hide on blur">
            <MiniToggle
              checked={settings.hideOnBlur}
              onChange={(v) => void onUpdate({ hideOnBlur: v })}
            />
          </SettingRow>
          <SettingRow label="Launch at login">
            <MiniToggle
              checked={settings.launchAtLogin}
              onChange={(v) => void onUpdate({ launchAtLogin: v })}
            />
          </SettingRow>

          <div className="settings-divider" />

          <SettingRow label="Max history">
            <input
              type="number"
              min={50}
              max={5000}
              value={settings.maxHistory}
              onChange={(e) =>
                void onUpdate({ maxHistory: Number(e.target.value) })
              }
              className="settings-input settings-input-narrow"
            />
          </SettingRow>

          <SettingRow label="Toggle shortcut" stacked>
            <HotkeyRecorder
              value={settings.toggleShortcut}
              onChange={(accel) => void onUpdate({ toggleShortcut: accel })}
              error={hotkeyError}
            />
          </SettingRow>

          <div className="settings-divider" />

          <label className="settings-stacked-label">
            <span>Ignore patterns (regex per line)</span>
            <textarea
              rows={3}
              value={ignoreValue}
              onChange={(e) => setIgnoreDraft(e.target.value)}
              onBlur={saveIgnore}
              className="settings-textarea"
            />
          </label>

          <div className="settings-actions">
            <button type="button" onClick={onExport} className="settings-btn">
              Export
            </button>
            <button type="button" onClick={onImport} className="settings-btn">
              Import
            </button>
            <button
              type="button"
              onClick={onClear}
              className="settings-btn settings-btn-danger"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  children,
  stacked,
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="settings-row-stacked">
        <span className="settings-label">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      {children}
    </div>
  );
}

function MiniToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`mini-toggle ${checked ? "mini-toggle-on" : ""}`}
    >
      <span className="mini-toggle-knob" />
    </button>
  );
}
