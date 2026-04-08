// src/core/providers/FrameworkProvider.jsx

import { useMemo } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { DataProviderContext, validateProvider } from './DataProvider';
import { AuthProviderContext, validateAuthProvider } from './AuthProvider';
import { AccessProviderContext, createAccessProvider } from './AccessProvider';
import { ResourceProviderContext, useResourceStore, mergeResources } from './ResourceProvider';
import { FrameworkContext } from './FrameworkContext';
import useValuesStore from '../../store/values-store';
import queryClient from '../queryClient';
import queryKeys from '../queryKeys';

function FrameworkBootstrap({ dataProvider, resources, children }) {
    const setRegistry = useResourceStore((s) => s.setRegistry);
    const valuesStore = useValuesStore();

    const { error: bootstrapError } = useQuery({
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
        staleTime: Infinity,
        onSuccess: (res) => {
            const bootstrapData = res?.data ?? {};

            const tablesMetadata = bootstrapData.tables_metadata ?? [];
            valuesStore.setValue('tables_metadata', tablesMetadata);

            const adminResources = bootstrapData.admin_resources ?? [];
            const { resources: mergedResources, browserRoutes } = mergeResources(
                resources,
                adminResources
            );

            setRegistry({ resources: mergedResources, browserRoutes });
        },
    });

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