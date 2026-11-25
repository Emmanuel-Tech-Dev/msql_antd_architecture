import { Spin } from 'antd';

// The one full-screen loading state: shown while the app's code downloads and
// while access is checked after sign-in, so both look like a single step.
export default function AppLoading() {
    return (
        <div
            role="status"
            className="flex min-h-dvh items-center justify-center gap-3.5 bg-[var(--ads-canvas)] text-[var(--ads-text)]"
        >
            <Spin size="small" />
            <div className="flex flex-col">
                <span className="font-semibold">Preparing your workspace</span>
                <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Checking your access and loading your pages.</span>
            </div>
        </div>
    );
}

// Shown in the page area only, while a page's code downloads the first time;
// the sidebar and header stay. The delay keeps fast loads from flashing.
export function PageLoading() {
    return (
        <div role="status" aria-label="Loading page" className="flex min-h-[40vh] items-center justify-center">
            <Spin delay={200} />
        </div>
    );
}
