import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Form, Input, Segmented, Tag, Tooltip, Typography, Upload } from 'antd';
import { CameraOutlined, CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import { isPrivilegedRole } from '../../core/provider/AccessProvider';
import { useBrowserRoutes } from '../../core/provider/ResourceProvider';
import apiClient from '../../services/apiClient';
import useNotification from '../../hooks/useNotification';
import { useTheme } from '../../hooks/useTheme';
import queryKeys from '../../core/queryKeys';
import utils from '../../utils/function_utils';
import './ProfileSettings.css';

const { Paragraph, Text, Title } = Typography;

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACTION_LABELS = { read: 'View', create: 'Add', update: 'Edit', delete: 'Delete' };
const ACTION_ORDER = ['read', 'create', 'update', 'delete'];

// "read:invoices", "create:invoices", "approve:invoices" → Invoices: View · Add · Approve.
function accessByArea(permissions) {
    const areas = new Map();
    for (const permission of permissions) {
        const [action, ...rest] = String(permission).split(':');
        const area = rest.join(':');
        if (!area) continue;
        if (!areas.has(area)) areas.set(area, new Set());
        areas.get(area).add(action);
    }
    const rank = (action) => (ACTION_ORDER.includes(action) ? ACTION_ORDER.indexOf(action) : ACTION_ORDER.length);
    return [...areas.entries()]
        .map(([area, actions]) => ({
            area,
            label: utils.humanize(area.replaceAll(':', ' ')),
            actions: [...actions].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((action) => ACTION_LABELS[action] ?? utils.humanize(action)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

function passwordChecks(password = '', current = '') {
    return {
        required: [
            { label: 'At least 8 characters', met: password.length >= 8 },
            { label: 'Different from your current password', met: Boolean(password) && password !== current },
        ],
        tips: [
            { label: 'A number', met: /\d/.test(password) },
            { label: 'An upper-case letter', met: /[A-Z]/.test(password) },
            { label: 'A symbol', met: /[^A-Za-z0-9]/.test(password) },
        ],
    };
}

// "From your roles, Admin and Finance."
function rolesSentence(roles) {
    if (!roles.length) return 'You have no role yet.';
    const names = roles.length > 1 ? `${roles.slice(0, -1).join(', ')} and ${roles.at(-1)}` : roles[0];
    return `From your role${roles.length > 1 ? 's' : ''}, ${names}.`;
}

function AccountFact({ label, children }) {
    return (
        <div className="profile-fact">
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

export default function ProfileSettings() {
    const storedUser = useAuthStore((state) => state.user);
    const user = useMemo(() => storedUser ?? {}, [storedUser]);
    const roles = useAuthStore((state) => state.roles) ?? [];
    const permissions = useAuthStore((state) => state.permissions);
    const browserRoutes = useBrowserRoutes();
    const authProvider = useAuthProvider();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { message } = useNotification();
    const { preference, setPreference } = useTheme();
    const [detailsForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [savingDetails, setSavingDetails] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [copied, setCopied] = useState(false);

    const name = Form.useWatch('name', detailsForm);
    const phone = Form.useWatch('phoneNo', detailsForm);
    const newPassword = Form.useWatch('newPassword', passwordForm) ?? '';
    const currentPassword = Form.useWatch('currentPassword', passwordForm) ?? '';
    const shownName = name ?? user.name;
    const detailsChanged = (name ?? user.name ?? '') !== (user.name ?? '') || (phone ?? user.phone_no ?? '') !== (user.phone_no ?? '');
    const checks = passwordChecks(newPassword, currentPassword);
    const strength = newPassword ? checks.required.filter((c) => c.met).length + checks.tips.filter((c) => c.met).length : 0;

    const privileged = isPrivilegedRole(roles);
    const areas = useMemo(() => accessByArea(permissions ?? []), [permissions]);
    const pages = useMemo(
        () => browserRoutes.filter((route) => route.resource && !String(route.resource_path ?? '').includes(':')),
        [browserRoutes],
    );
    const roleNames = roles.map((role) => String(role));

    const showSavedDetails = useCallback(
        () => detailsForm.setFieldsValue({ name: user.name ?? '', phoneNo: user.phone_no ?? '' }),
        [detailsForm, user],
    );
    useEffect(() => { showSavedDetails(); }, [showSavedDetails]);

    const refreshAccount = async () => {
        await queryClient.refetchQueries({ queryKey: ['auth_user'], type: 'active' });
        await queryClient.refetchQueries({ queryKey: queryKeys.bootstrap(), exact: true, type: 'active' });
    };

    const saveDetails = async (values) => {
        setSavingDetails(true);
        try {
            await apiClient.patch('/auth/profile', { name: values.name, phoneNo: values.phoneNo || null });
            await refreshAccount();
            message.success('Your details are saved.');
        } catch (error) {
            message.error(error?.message || 'Your details could not be saved.');
        } finally {
            setSavingDetails(false);
        }
    };

    const checkAvatar = (file) => {
        if (!AVATAR_TYPES.includes(file.type)) {
            message.error('Choose a JPEG, PNG, WebP or GIF image.');
            return Upload.LIST_IGNORE;
        }
        if (file.size > 5 * 1024 * 1024) {
            message.error('The photo must be smaller than 5 MB.');
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const uploadAvatar = async ({ file, onSuccess, onError }) => {
        setUploadingAvatar(true);
        try {
            const payload = new FormData();
            payload.append('avatar', file);
            const response = await apiClient.post('/auth/profile/avatar', payload);
            await queryClient.refetchQueries({ queryKey: ['auth_user'], type: 'active' });
            message.success('Your photo is updated.');
            onSuccess?.(response.data);
        } catch (error) {
            message.error(error?.message || 'The photo could not be uploaded.');
            onError?.(error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const changePassword = async (values) => {
        setSavingPassword(true);
        try {
            await authProvider.changePassword({ oldPassword: values.currentPassword, newPassword: values.newPassword });
            message.success('Password changed. Sign in again with your new password.');
            navigate('/login', { replace: true });
        } catch (error) {
            message.error(error?.message || 'Your password could not be changed.');
        } finally {
            setSavingPassword(false);
        }
    };

    const copyUserId = async () => {
        if (await utils.copyText(user.custom_id ?? '')) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } else {
            message.error('The user ID could not be copied.');
        }
    };

    const active = Number(user.status ?? 1) === 1;
    const signInMethod = user.oauth_provider ? `${utils.humanize(user.oauth_provider)} account` : 'Email and password';

    return (
        <main className="profile-page">
            <Text className="profile-page__crumb">Settings / Profile</Text>

            <section className="profile-band" aria-label="Your account">
                <div className="profile-band__identity">
                    <div className="profile-band__photo">
                        <Avatar size={96} src={user.avatar || user.profile_picture || undefined} alt="">{utils.initials(shownName)}</Avatar>
                        <Upload accept={AVATAR_TYPES.join(',')} beforeUpload={checkAvatar} customRequest={uploadAvatar} showUploadList={false} maxCount={1}>
                            <Tooltip title="Change photo (JPEG, PNG, WebP or GIF, up to 5 MB)">
                                <Button className="profile-band__camera" shape="circle" icon={<CameraOutlined />} loading={uploadingAvatar} aria-label="Change photo" />
                            </Tooltip>
                        </Upload>
                    </div>
                    <div className="profile-band__name">
                        <Title level={1}>{shownName || 'Your profile'}</Title>
                        <Text type="secondary">{user.email}</Text>
                        {roleNames.length > 0 && (
                            <div className="profile-band__roles">
                                {roleNames.map((role) => <Tag key={role} className="profile-role">{role}</Tag>)}
                            </div>
                        )}
                    </div>
                </div>
                <dl className="profile-band__facts">
                    <AccountFact label="Account">
                        <span className={active ? 'profile-status profile-status--active' : 'profile-status'}>{active ? 'Active' : 'Suspended'}</span>
                    </AccountFact>
                    <AccountFact label="Signs in with">{signInMethod}</AccountFact>
                    <AccountFact label="Member since">{user.createdAt ? utils.formatDateV3(user.createdAt, 'D MMM YYYY') : '—'}</AccountFact>
                    <AccountFact label="Last sign-in">{user.last_login ? utils.fromNow(user.last_login) : '—'}</AccountFact>
                    <AccountFact label="User ID">
                        <span className="profile-user-id">
                            <code>{user.custom_id ?? '—'}</code>
                            {user.custom_id && (
                                <Tooltip title={copied ? 'Copied' : 'Copy user ID'}>
                                    <Button size="small" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copyUserId} aria-label="Copy user ID" />
                                </Tooltip>
                            )}
                        </span>
                    </AccountFact>
                </dl>
            </section>

            <div className="profile-columns">
                <div className="profile-column">
                    <section className="profile-panel" aria-labelledby="profile-details">
                        <header>
                            <Title level={2} id="profile-details">Your details</Title>
                            <Paragraph>Shown in the header and on records you create.</Paragraph>
                        </header>
                        <Form form={detailsForm} layout="vertical" requiredMark={false} onFinish={saveDetails}>
                            <div className="profile-grid profile-grid--two">
                                <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Enter your name' }, { min: 2, max: 80, message: 'Use 2 to 80 characters' }]}>
                                    <Input autoComplete="name" />
                                </Form.Item>
                                <Form.Item name="phoneNo" label="Phone (optional)">
                                    <Input autoComplete="tel" inputMode="tel" />
                                </Form.Item>
                            </div>
                            <Text type="secondary" className="profile-note">Your email is how you sign in; an administrator can change it.</Text>
                            <div className="profile-actions">
                                {detailsChanged && <Button onClick={showSavedDetails}>Discard</Button>}
                                <Button type="primary" htmlType="submit" disabled={!detailsChanged} loading={savingDetails}>Save details</Button>
                            </div>
                        </Form>
                    </section>

                    <section className="profile-panel" aria-labelledby="profile-password">
                        <header>
                            <Title level={2} id="profile-password">Password</Title>
                            <Paragraph>After changing it you sign in again on this device.</Paragraph>
                        </header>
                        <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={changePassword}>
                            <div className="profile-grid profile-grid--three">
                                <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter your current password' }]}>
                                    <Input.Password autoComplete="current-password" />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label="New password"
                                    dependencies={['currentPassword']}
                                    rules={[
                                        { required: true, message: 'Enter a new password' },
                                        { min: 8, message: 'Use at least 8 characters' },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => (value && value === getFieldValue('currentPassword')
                                                ? Promise.reject(new Error('Choose a password different from your current one'))
                                                : Promise.resolve()),
                                        }),
                                    ]}
                                >
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Repeat new password"
                                    dependencies={['newPassword']}
                                    rules={[
                                        { required: true, message: 'Repeat the new password' },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => (!value || getFieldValue('newPassword') === value
                                                ? Promise.resolve()
                                                : Promise.reject(new Error('The passwords do not match'))),
                                        }),
                                    ]}
                                >
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                            </div>
                            <div className="profile-strength" aria-live="polite">
                                <div className="profile-strength__bar" aria-hidden="true">
                                    {[1, 2, 3, 4].map((step) => (
                                        <span key={step} className={strength >= step + 1 ? `profile-strength__step profile-strength__step--${strength >= 5 ? 'strong' : 'fair'}` : 'profile-strength__step'} />
                                    ))}
                                </div>
                                <ul className="profile-checks">
                                    {checks.required.map((check) => (
                                        <li key={check.label} className={check.met ? 'is-met' : undefined}>{check.met ? '✓' : '○'} {check.label}</li>
                                    ))}
                                    <li className="profile-checks__tip">Stronger with:</li>
                                    {checks.tips.map((check) => (
                                        <li key={check.label} className={check.met ? 'is-met' : undefined}>{check.met ? '✓' : '○'} {check.label}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="profile-actions">
                                <Button htmlType="submit" loading={savingPassword}>Change password</Button>
                            </div>
                        </Form>
                    </section>
                </div>

                <div className="profile-column">
                    <section className="profile-panel" aria-labelledby="profile-access">
                        <header>
                            <Title level={2} id="profile-access">What you can do</Title>
                            <Paragraph>
                                {rolesSentence(roleNames)} An administrator can change them.
                            </Paragraph>
                        </header>
                        {privileged ? (
                            <div className="profile-full-access">Full access: your role can do everything in this workspace.</div>
                        ) : areas.length ? (
                            <ul className="profile-access">
                                {areas.map((entry) => (
                                    <li key={entry.area}>
                                        <span>{entry.label}</span>
                                        <span>{entry.actions.join(' · ')}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="profile-empty">No permissions yet. Ask an administrator for the access you need.</div>
                        )}
                        {pages.length > 0 && (
                            <div className="profile-pages">
                                <Text strong>Pages you can open</Text>
                                <div>{pages.map((route) => <span key={route.resource_path} className="profile-page-chip">{route.resource}</span>)}</div>
                            </div>
                        )}
                    </section>

                    <section className="profile-panel profile-panel--row" aria-labelledby="profile-appearance">
                        <header>
                            <Title level={2} id="profile-appearance">Appearance</Title>
                            <Paragraph>Just for you, on this device.</Paragraph>
                        </header>
                        <Segmented
                            aria-label="Theme"
                            value={preference === 'light' || preference === 'dark' ? preference : 'default'}
                            onChange={(value) => setPreference(value === 'default' ? null : value)}
                            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'default', label: 'Default' }]}
                        />
                    </section>
                </div>
            </div>
        </main>
    );
}
