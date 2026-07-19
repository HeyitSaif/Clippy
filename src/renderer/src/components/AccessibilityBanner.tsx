interface AccessibilityBannerProps {
  requesting: boolean;
  message?: string;
  pasteSlotLabel: string;
  onEnable: () => void;
}

export function AccessibilityBanner({
  requesting,
  message,
  pasteSlotLabel,
  onEnable,
}: AccessibilityBannerProps) {
  return (
    <div className="accessibility-banner no-drag" role="status">
      <div className="accessibility-banner-text">
        <p className="accessibility-banner-title">
          Setup required for auto-paste
        </p>
        <p className="accessibility-banner-desc">
          {message ??
            `Allow Clippy to paste into other apps via ${pasteSlotLabel} and row clicks.`}
        </p>
      </div>
      <button
        type="button"
        className="accessibility-banner-btn"
        disabled={requesting}
        aria-busy={requesting}
        onClick={() => void onEnable()}
      >
        {requesting ? "Opening…" : "Fix setup"}
      </button>
    </div>
  );
}
