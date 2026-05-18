interface HighlightTextProps {
  text: string
  query: string
  className?: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t && !t.includes(':') && !t.startsWith('#'))
    .map(escapeRegExp)

  if (!terms.length) {
    return <span className={className}>{text}</span>
  }

  const re = new RegExp(`(${terms.join('|')})`, 'gi')
  const parts = text.split(re)
  const lowerTerms = terms.map((t) => t.toLowerCase())

  return (
    <span className={className}>
      {parts.map((part, i) =>
        lowerTerms.some((t) => part.toLowerCase() === t) ? (
          <mark key={i} className="search-hit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}
