import useLoginOptions from './useLoginOptions';

// The frame around every signed-out page (sign in, forgot and reset
// password, one-time code, password change), in the layout chosen in
// Appearance › Sign-in page: split, centered or cover. `page` replaces the
// saved settings (the Appearance preview passes its draft); `preview` fits
// the frame to its box instead of the window.
export default function AuthShell({ children, page: pageOverride, preview = false }) {
    const { page: savedPage, isLoading } = useLoginOptions();
    const page = pageOverride ?? savedPage;
    const height = preview ? 'h-full' : 'min-h-dvh';

    // A blank canvas for the moment the settings load, so the page never
    // jumps from one layout to another.
    if (!pageOverride && isLoading) return <main className={`${height} bg-[var(--ads-canvas)]`} aria-busy="true" />;

    if (page.layout === 'split') return <SplitLayout page={page} height={height}>{children}</SplitLayout>;
    if (page.layout === 'cover') return <CoverLayout page={page} height={height}>{children}</CoverLayout>;
    return <CenteredLayout page={page} height={height}>{children}</CenteredLayout>;
}

function BrandMark({ brand, size = 38, inverse = false }) {
    return (
        <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center rounded-[var(--ads-radius-md)] font-semibold ${inverse
                ? 'bg-[var(--ads-surface)] text-[var(--ads-accent)]'
                : 'bg-[var(--ads-accent)] text-[var(--ads-text-inverse)]'}`}
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {brand.mark}
        </span>
    );
}

function BrandLine({ brand, inverse = false }) {
    return (
        <div className="flex items-center gap-3 font-semibold tracking-[-0.01em]">
            <BrandMark brand={brand} inverse={inverse} />
            <span>{brand.name}</span>
            {brand.caption && (
                <span className={`hidden border-l pl-3 font-[var(--font-mono)] text-[length:var(--ads-font-size-caption)] font-medium uppercase tracking-[0.1em] sm:inline ${inverse
                    ? 'border-white/30 text-white/75'
                    : 'border-[var(--ads-border-subtle)] text-[var(--ads-text-muted)]'}`}
                >
                    {brand.caption}
                </span>
            )}
        </div>
    );
}

function AuthFooter({ page, className = '' }) {
    return (
        <p className={`m-0 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)] ${className}`}>
            © {new Date().getFullYear()} {page.brand.name}
            {page.helpUrl && (
                <>
                    {' · '}
                    <a href={page.helpUrl} target="_blank" rel="noreferrer" className="text-[var(--ads-accent)]">Help</a>
                </>
            )}
        </p>
    );
}

function CenteredLayout({ page, height, children }) {
    return (
        <main className={`flex ${height} flex-col items-center justify-between gap-8 bg-[var(--ads-canvas)] px-4 pb-8 pt-12 text-[var(--ads-text)] sm:pt-16`}>
            <div className="flex w-full flex-col items-center gap-7">
                <div className="flex flex-col items-center gap-3 font-semibold tracking-[-0.01em]">
                    <BrandMark brand={page.brand} size={48} />
                    <span>{page.brand.name}</span>
                </div>
                <section className="w-full max-w-[440px] rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] px-6 py-8 shadow-[var(--ads-shadow-sm)] sm:px-10 sm:py-10">
                    {children}
                </section>
                {page.message && (
                    <p className="m-0 max-w-[440px] text-center text-[length:var(--ads-font-size-body-sm)] leading-relaxed text-[var(--ads-text-muted)]">{page.message}</p>
                )}
            </div>
            <AuthFooter page={page} />
        </main>
    );
}

function SplitLayout({ page, height, children }) {
    return (
        <main className={`grid ${height} grid-cols-1 grid-rows-[auto_1fr] bg-[var(--ads-canvas)] text-[var(--ads-text)] lg:grid-cols-[minmax(420px,1.1fr)_minmax(460px,0.9fr)] lg:grid-rows-1`}>
            <section
                aria-label={page.brand.name}
                className="flex flex-col justify-between gap-10 border-b border-[var(--ads-border-subtle)] bg-[color-mix(in_srgb,var(--ads-text)_4%,var(--ads-canvas))] px-6 py-8 lg:border-b-0 lg:border-r lg:p-[clamp(32px,4.5vw,64px)]"
            >
                <BrandLine brand={page.brand} />
                {(page.headline || page.message || page.highlights.length > 0) && (
                    <div className="flex max-w-[560px] flex-col gap-5">
                        {page.headline && (
                            <h1 className="m-0 text-[clamp(32px,4.6vw,60px)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ads-text-heading)]">{page.headline}</h1>
                        )}
                        {page.message && (
                            <p className="m-0 max-w-[480px] text-[clamp(15px,1.2vw,17px)] leading-relaxed text-[var(--ads-text-muted)]">{page.message}</p>
                        )}
                        {page.highlights.length > 0 && (
                            <ol className="m-0 mt-4 hidden list-none flex-col border-t border-[var(--ads-border-subtle)] p-0 lg:flex">
                                {page.highlights.map((highlight, index) => (
                                    <li key={highlight.title} className="flex gap-4 border-b border-[var(--ads-border-subtle)] py-3.5">
                                        <span className="pt-0.5 font-[var(--font-mono)] text-[length:var(--ads-font-size-caption)] text-[var(--ads-accent)]">{String(index + 1).padStart(2, '0')}</span>
                                        <span className="text-[length:var(--ads-font-size-body-sm)] leading-normal">
                                            <strong className="font-semibold">{highlight.title}</strong>
                                            {highlight.detail && <span className="text-[var(--ads-text-muted)]"> {highlight.detail}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}
                <AuthFooter page={page} className="hidden lg:block" />
            </section>
            <section className="flex flex-col items-center justify-center gap-10 px-5 py-10 lg:px-[clamp(28px,6vw,96px)]">
                <div className="w-full max-w-[400px]">{children}</div>
                <AuthFooter page={page} className="lg:hidden" />
            </section>
        </main>
    );
}

function CoverLayout({ page, height, children }) {
    // A dark wash keeps white text readable on any picture or brand colour.
    const picture = page.coverImage
        ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.62)), url("${page.coverImage.replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'color-mix(in srgb, var(--ads-accent) 72%, #000)' };
    return (
        <main className={`grid ${height} grid-cols-1 grid-rows-[auto_1fr] bg-[var(--ads-surface)] text-[var(--ads-text)] lg:grid-cols-[minmax(0,1fr)_minmax(440px,520px)] lg:grid-rows-1`}>
            <section
                aria-label={page.brand.name}
                className="flex min-h-[260px] flex-col justify-between gap-10 px-6 py-8 text-white lg:p-[clamp(32px,4.5vw,64px)]"
                style={picture}
            >
                <BrandLine brand={page.brand} inverse />
                {(page.headline || page.message) && (
                    <div className="flex max-w-[640px] flex-col gap-3.5">
                        {page.headline && <h1 className="m-0 text-[clamp(30px,4vw,52px)] font-semibold leading-[1.04] tracking-[-0.04em] text-white">{page.headline}</h1>}
                        {page.message && <p className="m-0 text-[clamp(15px,1.2vw,17px)] leading-relaxed text-white/85">{page.message}</p>}
                    </div>
                )}
            </section>
            <section className="flex flex-col justify-between gap-10 px-6 py-10 lg:px-14 lg:py-14">
                <span aria-hidden="true" />
                <div className="mx-auto w-full max-w-[400px]">{children}</div>
                <AuthFooter page={page} />
            </section>
        </main>
    );
}

export function AuthIcon({ children }) {
    return (
        <span
            className="mx-auto mb-4 grid size-12 place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent-soft)] text-xl text-[var(--ads-accent)]"
            aria-hidden="true"
        >
            {children}
        </span>
    );
}
