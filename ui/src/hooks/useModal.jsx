import { Modal } from 'antd';
import { useState, useCallback } from 'react';
import useDraggable from './useDraggable';

const useModal = (staticConfig = {}) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(null);
    const [content, setContent] = useState(null);
    const [footer, setFooter] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [onOk, setOnOk] = useState(null);
    const [onCancel, setOnCancel] = useState(null);

    // ─── Draggable ────────────────────────────────────────────────────────
    const { drag, draggableTitleProps } = useDraggable();
    const isDraggable = staticConfig.draggable ?? false;

    // ─── Open ─────────────────────────────────────────────────────────────
    const openModal = useCallback(({
        title,
        content,
        footer,
        loading,
        confirmLoading,
        onOk,
        onCancel,
    } = {}) => {
        if (title !== undefined) setTitle(title);
        if (content !== undefined) setContent(content);
        if (footer !== undefined) setFooter(footer);
        setLoading(loading ?? false);
        setConfirmLoading(confirmLoading ?? false);
        if (onOk !== undefined) setOnOk(() => onOk);
        if (onCancel !== undefined) setOnCancel(() => onCancel);
        setOpen(true);
    }, []);

    // ─── Close ────────────────────────────────────────────────────────────
    const closeModal = useCallback(() => {
        setOpen(false);
        if (staticConfig.resetOnClose) {
            setTitle(null);
            setContent(null);
            setFooter(undefined);
            setLoading(false);
            setConfirmLoading(false);
            setOnOk(null);
            setOnCancel(null);
        }
    }, [staticConfig.resetOnClose]);

    // ─── Dynamic updates ──────────────────────────────────────────────────
    const updateContent = useCallback((content) => setContent(content), []);
    const updateTitle = useCallback((title) => setTitle(title), []);
    const updateFooter = useCallback((footer) => setFooter(footer), []);

    // ─── Async ok ─────────────────────────────────────────────────────────
    const handleOk = useCallback(async () => {
        if (!onOk) { closeModal(); return; }
        try {
            setConfirmLoading(true);
            await onOk();
            // closeModal();
        } catch {
            // keep open if onOk rejects
        } finally {
            setConfirmLoading(false);
        }
    }, [onOk, closeModal]);

    const handleCancel = useCallback(() => {
        onCancel?.();
        closeModal();
    }, [onCancel, closeModal]);

    // ─── JSX ──────────────────────────────────────────────────────────────
    const modalJSX = useCallback((overrides = {}) => (
        <Modal
            // ✅ static
            width={staticConfig.width ?? 320}
            centered={staticConfig.centered ?? false}
            closable={staticConfig.closable ?? true}
            closeIcon={staticConfig.closeIcon}
            keyboard={staticConfig.keyboard ?? true}
            mask={staticConfig.mask ?? true}
            // maskClosable={staticConfig.maskClosable ?? true}
            zIndex={staticConfig.zIndex ?? 1000}
            forceRender={staticConfig.forceRender ?? false}
            destroyOnHidden={staticConfig.destroyOnHidden ?? false}
            getContainer={staticConfig.getContainer}
            wrapClassName={staticConfig.wrapClassName}
            rootClassName={staticConfig.rootClassName}
            styles={{
                ...staticConfig.styles,
                header: {
                    cursor: isDraggable ? 'move' : 'default',
                    ...staticConfig.styles?.header,
                },
            }}
            okText={staticConfig.okText ?? 'OK'}
            cancelText={staticConfig.cancelText ?? 'Cancel'}
            okType={staticConfig.okType ?? 'primary'}
            okButtonProps={staticConfig.okButtonProps}
            cancelButtonProps={staticConfig.cancelButtonProps}
            afterClose={staticConfig.afterClose}
            afterOpenChange={staticConfig.afterOpenChange}
            // ✅ wire drag — only when draggable: true
            modalRender={isDraggable ? drag : staticConfig.modalRender}
            // ✅ dynamic
            title={
                isDraggable
                    ? <div {...draggableTitleProps}>{title}</div>  // ✅ hover enables/disables drag
                    : title
            }
            footer={footer}
            loading={loading}
            confirmLoading={confirmLoading}
            open={open}
            onOk={handleOk}
            onCancel={handleCancel}
            {...overrides}
        >
            {content}
        </Modal>
    ), [
        open, title, content, footer, loading, confirmLoading,
        handleOk, handleCancel, drag, draggableTitleProps,
        isDraggable, staticConfig,
    ]);

    return {
        open,
        loading,
        confirmLoading,
        openModal,
        closeModal,
        updateContent,
        updateTitle,
        updateFooter,
        setLoading,
        setConfirmLoading,
        modalJSX,
    };
};

export default useModal;