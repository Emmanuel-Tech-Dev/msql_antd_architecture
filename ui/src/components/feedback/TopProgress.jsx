import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

const ROOT_CLASS = 'pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden';
const BAR_CLASS = [
    'absolute inset-y-0 left-0 origin-left bg-[var(--color-accent,#d4570a)]',
    'shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent,#d4570a)_60%,transparent)]',
    'transition-[width,opacity] duration-200 ease-out motion-reduce:duration-[1ms]',
].join(' ');

export default function TopProgress() {
    const { pathname, search } = useLocation();
    const activeRequests = useIsFetching() + useIsMutating();
    const previousLocation = useRef(`${pathname}${search}`);
    const previousActivity = useRef(activeRequests);
    const [phase, setPhase] = useState('idle');

    useEffect(() => {
        if (previousActivity.current === activeRequests) return undefined;
        previousActivity.current = activeRequests;
        const frame = window.requestAnimationFrame(() => {
            setPhase(activeRequests > 0 ? 'loading' : 'complete');
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activeRequests]);

    useEffect(() => {
        const nextLocation = `${pathname}${search}`;
        if (previousLocation.current === nextLocation) return undefined;
        previousLocation.current = nextLocation;
        let secondFrame;
        const firstFrame = window.requestAnimationFrame(() => {
            setPhase('loading');
            secondFrame = window.requestAnimationFrame(() => {
                if (activeRequests === 0) setPhase('complete');
            });
        });

        return () => {
            window.cancelAnimationFrame(firstFrame);
            if (secondFrame) window.cancelAnimationFrame(secondFrame);
        };
    }, [activeRequests, pathname, search]);

    if (phase === 'idle') return null;

    return (
        <div className={ROOT_CLASS} aria-hidden="true">
            <span
                className={`${BAR_CLASS} ${phase === 'loading'
                    ? 'w-3/4 opacity-100 after:absolute after:inset-0 after:animate-pulse after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent motion-reduce:after:animate-none'
                    : 'w-full opacity-0'}`}
                onTransitionEnd={() => {
                    if (phase === 'complete' && activeRequests === 0) setPhase('idle');
                }}
            />
        </div>
    );
}
