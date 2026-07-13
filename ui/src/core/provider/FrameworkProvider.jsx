// src/core/providers/FrameworkProvider.jsx

import { useMemo, useEffect, useRef } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { DataProviderContext, validateProvider } from './DataProvider';
import { AuthProviderContext, validateAuthProvider } from './AuthProvider';
import { AccessProviderContext, createAccessProvider } from './AccessProvider';
import { ResourceProviderContext, useResourceStore, mergeResources } from './ResourceProvider';
import { FrameworkContext } from './FrameworkContext';
import { useStore as useValuesStore } from '../../store/values-store';
import queryClient from '../queryClient';
import queryKeys from '../queryKeys';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useAuthorizationEvents from '../hooks/auth/useAuthorizationEvents';
import TopProgress from '../../components/feedback/TopProgress';


const PUBLIC_ROUTES = [
    "/login",
    "/init_psd_recovery",
    "/reset-password",
    "/reset_password",
    "/register",
    "/otp_request",
    "/verify_otp",
    "/change-password",
    "/change_password",
];

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

function hasPrivilegedRole(roles = []) {
    return (roles ?? []).some((role) => {
        const normalized = String(role?.role_id ?? role).trim().toLowerCase();
        return normalized === "superadmin" || normalized === "dev";
    });
}

function FrameworkBootstrap({ dataProvider, authProvider, resources, children }) {
    const setRegistry = useResourceStore((s) => s.setRegistry);
    const resetRegistry = useResourceStore((s) => s.resetRegistry);
    const appliedBootstrapRef = useRef(null);

    const setBootstrapValues = useValuesStore((state) => state.setRuntimeValues);
    const location = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const roles = useAuthStore((s) => s.roles);
    const authMetaLoaded = useAuthStore((s) => s.authMetaLoaded);
    const authBrowserResources = useAuthStore((s) => s.resources);
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
    useAuthorizationEvents(isAuthenticated && !isPublicRoute);

    useEffect(() => {
        if (!isAuthenticated || !authMetaLoaded) {
            appliedBootstrapRef.current = null;
            resetRegistry();
        }
    }, [authMetaLoaded, isAuthenticated, resetRegistry]);

    // console.log(authMetaLoaded)

    const { error: authUserError, dataUpdatedAt: authUserUpdatedAt } = useQuery({
        queryKey: ['auth_user'],
        queryFn: () => authProvider.getPermissions(),
        enabled: !isPublicRoute && isAuthenticated,
        staleTime: 0, // Always refetch when component remounts
        gcTime: 5 * 60 * 1000, // Keep cached for 5 minutes
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



    const { data, error: bootstrapError, dataUpdatedAt: bootstrapUpdatedAt } = useQuery({
        queryKey: queryKeys.bootstrap(),
        queryFn: () => dataProvider.custom({
            url: 'api/v1/bootstrap',
            method: 'post',
            payload: {
                tables: [
                    {
                        table: 'tables_metadata',
                        storeName: 'tables_metadata',
                        fields: ['*'],
                        limit: 2000,
                    },
                    {
                        table: 'admin_resources',
                        storeName: 'admin_resources',
                        fields: ['*'],
                        limit: 1000,
                    },
                    {
                        table: 'admin_permissions',
                        storeName: 'permissions',
                        fields: ['*'],
                        limit: 1000,
                    },
                    {
                        table: 'ui_settings',
                        storeName: 'ui_settings',
                        fields: ['id', 'setting_key', 'setting_value', 'description', 'is_active', 'version'],
                        filters: [
                            { column: 'setting_key', operator: '=', value: 'layout.sider' },
                            { column: 'is_active', operator: '=', value: 1 },
                        ],
                        limit: 10,
                    },
                ],
            },
        }),
        enabled: !isPublicRoute && isAuthenticated,
        staleTime: 0, // Always refetch when component remounts
        gcTime: 5 * 60 * 1000, // Keep cached for 5 minutes
        retry: false,
    });

    useEffect(() => {
        if (!data || !authMetaLoaded) return;

        // The tracked values store changes identity after setValue(). Without
        // this guard, the effect can apply the same bootstrap payload again on
        // route changes and enter React's maximum-update-depth loop (#185).
        const bootstrapSignature = `${bootstrapUpdatedAt}:${authUserUpdatedAt}:${isAuthenticated}`;
        if (appliedBootstrapRef.current === bootstrapSignature) return;
        appliedBootstrapRef.current = bootstrapSignature;

        const bootstrapData = data?.data?.data ?? {};

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
            : hasPrivilegedRole(roles)
                ? allBrowserRoutes
                : [...publicRoutes, ...allowedPrivateRoutes];

        setBootstrapValues({ ...bootstrapData, routes: allBrowserRoutes });
        setRegistry({ resources: mergedResources, browserRoutes });
    }, [data, bootstrapUpdatedAt, authUserUpdatedAt, authMetaLoaded, isAuthenticated, roles, authBrowserResources, resources, setBootstrapValues, setRegistry]);

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
            <TopProgress />
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
