interface AccessibilityBannerProps {
  requesting: boolean;
  onEnable: () => void;
}

export function AccessibilityBanner({
  requesting,
  onEnable,
}: AccessibilityBannerProps) {
  return (
    <div className="accessibility-banner no-drag">
      <div className="accessibility-banner-text">
        <p className="accessibility-banner-title">Accessibility required</p>
        <p className="accessibility-banner-desc">
          Allow Clippy (or Electron in dev) to paste into other apps via ⌘⌃1–9
          and auto-paste.
        </p>
      </div>
      <button
        type="button"
        className="accessibility-banner-btn"
        disabled={requesting}
        onClick={() => void onEnable()}
      >
        {requesting ? "Opening…" : "Open Settings"}
      </button>
    </div>
  );
}
