import { useState } from 'react';
import { App, Button, Spin, Upload } from 'antd';
import { CloudUploadOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons';
import { useDataProvider } from '../../core/provider/DataProvider';
import utils from '../../utils/function_utils';

const DEFAULT_ACCEPT = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    file: 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
};
const TYPE_NAMES = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/gif': 'GIF', 'application/pdf': 'PDF' };

const acceptedNames = (accept) => accept.split(',').map((type) => TYPE_NAMES[type.trim()] ?? type.trim()).join(', ');

// A file or image field: the file is uploaded as soon as it is chosen or
// dropped (POST /api/v1/uploads/:table/:column, which checks the type and size
// from the field's metadata), and the field's value is the stored file's URL.
export default function UploadField({ table, column, kind = 'file', accept, maxSizeMb, value, onChange, disabled }) {
    const { message } = App.useApp();
    const dataProvider = useDataProvider();
    const [uploading, setUploading] = useState(null);
    const acceptTypes = accept ?? DEFAULT_ACCEPT[kind];

    const upload = async ({ file, onSuccess, onError }) => {
        if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
            message.error(`${file.name} is larger than ${maxSizeMb} MB`);
            onError(new Error('File too large'));
            return;
        }
        setUploading(file.name);
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

    if (uploading || value) {
        return (
            <div className="flex items-center gap-3 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
                <span className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] bg-[var(--color-bg-container)] text-lg text-[var(--color-accent)]">
                    {uploading ? <Spin size="small" /> : kind === 'image' ? <img src={value} alt="" className="size-full object-cover" /> : <FileOutlined aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                    {uploading
                        ? <span className="truncate text-sm font-medium">{uploading}</span>
                        : <a href={value} target="_blank" rel="noreferrer" className="truncate text-sm font-medium">{utils.fileNameFromUrl(value)}</a>}
                    <span className={`text-[12.5px] ${uploading ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-success)]'}`}>
                        {uploading ? 'Uploading…' : 'Uploaded'}
                    </span>
                </span>
                {!uploading && !disabled && (
                    <Button type="text" aria-label={`Remove ${utils.fileNameFromUrl(value)}`} icon={<DeleteOutlined />} onClick={() => onChange?.(null)} className="!size-11" />
                )}
            </div>
        );
    }

    return (
        <Upload.Dragger
            accept={acceptTypes}
            maxCount={1}
            showUploadList={false}
            customRequest={upload}
            disabled={disabled}
            className="[&_.ant-upload-drag]:!rounded-[calc(var(--app-radius,6px)*2)] [&_.ant-upload-drag]:!border-[1.5px] [&_.ant-upload-drag]:!bg-[var(--color-bg-sunken)]"
        >
            <div className="flex items-center gap-4 px-2 py-1 text-left">
                <span className="grid size-11 shrink-0 place-items-center rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] bg-[var(--color-bg-container)] text-xl text-[var(--color-accent)]">
                    <CloudUploadOutlined aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                        Drop {kind === 'image' ? 'an image' : 'a file'} here, or <span className="text-[var(--color-accent)] underline underline-offset-2">browse</span>
                    </span>
                    <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                        {acceptedNames(acceptTypes)}{maxSizeMb ? ` · up to ${maxSizeMb} MB` : ''} · uploaded when chosen
                    </span>
                </span>
            </div>
        </Upload.Dragger>
    );
}
