import { useCallback, useRef, useState } from 'react';
import { Form, Modal } from 'antd';
import MetadataForm from '../components/metadata/MetadataForm';
import { useTableMetadata } from '../core/metadata/useTableMetadata';

// The open / edit / modal way of using a metadata form, over the same engine
// as MetadataForm (one form engine for the whole framework). Pages call
// openCreate / openEdit, render recordModal() once, and refresh their list
// when saveCompleted turns true.
//
// The metadata comes from GET /api/v1/metadata/:table, so the arguments the
// previous engine took (the store key holding all metadata) are ignored.
const useRecordForm = () => {
    const [form] = Form.useForm();
    const [opened, setOpened] = useState(null);
    const [fields, setFields] = useState(undefined);
    const [childrenTop, setChildrenTop] = useState(undefined);
    const [childrenBottom, setChildrenBottom] = useState(undefined);
    const [saveCompleted, setSaveCompleted] = useState(false);
    const [saving, setSaving] = useState(false);
    // The options of the save in progress ({ notify, onSuccess, onError }) and
    // the promise save() returned for it.
    const pendingSave = useRef(null);
    // A table shown as steps brings its own Back / Continue / Save buttons.
    const { data: openedMetadata } = useTableMetadata(opened?.resource);
    const stepped = Boolean(openedMetadata?.table?.stepper);

    const open = useCallback((next) => {
        form.resetFields();
        setSaveCompleted(false);
        setOpened(next);
    }, [form]);

    const openCreate = useCallback((resource, initialValues = {}) => {
        open({ resource, record: null, initialValues });
    }, [open]);

    const openEdit = useCallback((resource, existingRecord) => {
        if (!existingRecord || typeof existingRecord !== 'object') {
            throw new Error('[useRecordForm] openEdit requires an existing record');
        }
        open({ resource, record: existingRecord });
    }, [open]);

    const close = useCallback(() => {
        setOpened(null);
        setSaveCompleted(true);
    }, []);

    const finishSave = (result) => {
        setSaving(false);
        pendingSave.current?.resolve(result);
        pendingSave.current = null;
    };

    // Checks the form, then submits it; MetadataForm creates or updates.
    // Resolves to { success, data | error }.
    const save = (options = {}) => new Promise((resolve) => {
        pendingSave.current = { ...options, resolve };
        setSaving(true);
        form.validateFields()
            .then(() => form.submit())
            .catch(() => finishSave({ success: false }));
    });

    const recordModal = ({
        createTitle = 'Add Record',
        editTitle = 'Edit Record',
        onOk,
        okText = 'Save',
        width,
        ...modalProps
    } = {}) => (
        <Modal
            {...modalProps}
            open={Boolean(opened)}
            title={opened?.record ? editTitle : createTitle}
            onOk={onOk ?? (() => save())}
            onCancel={close}
            okText={okText}
            confirmLoading={saving}
            width={width ?? (stepped ? 1000 : undefined)}
            footer={stepped ? null : modalProps.footer}
            destroyOnHidden
        >
            {childrenTop}
            {opened && (
                <MetadataForm
                    form={form}
                    table={opened.resource}
                    record={opened.record}
                    initialValues={opened.initialValues}
                    fields={fields}
                    showActions={false}
                    onCancel={close}
                    notify={pendingSave.current?.notify !== false}
                    onSaved={(saved) => {
                        pendingSave.current?.onSuccess?.(saved);
                        finishSave({ success: true, data: saved });
                        close();
                    }}
                    onSaveError={(error) => {
                        pendingSave.current?.onError?.(error);
                        finishSave({ success: false, error });
                    }}
                />
            )}
            {childrenBottom}
        </Modal>
    );

    return {
        mode: opened?.record ? 'edit' : 'create',
        isEditing: Boolean(opened?.record),
        openCreate,
        openEdit,
        recordModal,
        save,
        saveCompleted,
        setSaveCompleted,
        fields,
        setFields,
        childrenTop,
        setChildrenTop,
        childrenBottom,
        setChildrenBottom,
        reset: close,
        resetCompletely: close,
    };
};

export default useRecordForm;
