import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input } from 'antd';
import { CheckOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useStore as useValuesStore } from '../../../store/values-store';
import { useDataProvider } from '../../../core/provider/DataProvider';
import apiClient from '../../../services/apiClient';
import queryKeys from '../../../core/queryKeys';
import useNotification from '../../../hooks/useNotification';
import { LOGIN_LAYOUTS, normalizeLoginUi } from '../../../core/config/loginUi';
import AuthShell from '../../auth/AuthShell';

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 800;
const FIELD_LABEL = 'flex flex-col gap-1.5 font-medium';
const HINT = 'text-[length:var(--ads-font-size-caption)] font-normal text-[var(--ads-text-muted)]';

function readSettingValue(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

// Exactly three highlight rows to edit; empty ones are dropped on save.
const editableHighlights = (highlights) => [0, 1, 2].map((index) => highlights[index] ?? { title: '', detail: '' });

function forSaving(draft) {
    return {
        ...draft,
        headline: draft.headline.trim(),
        message: draft.message.trim(),
        helpUrl: draft.helpUrl.trim(),
        highlights: draft.highlights
            .map((item) => ({ title: item.title.trim(), detail: item.detail.trim() }))
            .filter((item) => item.title),
    };
}

// A picture of each layout for the picker.
function LayoutThumbnail({ layout }) {
    if (layout === 'split') {
        return (
            <span aria-hidden="true" className="grid h-[64px] grid-cols-2 overflow-hidden rounded-[var(--ads-radius-sm)] bg-[var(--ads-surface-raised)]">
                <span className="bg-[color-mix(in_srgb,var(--ads-text)_10%,transparent)]" />
                <span className="grid place-items-center"><span className="h-7 w-10 rounded-sm border border-[var(--ads-border)] bg-[var(--ads-surface)]" /></span>
            </span>
        );
    }
    if (layout === 'cover') {
        return (
            <span aria-hidden="true" className="grid h-[64px] grid-cols-[2fr_1fr] overflow-hidden rounded-[var(--ads-radius-sm)] bg-[color-mix(in_srgb,var(--ads-accent)_72%,#000)]">
                <span />
                <span className="bg-[var(--ads-surface)]" />
            </span>
        );
    }
    return (
        <span aria-hidden="true" className="grid h-[64px] place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-surface-raised)]">
            <span className="h-9 w-12 rounded-sm border border-[var(--ads-border)] bg-[var(--ads-surface)]" />
        </span>
    );
}

// The real sign-in frame with the draft settings, scaled to fit the box.
function SignInPreview({ page }) {
    const boxRef = useRef(null);
    const [scale, setScale] = useState(0.4);

    useEffect(() => {
        const box = boxRef.current;
        if (!box) return undefined;
        const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PREVIEW_WIDTH));
        observer.observe(box);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={boxRef} className="relative w-full overflow-hidden rounded-[var(--ads-radius-md)] border border-[var(--ads-border)]" style={{ aspectRatio: `${PREVIEW_WIDTH} / ${PREVIEW_HEIGHT}` }}>
            <div inert aria-hidden="true" className="absolute left-0 top-0 origin-top-left" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, transform: `scale(${scale})` }}>
                <AuthShell page={page} preview>
                    <div className="mb-6 flex flex-col gap-1">
                        <span className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--ads-text-heading)]">Welcome back</span>
                        <span className="text-[var(--ads-text-muted)]">Sign in to {page.brand.name}.</span>
                    </div>
                    <div className="flex flex-col gap-4">
                        <span className="h-12 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)]" />
                        <span className="h-12 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)]" />
                        <span className="h-[50px] rounded-[var(--ads-radius-md)] bg-[var(--ads-accent)]" />
                    </div>
                </AuthShell>
            </div>
        </div>
    );
}

