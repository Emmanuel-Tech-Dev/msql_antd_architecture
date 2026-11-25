export default function AuthShell({ children }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-[var(--ads-canvas)] px-4 py-10 text-[var(--ads-text)]">
            <section className="w-full max-w-[400px] rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] px-6 py-8 shadow-[var(--ads-shadow-sm)] sm:px-10 sm:py-12">
                {children}
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
