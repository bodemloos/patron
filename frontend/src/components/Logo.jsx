/**
 * Patron logo — floor-plan dot grid forming a "P".
 *
 * 4×5 grid of 10px cells with 4px gaps. Filled cells trace a "P"; the
 * remaining cells are ghosted to read as a floor plan.
 *
 * Coloring: uses `currentColor` so consumers can tint with a Tailwind
 * text-color utility (e.g. `text-brand-600 dark:text-brand-400`).
 */
export default function Logo({
  size = 32,
  className = '',
  showWordmark = false,
  ...rest
}) {
  const filled = [
    [0, 0], [1, 0], [2, 0],
    [0, 1],                 [3, 1],
    [0, 2], [1, 2], [2, 2],
    [0, 3],
    [0, 4],
  ];
  const muted = [
                                    [3, 0],
            [1, 1], [2, 1],
                                    [3, 2],
            [1, 3], [2, 3], [3, 3],
            [1, 4], [2, 4], [3, 4],
  ];
  const cell = (col, row, opacity, key) => (
    <rect
      key={key}
      x={col * 14}
      y={row * 14}
      width="10"
      height="10"
      rx="2"
      fill="currentColor"
      opacity={opacity}
    />
  );

  const mark = (
    <svg
      viewBox="0 0 52 66"
      width={size}
      height={(size * 66) / 52}
      role="img"
      aria-label="Patron"
      className="shrink-0"
      {...rest}
    >
      {filled.map(([c, r], i) => cell(c, r, 1, `f-${i}`))}
      {muted.map(([c, r], i) => cell(c, r, 0.22, `m-${i}`))}
    </svg>
  );

  if (!showWordmark) {
    return <span className={className}>{mark}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">Patron</span>
    </span>
  );
}
