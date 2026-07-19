import {
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

interface IconTipProps {
  label: string;
  children: ReactNode;
  className?: string;
  accent?: boolean;
  danger?: boolean;
  /** Default action styling for clip rows; `icon` for chrome controls. */
  variant?: "action" | "icon";
  /** When omitted, renders a non-interactive tip target (static icons). */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
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
  variant = "action",
  onClick,
}: IconTipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<TipCoords | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tipId = useId();
  const interactive = typeof onClick === "function";

  const show = (): void => {
    if (!triggerRef.current) return;
    setCoords(computeCoords(triggerRef.current));
    setVisible(true);
  };

  const hide = (): void => {
    setVisible(false);
  };

  const setTriggerRef = (node: HTMLElement | null): void => {
    triggerRef.current = node;
  };

  const triggerClassName = cn(
    variant === "action" && "clip-action-btn",
    variant === "action" && accent && "clip-action-btn-accent",
    variant === "action" && danger && "clip-action-btn-danger",
    variant === "icon" && "icon-btn",
    variant === "icon" && accent && "icon-btn-accent",
    className,
  );

  return (
    <>
      <span className="icon-tip-wrap" onMouseEnter={show} onMouseLeave={hide}>
        {interactive ? (
          <button
            ref={setTriggerRef}
            type="button"
            aria-label={label}
            aria-describedby={visible ? tipId : undefined}
            onClick={onClick}
            className={triggerClassName}
          >
            {children}
          </button>
        ) : (
          <span
            ref={setTriggerRef}
            aria-label={label}
            aria-describedby={visible ? tipId : undefined}
            className={cn("icon-tip-static", triggerClassName)}
          >
            {children}
          </span>
        )}
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
