import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

interface IconTipProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  danger?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

type Placement = "top" | "bottom";

interface TipCoords {
  x: number;
  y: number;
  placement: Placement;
}

function computeCoords(el: HTMLElement): TipCoords {
  const rect = el.getBoundingClientRect();
  const placement: Placement = rect.top < 56 ? "bottom" : "top";
  return {
    x: rect.left + rect.width / 2,
    y: placement === "top" ? rect.top - 6 : rect.bottom + 6,
    placement,
  };
}

export function IconTip({
  label,
  children,
  className,
  accent,
  danger,
  onClick,
}: IconTipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<TipCoords | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  const show = (): void => {
    if (!btnRef.current) return;
    setCoords(computeCoords(btnRef.current));
    setVisible(true);
  };

  const hide = (): void => {
    setVisible(false);
  };

  return (
    <>
      <span className="icon-tip-wrap" onMouseEnter={show} onMouseLeave={hide}>
        <button
          ref={btnRef}
          type="button"
          aria-label={label}
          aria-describedby={visible ? tipId : undefined}
          onClick={onClick}
          className={cn(
            "clip-action-btn",
            accent && "clip-action-btn-accent",
            danger && "clip-action-btn-danger",
            className,
          )}
        >
          {children}
        </button>
      </span>
      {visible &&
        coords &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className={cn(
              "icon-tip icon-tip-portal",
              coords.placement === "top" && "icon-tip-above",
              coords.placement === "bottom" && "icon-tip-below",
            )}
            style={{ left: coords.x, top: coords.y }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
