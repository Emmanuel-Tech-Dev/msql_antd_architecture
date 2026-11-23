import { useState } from 'react';
import { App, Button, Upload } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useDataProvider } from '../../core/provider/DataProvider';

const DEFAULT_ACCEPT = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    file: 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
};

const fileNameOf = (url) => decodeURIComponent(String(url).split('/').pop()?.split('?')[0] || 'file');

// A file or image field: the file is uploaded as soon as it is chosen
// (POST /api/v1/uploads/:table/:column, which checks the type and size from
// the field's metadata), and the field's value is the stored file's URL.
export default function UploadField({ table, column, kind = 'file', accept, maxSizeMb, value, onChange, disabled }) {
    const { message } = App.useApp();
    const dataProvider = useDataProvider();
    const [uploading, setUploading] = useState(null);

    const fileList = uploading
        ? [uploading]
        : value ? [{ uid: value, name: fileNameOf(value), status: 'done', url: value }] : [];

    const upload = async ({ file, onSuccess, onError }) => {
        if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
            message.error(`${file.name} is larger than ${maxSizeMb} MB`);
            onError(new Error('File too large'));
            return;
        }
        setUploading({ uid: file.uid, name: file.name, status: 'uploading' });
        const body = new FormData();
        body.append('file', file);
        try {
            const { data } = await dataProvider.custom({
                url: `api/v1/uploads/${table}/${column}`,
                method: 'post',
                payload: body,
                headers: { 'Content-Type': 'multipart/form-data' },
                unwrap: true,
            });
            onChange?.(data.url);
            onSuccess(data);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? `${file.name} could not be uploaded`);
            onError(error);
        } finally {
            setUploading(null);
        }
    };

    const props = {
        fileList,
        maxCount: 1,
        accept: accept ?? DEFAULT_ACCEPT[kind],
        customRequest: upload,
        onRemove: () => onChange?.(null),
        disabled,
    };

    if (kind === 'image') {
        return (
            <Upload {...props} listType="picture-card">
                {fileList.length === 0 && !disabled && (
                    <button type="button" className="flex flex-col items-center gap-1 border-0 bg-transparent text-[var(--color-text-secondary)]">
                        <PlusOutlined aria-hidden="true" />
                        <span className="text-xs">Upload</span>
                    </button>
                )}
            </Upload>
        );
    }
    return (
        <Upload {...props}>
            {fileList.length === 0 && <Button icon={<UploadOutlined />} disabled={disabled}>Choose file</Button>}
        </Upload>
    );
}
