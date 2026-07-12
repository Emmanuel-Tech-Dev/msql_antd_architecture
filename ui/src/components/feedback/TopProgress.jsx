import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import './TopProgress.css';

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
        <div className={`top-progress top-progress--${phase}`} aria-hidden="true">
            <span
                onTransitionEnd={() => {
                    if (phase === 'complete' && activeRequests === 0) setPhase('idle');
                }}
            />
        </div>
    );
}
