import { useEffect, useRef } from 'react';
import queryClient from '../../queryClient';

const eventUrl = () => {
    const base = String(import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
    return `${base}/auth/access-events`;
};

export default function useAuthorizationEvents(enabled) {
    const refreshPromise = useRef(null);

    useEffect(() => {
        if (!enabled) return undefined;

        const controller = new AbortController();
        let reconnectTimer = null;

        const refreshAuthorization = () => {
            if (refreshPromise.current) return;
            refreshPromise.current = queryClient
                .refetchQueries({ queryKey: ['auth_user'], exact: true, type: 'active' })
                .finally(() => {
                    refreshPromise.current = null;
                });
        };

        const connect = async () => {
            try {
                const token = sessionStorage.getItem('access_token');
                if (!token || controller.signal.aborted) return;

                const response = await fetch(eventUrl(), {
                    headers: {
                        Accept: 'text/event-stream',
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                    credentials: 'include',
                    signal: controller.signal,
                });

                if (!response.ok || !response.body) throw new Error('Authorization event stream unavailable');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (!controller.signal.aborted) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

                    let boundary = buffer.indexOf('\n\n');
                    while (boundary >= 0) {
                        const block = buffer.slice(0, boundary);
                        buffer = buffer.slice(boundary + 2);
                        const event = block
                            .split('\n')
                            .find((line) => line.startsWith('event:'))
                            ?.slice(6)
                            .trim();
                        if (event === 'access-changed') refreshAuthorization();
                        if (event === 'ui-settings-changed') {
                            queryClient.refetchQueries({ queryKey: ['bootstrap'], exact: true, type: 'active' });
                        }
                        boundary = buffer.indexOf('\n\n');
                    }
                }
            } catch (error) {
                if (error?.name === 'AbortError' || controller.signal.aborted) return;
            }

            if (!controller.signal.aborted) {
                reconnectTimer = window.setTimeout(connect, 3000);
            }
        };

        connect();

        return () => {
            controller.abort();
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
        };
    }, [enabled]);
}
