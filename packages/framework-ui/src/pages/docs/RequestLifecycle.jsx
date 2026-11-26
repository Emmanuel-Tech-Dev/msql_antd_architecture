// Draws a ":::lifecycle" block: the request goes down the left column, turns
// at the last step, and the response comes back up the right. Refusals sit
// beside the step that sends them. The drawing is for sighted readers; the
// numbered list under it carries the same content for screen readers and
// replaces the drawing on narrow screens.

function layoutLifecycle(steps) {
  const numbered = steps.map((step, index) => ({ ...step, number: index + 1 }));
  const outs = numbered.filter((step) => step.direction === 'out');
  const backs = numbered.filter((step) => step.direction === 'back');
  const turn = numbered.find((step) => step.direction === 'turn');
  const rows = [];
  const bands = [];

  for (const zone of new Set([...outs, ...backs].map((step) => step.zone))) {
    const zoneOuts = outs.filter((step) => step.zone === zone);
    const zoneBacks = backs.filter((step) => step.zone === zone);
    const count = Math.max(zoneOuts.length, zoneBacks.length);
    const start = rows.length;
    // The response climbs, so a zone's return steps fill its rows from the bottom.
    for (let index = 0; index < count; index += 1) {
      rows.push({ zone, out: zoneOuts[index], back: zoneBacks[count - 1 - index] });
    }
    bands.push({ zone, start, end: rows.length });
  }
  if (turn) bands.push({ zone: turn.zone, start: rows.length, end: rows.length + 1 });

  const lastBack = backs.at(-1);
  return {
    numbered,
    rows,
    bands,
    turn,
    lastBack,
    lastBackRow: rows.findIndex((row) => row.back && row.back === lastBack),
  };
}

function LifecycleCard({ step, className = '' }) {
  return (
    <div className={`docs-lifecycle__card ${className}`}>
      <span className="docs-lifecycle__number">{String(step.number).padStart(2, '0')}</span>
      <strong>{step.title}</strong>
      {step.text && <span>{step.text}</span>}
    </div>
  );
}

function Refusals({ refusals }) {
  return (
    <>
      <div className="docs-lifecycle__refusal">
        {refusals.map((refusal) => (
          <span key={`${refusal.code}-${refusal.text}`}><b>{refusal.code}</b> {refusal.text}</span>
        ))}
      </div>
      <span className="docs-lifecycle__exit" />
    </>
  );
}

export default function RequestLifecycle({ block, headingId }) {
  const { numbered, rows, bands, turn, lastBack, lastBackRow } = layoutLifecycle(block.steps);
  const firstRow = 2;
  const retryFrom = block.retry ? rows.findIndex((row) => row.out?.title === block.retry.from) : -1;
  const retryTo = block.retry ? rows.findIndex((row) => row.out?.title === block.retry.to) : -1;
  const showRetry = retryFrom > retryTo && retryTo >= 0;
  const railKind = (index) => {
    if (!showRetry) return null;
    if (index === retryFrom) return 'from';
    if (index === retryTo) return 'to';
    return index > retryTo && index < retryFrom ? 'pass' : null;
  };

  return (
    <section className="docs-block docs-lifecycle" aria-labelledby={headingId}>
      <h2 id={headingId}>{block.title}</h2>
      {block.example && <p className="docs-lifecycle__example">Example: {block.example}</p>}

      <div className="docs-lifecycle__map" aria-hidden="true">
        <span className="docs-lifecycle__heading docs-lifecycle__heading--refused" style={{ gridRow: 1, gridColumn: 3 }}>Refused here</span>
        <span className="docs-lifecycle__heading" style={{ gridRow: 1, gridColumn: 4 }}>Request out ↓</span>
        <span className="docs-lifecycle__heading" style={{ gridRow: 1, gridColumn: 5 }}>Response back ↑</span>

        {bands.map((band, index) => (
          <div
            className={`docs-lifecycle__band${index % 2 ? ' docs-lifecycle__band--alt' : ''}`}
            key={`${band.zone}-${band.start}`}
            style={{ gridRow: `${band.start + firstRow} / ${band.end + firstRow}`, gridColumn: '1 / -1' }}
          >
            <span>{band.zone}</span>
          </div>
        ))}

        {rows.map((row, index) => {
          const gridRow = index + firstRow;
          const rail = railKind(index);
          return [
            rail && <span className={`docs-lifecycle__rail docs-lifecycle__rail--${rail}`} key={`rail-${index}`} style={{ gridRow, gridColumn: 2 }} />,
            <div className="docs-lifecycle__side" key={`side-${index}`} style={{ gridRow, gridColumn: 3 }}>
              {row.out?.refusals.length > 0 && <Refusals refusals={row.out.refusals} />}
              {!row.out?.refusals.length && index === retryTo && showRetry && (
                <>
                  <span className="docs-lifecycle__retry-text">{block.retry.text}</span>
                  <span className="docs-lifecycle__retry-line" />
                </>
              )}
            </div>,
            <div className={`docs-lifecycle__lane${index === 0 ? ' docs-lifecycle__lane--start' : ''}`} key={`out-${index}`} style={{ gridRow, gridColumn: 4 }}>
              {row.out && <LifecycleCard step={row.out} className={index === 0 ? '' : 'docs-lifecycle__card--in-top'} />}
            </div>,
            index >= lastBackRow && (
              <div className={`docs-lifecycle__lane${index === lastBackRow ? ' docs-lifecycle__lane--end' : ''}`} key={`back-${index}`} style={{ gridRow, gridColumn: 5 }}>
                {row.back && (
                  <LifecycleCard
                    step={row.back}
                    className={`docs-lifecycle__card--in-bottom${row.back === lastBack ? ' docs-lifecycle__card--done' : ''}`}
                  />
                )}
              </div>
            ),
          ];
        })}

        {turn && (
          <div className="docs-lifecycle__turn" style={{ gridRow: rows.length + firstRow, gridColumn: '4 / 6' }}>
            <LifecycleCard step={turn} />
          </div>
        )}
      </div>

      <div className="docs-lifecycle__steps">
        <ol>
          {numbered.map((step) => (
            <li key={step.number}>
              <span className="docs-lifecycle__number">{String(step.number).padStart(2, '0')}</span>
              <div>
                <small>{step.zone}</small>
                <strong>{step.title}</strong>
                {step.text && <p>{step.text}</p>}
                {step.refusals.length > 0 && (
                  <ul>
                    {step.refusals.map((refusal) => (
                      <li key={`${refusal.code}-${refusal.text}`}>Refused with {refusal.code}: {refusal.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
        {block.retry && <p className="docs-lifecycle__retry-note">{block.retry.text}</p>}
      </div>

      {block.note && <p className="docs-lifecycle__note">{block.note}</p>}
    </section>
  );
}
