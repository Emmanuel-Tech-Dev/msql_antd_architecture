// src/hooks/useApi.js

import { useEffect, useRef } from 'react';
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
        unwrap = false,
        ...restOptions
    } = options;

    const queryResult = useCustom({
        url,
        method,
        unwrap,
        queryOptions: {
            enabled: isRead && !manual,
            ...restOptions,
        },
    });

    const handledSuccessAt = useRef(0);
    const handledErrorAt = useRef(0);

    useEffect(() => {
        if (!isRead || !queryResult.isSuccess || !queryResult.dataUpdatedAt) return;
        if (handledSuccessAt.current === queryResult.dataUpdatedAt) return;
        handledSuccessAt.current = queryResult.dataUpdatedAt;
        if (successMessage) message.success(successMessage);
        onSuccess?.(queryResult.data);
    }, [isRead, onSuccess, queryResult.data, queryResult.dataUpdatedAt, queryResult.isSuccess, successMessage, message]);

    useEffect(() => {
        if (!isRead || !queryResult.isError || !queryResult.errorUpdatedAt) return;
        if (handledErrorAt.current === queryResult.errorUpdatedAt) return;
        handledErrorAt.current = queryResult.errorUpdatedAt;
        message.error(queryResult.error?.message || 'Something went wrong');
        onError?.(queryResult.error);
    }, [isRead, onError, queryResult.error, queryResult.errorUpdatedAt, queryResult.isError, message]);

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
        run: (payload) => mutationResult.mutate({ url, method, payload, unwrap }),
    };
};

export default useApi;
