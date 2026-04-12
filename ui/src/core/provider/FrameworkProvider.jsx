// src/core/providers/FrameworkProvider.jsx

import { useMemo, useEffect } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { DataProviderContext, validateProvider } from './DataProvider';
import { AuthProviderContext, validateAuthProvider } from './AuthProvider';
import { AccessProviderContext, createAccessProvider } from './AccessProvider';
import { ResourceProviderContext, useResourceStore, mergeResources } from './ResourceProvider';
import { FrameworkContext } from './FrameworkContext';
import useValuesStore from '../../store/values-store';
import queryClient from '../queryClient';
import queryKeys from '../queryKeys';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';


const PUBLIC_ROUTES = ["/login", "/init_psd_recovery", "/reset-password", "/register", "otp-request", "/otp-verify"];

function FrameworkBootstrap({ dataProvider, resources, children }) {
    const setRegistry = useResourceStore((s) => s.setRegistry);

    const valuesStore = useValuesStore();
    const location = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);


    // useEffect(() => {
    //     if (isPublicRoute) {
    //         setRegistry({ resources: {}, browserRoutes: [] });
    //     }
    // }, [isPublicRoute]);

    // // unauthenticated on protected route — mark ready immediately
    // // so useRouteGuard fires and redirects to login
    // useEffect(() => {
    //     if (!isPublicRoute && !isAuthenticated) {
    //         setRegistry({ resources: {}, browserRoutes: [] });
    //     }
    // }, [isPublicRoute, isAuthenticated]);



    const { data, error: bootstrapError } = useQuery({
        queryKey: queryKeys.bootstrap(),
        queryFn: () => dataProvider.custom({
            url: 'api/v1/bootstrap',
            method: 'post',
            payload: {
                tables: [
                    { table: 'tables_metadata', storeName: 'tables_metadata', fields: ['*'] },
                    { table: 'admin_resources', storeName: 'admin_resources', fields: ['*'] },
                ],
            },
        }),
        enabled: !isPublicRoute && isAuthenticated,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (!data) return;

        const bootstrapData = data?.data?.data ?? {};

        const tablesMetadata = bootstrapData.tables_metadata ?? [];
        valuesStore.setValue('tables_metadata', tablesMetadata);

        const adminResources = bootstrapData.admin_resources ?? [];
        const { resources: mergedResources, browserRoutes } = mergeResources(
            resources,
            adminResources
        );

        setRegistry({ resources: mergedResources, browserRoutes });
    }, [data]);

    if (bootstrapError) {
        console.error('[Framework] Bootstrap failed:', bootstrapError.message);
    }

    return children;
}

export default function FrameworkProvider({
    dataProvider,
    authProvider,
    resources = [],
    children,
}) {
    if (import.meta.env.DEV) {
        validateProvider(dataProvider, 'dataProvider');
        validateAuthProvider(authProvider);
    }

    const accessProvider = useMemo(() => createAccessProvider(), []);

    return (
        <QueryClientProvider client={queryClient}>
            <DataProviderContext.Provider value={dataProvider}>
                <AuthProviderContext.Provider value={authProvider}>
                    <AccessProviderContext.Provider value={accessProvider}>
                        <ResourceProviderContext.Provider value={{}}>
                            <FrameworkBootstrap
                                dataProvider={dataProvider}
                                resources={resources}
                            >
                                {children}
                            </FrameworkBootstrap>
                        </ResourceProviderContext.Provider>
                    </AccessProviderContext.Provider>
                </AuthProviderContext.Provider>
            </DataProviderContext.Provider>
        </QueryClientProvider>
    );
}