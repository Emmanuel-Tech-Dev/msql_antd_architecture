

import { useState } from 'react';
import { Popconfirm } from 'antd';
import useDeleteOne from '../core/hooks/data/useDelete';
import useNotification from './useNotification';

const useDelete = ({ resource } = {}) => {
    const { message } = useNotification();
    const [saveCompleted, setSaveCompleted] = useState(false);

    const { mutate, isPending } = useDeleteOne({
        resource,
        mutationOptions: {
            onSuccess: () => {
                setSaveCompleted(true);
                message.success('Record has been deleted successfully');
            },
            onError: (error) => {
                message.error(error?.message || 'Delete failed');
            },
        },
    });

    const deleteRecord = (id, callback) => {
        setSaveCompleted(false);
        mutate(id, {
            onSuccess: (data) => callback?.(true, data),
            onError: (error) => callback?.(false, error),
        });
    };

    const confirm = (
        id,
        title = 'Are you sure you want to delete this record?',
        elem = <a href="#">Delete</a>,
        callback,
        okText = 'Yes',
        cancelText = 'No',
    ) => (
        <Popconfirm
            title={title}
            onConfirm={() => deleteRecord(id, callback)}
            onCancel={() => setSaveCompleted(false)}
            okText={okText}
            cancelText={cancelText}
            okButtonProps={{ loading: isPending }}
        >
            {elem}
        </Popconfirm>
    );

    return {
        confirm,
        deleteRecord,
        saveCompleted,
        setSaveCompleted,
        loading: isPending,
    };
};

export default useDelete;