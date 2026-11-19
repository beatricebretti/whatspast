import { highlightParts } from './search.mjs';
export function HighlightedText({
  text,
  query = '',
  wholeWord = false,
}: {
  text: string;
  query?: string;
  wholeWord?: boolean;
}) {
  return (
    <>
      {highlightParts(text, query, wholeWord).map((part, i) =>
        part.match ? <mark key={i}>{part.text}</mark> : part.text,
      )}
    </>
  );
}
