import { useState } from 'react';
import { Popconfirm } from 'antd';
import { apiRequest } from '../services/apiClient';
import Settings from '../utils/Settings';
import useNotification from 'antd/es/notification/useNotification';

const useDelete = () => {
    const [saveCompleted, setSaveCompleted] = useState(false);
    const [loading, setLoading] = useState(false);

    const { message } = useNotification()
    const cancel = () => {
        setSaveCompleted(false);
    };

    const deleteRecord = async (url, data, callback) => {
        setSaveCompleted(false);
        setLoading(true);
        try {
            const res = await apiRequest('delete', `${Settings.baseUrl}/${url}`);
            setSaveCompleted(true);
            message.success('Record has been deleted successfully');
            callback?.(true, res);
        } catch (error) {
            message.error(error?.message || 'Delete failed');
            callback?.(false, error);
        } finally {
            setLoading(false);
        }
    };

    //Returns JSX — Popconfirm is always the same, no need to repeat in every component
    const confirm = (
        url,
        data,
        title = 'Are you sure you want to delete this record?',
        elem = <a href="#">Delete</a>,
        callback,
        okText = 'Yes',
        cancelText = 'No',
    ) => {
        return (
            <Popconfirm
                title={title}
                onConfirm={() => deleteRecord(url, data, callback)}
                onCancel={cancel}
                okText={okText}
                cancelText={cancelText}
                okButtonProps={{
                    loading,
                    style: { background: Settings.secondaryColorHex, border: 'none' }
                }}
            >
                {elem}
            </Popconfirm>
        );
    };

    return { confirm, deleteRecord, saveCompleted, setSaveCompleted, loading };
};

export default useDelete;