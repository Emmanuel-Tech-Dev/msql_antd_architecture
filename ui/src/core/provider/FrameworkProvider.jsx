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

function isPublicBrowserRoute(route) {
    const flag = route?.is_public;
    if (typeof flag === "boolean") return flag;
    if (typeof flag === "number") return flag === 1;
    if (typeof flag === "string") {
        const lowered = flag.trim().toLowerCase();
        return lowered === "1" || lowered === "true";
    }
    return false;
}

function hasDevRole(roles = []) {
    return (roles ?? []).some((r) => String(r).trim().toLowerCase() === "dev");
}

function FrameworkBootstrap({ dataProvider, authProvider, resources, children }) {
    const setRegistry = useResourceStore((s) => s.setRegistry);

    const valuesStore = useValuesStore();
    const location = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const roles = useAuthStore((s) => s.roles);
    const authMetaLoaded = useAuthStore((s) => s.authMetaLoaded);
    const authBrowserResources = useAuthStore((s) => s.resources);
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

    console.log(authMetaLoaded)

    const { error: authUserError } = useQuery({
        queryKey: ['auth_user'],
        queryFn: () => authProvider.getPermissions(),
        enabled: !isPublicRoute && isAuthenticated && authMetaLoaded,
        staleTime: 60 * 1000,
        retry: false,
    });


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
                    { table: 'admin_permissions', storeName: 'permissions', fields: ['*'] },
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

        const permissions = bootstrapData.permissions ?? [];
        valuesStore.setValue('permissions', permissions);

        const adminResources = bootstrapData.admin_resources ?? [];
        const { resources: mergedResources, browserRoutes: allBrowserRoutes } = mergeResources(
            resources,
            adminResources
        );

        // Route policy:
        // - Public browser routes are always available to authenticated users.
        // - Private browser routes are overridden by auth_user.resources.
        const publicRoutes = allBrowserRoutes.filter((r) => isPublicBrowserRoute(r));
        const privateRoutes = allBrowserRoutes.filter((r) => !isPublicBrowserRoute(r));

        const authByPath = new Map(
            (authBrowserResources ?? [])
                .filter((r) => r?.resource_path)
                .map((r) => [r.resource_path, r]),
        );
        const authByName = new Map(
            (authBrowserResources ?? [])
                .filter((r) => r?.resource)
                .map((r) => [r.resource, r]),
        );

        const allowedPrivateRoutes = privateRoutes
            .filter((route) => authByPath.has(route.resource_path) || authByName.has(route.resource))
            .map((route) => {
                const override = authByPath.get(route.resource_path) ?? authByName.get(route.resource);
                return override
                    ? {
                        ...route,
                        resource_path: override.resource_path ?? route.resource_path,
                        resource: override.resource ?? route.resource,
                        icon: override.icon ?? route.icon,
                    }
                    : route;
            });

        const browserRoutes = !isAuthenticated
            ? publicRoutes
            : hasDevRole(roles)
                ? allBrowserRoutes
                : [...publicRoutes, ...allowedPrivateRoutes];

        setRegistry({ resources: mergedResources, browserRoutes });
    }, [data, isAuthenticated, roles, authBrowserResources, resources, setRegistry, valuesStore]);

    if (bootstrapError) {
        console.error('[Framework] Bootstrap failed:', bootstrapError.message);
    }
    if (authUserError) {
        console.error('[Framework] auth_user fetch failed:', authUserError.message);
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
                                authProvider={authProvider}
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
