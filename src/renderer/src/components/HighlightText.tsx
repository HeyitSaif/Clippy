import { highlightParts } from '@shared/highlight'

interface HighlightTextProps {
  text: string
  query: string
  className?: string
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  const parts = highlightParts(text, query)

  if (parts.length === 1 && !parts[0].hit) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="search-hit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  )
}
