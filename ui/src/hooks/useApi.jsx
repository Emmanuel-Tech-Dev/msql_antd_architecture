// src/hooks/useApi.js

import { useCustom, useCustomMutation } from '../core/hooks/data/useCustom';
import useNotification from './useNotification';

const useApi = (method = 'get', url, options = {}) => {
    const { message } = useNotification();
    const isRead = method.toLowerCase() === 'get';
    const {
        manual = false,
        onSuccess,
        onError,
        successMessage,
        ...restOptions
    } = options;

    const queryResult = useCustom({
        url,
        method,
        queryOptions: {
            enabled: isRead && !manual,
            onSuccess: (data) => {
                if (successMessage) message.success(successMessage);
                onSuccess?.(data);
            },
            onError: (err) => {
                message.error(err?.message || 'Something went wrong');
                onError?.(err);
            },
            ...restOptions,
        },
    });

    const mutationResult = useCustomMutation({
        mutationOptions: {
            onSuccess: (data) => {
                if (successMessage) message.success(successMessage);
                onSuccess?.(data);
            },
            onError: (err) => {
                message.error(err?.message || 'Something went wrong');
                onError?.(err);
            },
            ...restOptions,
        },
    });

    if (isRead) {

        return {
            data: queryResult.data?.data,
            loading: queryResult.isLoading,
            error: queryResult.error,
            run: queryResult.refetch,
        };
    }

    return {
        data: mutationResult.data?.data,
        loading: mutationResult.isPending,
        error: mutationResult.error,
        run: (payload) => mutationResult.mutate({ url, method, payload }),
    };
};

export default useApi;