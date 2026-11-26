// Draws a ":::flow" block: numbered cards joined by arrows, grouped into
// phase bands when the flow names phases. A step written "[option] text"
// shows the option beside its card: the place where the project's own code
// runs (createServer's beforeAuth, routes …).

const TAGGED = /^\[([^\]]+)\]\s+(.*)$/;

function readStep(item) {
  const match = item.match(TAGGED);
  return match ? { tag: match[1], text: match[2] } : { text: item };
}

function flowBands(block) {
  const phases = block.phases?.length ? block.phases : [{ name: '', from: 0 }];
  const bands = phases.map((phase, index) => ({
    name: phase.name,
    from: phase.from,
    to: phases[index + 1]?.from ?? block.items.length,
  }));
  // Items written before the first phase line still need a band.
  if (bands[0].from > 0) bands.unshift({ name: '', from: 0, to: bands[0].from });
  return bands.filter((band) => band.to > band.from);
}

export default function FlowDiagram({ block, headingId }) {
  const steps = block.items.map(readStep);
  const bands = flowBands(block);
  const hasPhases = bands.some((band) => band.name);
  const hasTags = steps.some((step) => step.tag);

  return (
    <section className="docs-block docs-flow-block" aria-labelledby={headingId}>
      <h2 id={headingId}>{block.title}</h2>
      <div className={`docs-flow${hasPhases ? ' docs-flow--phased' : ''}`}>
        {hasTags && (
          <div className="docs-flow__head" aria-hidden="true">
            <span>Framework step ↓</span>
            <span>Your code runs here</span>
          </div>
        )}
        {bands.map((band) => (
          <div className="docs-flow__band" key={band.from} role={band.name ? 'group' : undefined} aria-label={band.name || undefined}>
            {hasPhases && <span className="docs-flow__phase" aria-hidden="true">{band.name}</span>}
            <ol className="docs-flow__steps" start={band.from + 1}>
              {steps.slice(band.from, band.to).map((step, offset) => {
                const index = band.from + offset;
                const classes = ['docs-flow__step'];
                if (index === 0) classes.push('docs-flow__step--first');
                if (index === steps.length - 1) classes.push('docs-flow__step--last');
                return (
                  <li className={classes.join(' ')} key={index}>
                    <div className="docs-flow__card">
                      <span className="docs-flow__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span>{step.text}</span>
                    </div>
                    {step.tag && (
                      <>
                        <span className="docs-flow__link" aria-hidden="true" />
                        <code className="docs-flow__tag"><span className="docs-visually-hidden">Your code: </span>{step.tag}</code>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
