import { useCallback, useEffect, useState } from "react";
import type { AppSettings, TodoList } from "@shared/types";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { useAccessibility } from "../hooks/useAccessibility";
import { usePlatform } from "../hooks/usePlatform";
import { IconX } from "./icons";
import { listLabel } from "../hooks/useTodos";

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
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const {
    status: accessibilityStatus,
    needsAccess,
    requesting,
    requestAccess,
  } = useAccessibility();
  const { pasteSlotLabel, isMac, platform } = usePlatform();

  const ignoreValue = ignoreDraft ?? settings?.ignorePatterns.join("\n") ?? "";

  useEffect(() => {
    if (!open) return;
    void window.clippy.listTodoLists().then(setTodoLists);
  }, [open]);

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
          {accessibilityStatus?.supported && (
            <>
              <SettingRow
                label={
                  platform === "linux" ? "Auto-paste tools" : "Accessibility"
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      needsAccess
                        ? "accessibility-pill accessibility-pill-warn"
                        : "accessibility-pill accessibility-pill-ok"
                    }
                  >
                    {needsAccess ? "Required" : "Enabled"}
                  </span>
                  {needsAccess && (
                    <button
                      type="button"
                      className="settings-action-btn"
                      disabled={requesting}
                      onClick={() => void requestAccess()}
                    >
                      {requesting ? "Opening…" : "Open Settings"}
                    </button>
                  )}
                </div>
              </SettingRow>
              {needsAccess && accessibilityStatus?.message && (
                <p className="settings-hint px-0.5 pb-1">
                  {accessibilityStatus.message}
                </p>
              )}
              <div className="settings-divider" />
            </>
          )}

          <SettingRow label="Auto paste">
            <MiniToggle
              checked={settings.autoPaste}
              onChange={(v) => void onUpdate({ autoPaste: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Panel only: when on, Enter/click pastes into the last app; when off,
            it only copies.
          </p>
          <SettingRow label="Global paste slots">
            <MiniToggle
              checked={settings.globalPasteSlots ?? true}
              onChange={(v) => void onUpdate({ globalPasteSlots: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Register {pasteSlotLabel} to paste history items 1–9 from anywhere.
            {isMac
              ? " macOS uses ⌘⌃ instead of ⌘⌥ for reliable global shortcuts."
              : " Uses Ctrl+Alt on Windows and Linux."}{" "}
            Turn off to unregister those shortcuts.
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

          <SettingRow label="Search sort">
            <select
              value={settings.searchSortMode ?? "hybrid"}
              onChange={(e) =>
                void onUpdate({
                  searchSortMode: e.target.value as
                    | "hybrid"
                    | "relevance"
                    | "recency",
                })
              }
              className="settings-input"
              style={{ width: 110, textAlign: "left" }}
            >
              <option value="hybrid">Hybrid</option>
              <option value="relevance">Relevance</option>
              <option value="recency">Recency</option>
            </select>
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Hybrid and relevance rank by match quality (pinned first). Recency
            is newest-first. Ties fall back to newest.
          </p>

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

          <p className="settings-section-label">Todos</p>

          <SettingRow label="Show completed">
            <MiniToggle
              checked={settings.todoShowCompleted ?? true}
              onChange={(v) => void onUpdate({ todoShowCompleted: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            When off, completed tasks are hidden in the All filter.
          </p>

          <SettingRow label="Reminders">
            <MiniToggle
              checked={settings.todoRemindersEnabled ?? true}
              onChange={(v) => void onUpdate({ todoRemindersEnabled: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            System notifications when a task reminder time is reached.
          </p>

          <SettingRow label="Reminder sound">
            <MiniToggle
              checked={settings.todoReminderSound ?? false}
              onChange={(v) => void onUpdate({ todoReminderSound: v })}
            />
          </SettingRow>

          <SettingRow label="Default list">
            <select
              value={settings.todoDefaultListId ?? "todo-list-inbox"}
              onChange={(e) =>
                void onUpdate({ todoDefaultListId: e.target.value })
              }
              className="settings-input"
              style={{ width: 140, textAlign: "left" }}
            >
              {(todoLists.length > 0
                ? todoLists
                : [
                    {
                      id: "todo-list-inbox",
                      name: "Inbox",
                      kind: "inbox" as const,
                      sortOrder: 0,
                      createdAt: 0,
                      updatedAt: 0,
                    },
                  ]
              ).map((list) => (
                <option key={list.id} value={list.id}>
                  {listLabel(list)}
                </option>
              ))}
            </select>
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Used for new tasks and Clip → Todo.
          </p>

          <SettingRow label="Auto-rotate lists">
            <MiniToggle
              checked={settings.todoRotateEnabled ?? true}
              onChange={(v) => void onUpdate({ todoRotateEnabled: v })}
            />
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Clear completed Daily and Weekly tasks at the rotate hour.
          </p>

          <SettingRow label="Rotate hour">
            <select
              value={settings.todoRotateHour ?? 0}
              onChange={(e) =>
                void onUpdate({ todoRotateHour: Number(e.target.value) })
              }
              className="settings-input"
              style={{ width: 110, textAlign: "left" }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h === 0
                    ? "12 AM"
                    : h < 12
                      ? `${h} AM`
                      : h === 12
                        ? "12 PM"
                        : `${h - 12} PM`}
                </option>
              ))}
            </select>
          </SettingRow>
          <p className="settings-hint px-0.5 pb-1">
            Local time when Daily and Weekly lists roll over.
          </p>

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
