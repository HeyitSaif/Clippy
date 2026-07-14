import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, className, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    ...props,
  };
}

export function IconClipboard(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2" width="8" height="4" rx="1.5" />
      <path d="M16 4h1a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconCheckSquare(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconText(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 17-5.5-5.5a1.5 1.5 0 0 0-2.12 0L8 17" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5M9 3h6l1 7h4l-7 7-7-7h4z" />
    </svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z" />
    </svg>
  );
}

export function IconLogo(props: IconProps) {
  return (
    <svg
      {...base({ ...props, size: props.size ?? 20 })}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="6" stroke="url(#logoGrad)" />
      <path d="M8 9h8M8 12h6M8 15h4" stroke="url(#logoGrad)" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconPaste(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h8v4H8z" />
      <path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
      <path d="M10 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconCircle(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <svg
      {...base(props)}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 21V4" />
      <path d="M4 4h11l-2 4 2 4H4" />
    </svg>
  );
}
