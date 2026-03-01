import { Alert, message, notification } from "antd";
import { useState, useCallback } from "react";

const useNotification = () => {
    // Alert state
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'info',
        message: '',
        description: '',
        closable: true,
        showIcon: true,
    });

    // Alert component
    const AlertJsx = () => {
        if (!alertConfig.visible) return null;

        return (
            <Alert
                title={alertConfig.message}
                description={alertConfig.description}
                type={alertConfig.type}
                closable={alertConfig.closable}
                showIcon={alertConfig.showIcon}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        );
    };

    // Show methods
    const showAlert = useCallback((config) => {
        setAlertConfig({
            visible: true,
            closable: true,
            showIcon: true,
            ...config,
        });
    }, []);

    const showMessage = useCallback((type, content, duration = 3) => {
        message[type](content, duration);
    }, []);

    const showNotification = useCallback((config) => {
        notification[config.type || 'info']({
            message: config.message,
            description: config.description,
            duration: config.duration || 4.5,
            placement: config.placement || 'topRight',
            ...config,
        });
    }, []);

    // Helper methods for each type
    const alert = {
        success: (msg, desc) => showAlert({ type: 'success', message: msg, description: desc }),
        error: (msg, desc) => showAlert({ type: 'error', message: msg, description: desc }),
        info: (msg, desc) => showAlert({ type: 'info', message: msg, description: desc }),
        warning: (msg, desc) => showAlert({ type: 'warning', message: msg, description: desc }),
    };

    const msg = {
        success: (content, duration) => showMessage('success', content, duration),
        error: (content, duration) => showMessage('error', content, duration),
        info: (content, duration) => showMessage('info', content, duration),
        warning: (content, duration) => showMessage('warning', content, duration),
        loading: (content, duration) => showMessage('loading', content, duration),
    };

    const notif = {
        success: (message, description, config = {}) =>
            showNotification({ type: 'success', message, description, ...config }),
        error: (message, description, config = {}) =>
            showNotification({ type: 'error', message, description, ...config }),
        info: (message, description, config = {}) =>
            showNotification({ type: 'info', message, description, ...config }),
        warning: (message, description, config = {}) =>
            showNotification({ type: 'warning', message, description, ...config }),
    };

    return {
        AlertJsx,
        alert,
        message: msg,
        notification: notif,
    };
};

export default useNotification;