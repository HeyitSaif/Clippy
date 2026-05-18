import { useState } from "react";
import { PASTE_SLOT_DISPLAY } from "@shared/hotkey";
import { cn } from "./lib/utils";
import { ClipboardTab } from "./tabs/ClipboardTab";
import { TodoTab } from "./tabs/TodoTab";
import { SettingsModal } from "./components/SettingsModal";
import { useSettings } from "./hooks/useClips";
import { IconSettings } from "./components/icons";

type Tab = "clipboard" | "todo";

const TABS: { id: Tab; label: string }[] = [
  { id: "clipboard", label: "Clipboard" },
  { id: "todo", label: "Todo" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("clipboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, update, hotkeyError } = useSettings();

  return (
    <div className="app-backdrop">
      <div className="glass-shell">
        <header className="drag-region app-header">
          <nav className="no-drag segmented segmented-compact">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "segmented-btn",
                  tab === t.id && "segmented-btn-active",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="no-drag icon-btn icon-btn-sm icon-btn-accent"
            aria-label="Settings"
          >
            <IconSettings size={14} />
          </button>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col">
          {tab === "clipboard" ? <ClipboardTab /> : <TodoTab />}
        </main>

        <footer className="drag-region app-footer">
          <div className="no-drag hint-bar">
            <span>
              <span className="hint-kbd">↑↓</span> nav
            </span>
            <span>
              <span className="hint-kbd">↵</span> paste
            </span>
            <span>
              <span className="hint-kbd">⌘K</span> search
            </span>
            <span>
              <span className="hint-kbd">{PASTE_SLOT_DISPLAY}</span> paste
            </span>
            <span>
              <span className="hint-kbd">⌘⌫</span> del
            </span>
            <span>
              <span className="hint-kbd">esc</span> hide
            </span>
          </div>
        </footer>

        <SettingsModal
          open={settingsOpen}
          settings={settings}
          hotkeyError={hotkeyError}
          onClose={() => setSettingsOpen(false)}
          onUpdate={update}
          onExport={() => void window.clippy.exportHistory()}
          onImport={() => void window.clippy.importHistory()}
          onClear={() => void window.clippy.clearHistory()}
        />
      </div>
    </div>
  );
}
