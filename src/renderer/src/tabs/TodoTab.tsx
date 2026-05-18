import { IconCheckSquare, IconSpark } from "../components/icons";

export function TodoTab() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
      <div
        className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-[var(--accent)]"
        style={{
          background: "var(--accent-soft)",
          border:
            "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 32px var(--accent-glow)",
        }}
      >
        <IconCheckSquare size={32} />
        <IconSpark
          size={14}
          className="absolute -right-1 -top-1 text-[var(--accent)] opacity-80"
        />
      </div>
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
          Todo is on the way
        </h2>
        <p className="mx-auto mt-2 max-w-[240px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
          A beautiful task list will live here soon. For now, your clipboard
          history is ready in the other tab.
        </p>
      </div>
      <div className="glass-inset rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
        Coming soon
      </div>
    </div>
  );
}