// Appearance › Sign-in page: the login_ui setting, saved on its own.
export default function SignInPageSection({ brand, readOnly, onEditBrand }) {
    const row = useValuesStore((state) => state.login_ui)?.[0];
    const stored = useMemo(() => normalizeLoginUi(readSettingValue(row?.setting_value)), [row?.setting_value]);
    const [draft, setDraft] = useState(stored);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const coverInputRef = useRef(null);
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const { message } = useNotification();

    useEffect(() => setDraft(stored), [stored, row?.version]);

    const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const highlights = editableHighlights(draft.highlights);
    const updateHighlight = (index, key, value) => update(
        'highlights',
        highlights.map((item, at) => (at === index ? { ...item, [key]: value } : item)),
    );
    const isDirty = JSON.stringify(forSaving(draft)) !== JSON.stringify(forSaving(stored));
    const previewPage = useMemo(() => ({ ...normalizeLoginUi(forSaving(draft)), brand }), [draft, brand]);

    const uploadCover = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            message.error('Cover images must be smaller than 5 MB.');
            return;
        }
        setUploading(true);
        try {
            const payload = new FormData();
            payload.append('cover', file);
            const response = await apiClient.post('/api/v1/ui-settings/login-cover', payload);
            update('coverImage', response.data?.data?.url ?? '');
            message.success('Cover image uploaded. Save to show it on the sign-in page.');
        } catch (error) {
            message.error(error?.response?.data?.message || error?.message || 'The cover image could not be uploaded.');
        } finally {
            setUploading(false);
        }
    };

    const save = async () => {
        if (!row?.id || readOnly || !isDirty) return;
        setSaving(true);
        try {
            await dataProvider.custom({
                url: `api/v1/ui-settings/${row.id}`,
                method: 'put',
                payload: { settingKey: 'login_ui', settingValue: forSaving(draft), expectedVersion: Number(row.version) },
            });
            await Promise.all([
                queryClient.refetchQueries({ queryKey: queryKeys.bootstrap(), exact: true, type: 'active' }),
                queryClient.invalidateQueries({ queryKey: queryKeys.custom('auth/login_options', 'get', undefined, true) }),
            ]);
            message.success('Sign-in page saved. Everyone sees it the next time they open it.');
        } catch (error) {
            message.error(error?.message || 'The sign-in page could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    if (!row) {
        return <Alert type="warning" showIcon title="The sign-in page settings are missing. Run the database migrations (031_login_ui) and reload." />;
    }

    return (
        <div className="grid grid-cols-1 items-start gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
        <div className="flex min-w-0 flex-col gap-4">
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 p-0 font-medium">Layout</legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {LOGIN_LAYOUTS.map((layout) => {
                        const selected = draft.layout === layout.value;
                        return (
                            <label
                                key={layout.value}
                                className={`flex cursor-pointer flex-col gap-2 rounded-[var(--ads-radius-md)] p-2.5 ${selected
                                    ? 'border-2 border-[var(--ads-accent)] bg-[var(--ads-accent-soft)]'
                                    : 'border border-[var(--ads-border)]'} ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                            >
                                <LayoutThumbnail layout={layout.value} />
                                <span className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="login-layout"
                                        value={layout.value}
                                        checked={selected}
                                        disabled={readOnly}
                                        onChange={() => update('layout', layout.value)}
                                        className="accent-[var(--ads-accent)]"
                                    />
                                    <span className="font-medium">{layout.label}</span>
                                </span>
                                <span className={HINT}>{layout.hint}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
                <span className="font-medium">Brand</span>
                <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--ads-radius-md)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)] px-3 py-2">
                    <span aria-hidden="true" className="grid size-7 place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-accent)] text-[length:var(--ads-font-size-body-sm)] font-semibold text-[var(--ads-text-inverse)]">{brand.mark}</span>
                    <span className="min-w-0 flex-1 truncate">{brand.name}{brand.caption && <span className="text-[var(--ads-text-muted)]"> · {brand.caption}</span>}</span>
                    <Button type="link" size="small" onClick={onEditBrand}>Change in Brand</Button>
                </div>
                <span className={HINT}>The sign-in page uses the same name and mark as the sidebar.</span>
            </div>

            <label className={FIELD_LABEL}>
                Headline
                <Input name="loginHeadline" autoComplete="off" maxLength={120} value={draft.headline} disabled={readOnly} onChange={(event) => update('headline', event.target.value)} placeholder="Every order, mixed right." />
                <span className={HINT}>Shown on Split and Cover. Centered shows “Welcome back” only.</span>
            </label>

            <label className={FIELD_LABEL}>
                Supporting text
                <Input.TextArea name="loginMessage" autoSize={{ minRows: 2, maxRows: 4 }} maxLength={280} showCount value={draft.message} disabled={readOnly} onChange={(event) => update('message', event.target.value)} />
            </label>

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 p-0 font-medium">Highlights <span className={HINT}>· Split only, up to 3</span></legend>
                {highlights.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <Input aria-label={`Highlight ${index + 1} title`} placeholder="Title" maxLength={40} value={item.title} disabled={readOnly} onChange={(event) => updateHighlight(index, 'title', event.target.value)} />
                        <Input aria-label={`Highlight ${index + 1} detail`} placeholder="Detail" maxLength={80} value={item.detail} disabled={readOnly} onChange={(event) => updateHighlight(index, 'detail', event.target.value)} />
                    </div>
                ))}
            </fieldset>

            <div className="flex flex-col gap-1.5">
                <span className="font-medium">Cover image <span className={HINT}>· Cover only</span></span>
                <div className="flex flex-wrap items-center gap-3 rounded-[var(--ads-radius-md)] border border-dashed border-[var(--ads-border)] p-3">
                    {draft.coverImage && <img src={draft.coverImage} alt="" className="h-12 w-20 rounded-[var(--ads-radius-sm)] object-cover" />}
                    <Button icon={<UploadOutlined />} loading={uploading} disabled={readOnly} onClick={() => coverInputRef.current?.click()}>
                        {draft.coverImage ? 'Replace image' : 'Upload image'}
                    </Button>
                    {draft.coverImage && <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => update('coverImage', '')}>Remove</Button>}
                    <span className={`${HINT} min-w-[200px] flex-1`}>JPG, PNG or WebP, at least 1600 px wide, under 5 MB. Without one, the brand colour is used.</span>
                    <input ref={coverInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadCover} />
                </div>
            </div>

            <label className={FIELD_LABEL}>
                <span>Help link <span className={HINT}>(optional)</span></span>
                <Input name="loginHelpUrl" type="url" autoComplete="off" maxLength={500} value={draft.helpUrl} disabled={readOnly} onChange={(event) => update('helpUrl', event.target.value)} placeholder="https://example.com/help" />
                <span className={HINT}>Shown as “Help” at the foot of the sign-in pages.</span>
            </label>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ads-border-subtle)] pt-3">
                <span className="flex-1 font-[var(--font-mono)] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Saved as login_ui</span>
                <Button disabled={!isDirty || saving || readOnly} onClick={() => setDraft(stored)}>Discard</Button>
                <Button type="primary" icon={<CheckOutlined />} loading={saving} disabled={!isDirty || readOnly} onClick={save}>Save sign-in page</Button>
            </div>
        </div>
            <aside aria-label="Sign-in page preview" className="flex min-w-0 flex-col gap-2 min-[1200px]:sticky min-[1200px]:top-[76px]">
                <div className="flex items-center gap-2">
                    <span className="flex-1 font-medium">Preview</span>
                    <a href="/login" target="_blank" rel="noreferrer" className="text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-accent)]">Open the sign-in page</a>
                </div>
                <SignInPreview page={previewPage} />
                <span className={HINT}>Forgot password, the one-time code pages and password change use the same layout.</span>
            </aside>
        </div>
    );
}
