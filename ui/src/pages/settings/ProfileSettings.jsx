import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Button, Card, Col, Divider, Form, Input, Row,
    Space, Tag, Typography, Upload,
} from 'antd';
import {
    CameraOutlined, CheckCircleFilled, KeyOutlined, LockOutlined, MailOutlined,
    PhoneOutlined, SafetyCertificateOutlined, SaveOutlined, UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import apiClient from '../../services/apiClient';
import useNotification from '../../hooks/useNotification';
import queryKeys from '../../core/queryKeys';
import './ProfileSettings.css';

const { Paragraph, Text, Title } = Typography;

function initials(name = '') {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

export default function ProfileSettings() {
    const storedUser = useAuthStore((state) => state.user);
    const user = useMemo(() => storedUser ?? {}, [storedUser]);
    const roles = useAuthStore((state) => state.roles) ?? [];
    const permissions = useAuthStore((state) => state.permissions) ?? [];
    const resources = useAuthStore((state) => state.resources) ?? [];
    const authProvider = useAuthProvider();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { message } = useNotification();
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const watchedName = Form.useWatch('name', profileForm) ?? user.name;

    useEffect(() => {
        profileForm.setFieldsValue({
            name: user.name ?? '',
            email: user.email ?? '',
            phoneNo: user.phone_no ?? '',
        });
    }, [profileForm, user]);

    const saveProfile = async (values) => {
        setSavingProfile(true);
        try {
            await apiClient.patch('/auth/profile', {
                name: values.name,
                phoneNo: values.phoneNo || null,
            });
            await queryClient.refetchQueries({ queryKey: ['auth_user'], type: 'active' });
            await queryClient.refetchQueries({ queryKey: queryKeys.bootstrap(), exact: true, type: 'active' });
            message.success('Profile details updated.');
        } catch (error) {
            message.error(error?.message || 'Unable to update your profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const validateAvatar = (file) => {
        const validType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
        if (!validType) {
            message.error('Choose a JPEG, PNG, WebP, or GIF image.');
            return Upload.LIST_IGNORE;
        }
        if (file.size > 5 * 1024 * 1024) {
            message.error('Profile images must be smaller than 5 MB.');
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
            message.success('Profile image updated.');
            onSuccess?.(response.data);
        } catch (error) {
            message.error(error?.message || 'Unable to upload the profile image.');
            onError?.(error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const changePassword = async (values) => {
        setSavingPassword(true);
        try {
            await authProvider.changePassword({
                oldPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('Password changed. Sign in again with your new password.');
            navigate('/login', { replace: true });
        } catch (error) {
            message.error(error?.message || 'Unable to change your password.');
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <main className="profile-page">
            <header className="profile-page__header">
                <div>
                    <Text className="profile-page__kicker">ACCOUNT / PERSONAL WORKSPACE</Text>
                    <Title level={2}>Profile settings</Title>
                    <Paragraph>Keep your identity current and review the access inherited from your assigned roles.</Paragraph>
                </div>
                <Tag icon={<CheckCircleFilled />} color="success">Authenticated session</Tag>
            </header>

            <Row gutter={[20, 20]} align="stretch">
                <Col xs={24} lg={8} xl={7}>
                    <Card className="profile-identity-card">
                        <div className="profile-identity-card__accent" />
                        <div className="profile-avatar-control">
                            <Avatar size={88} src={user.avatar || user.profile_picture || undefined}>{initials(watchedName)}</Avatar>
                            <Upload
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                beforeUpload={validateAvatar}
                                customRequest={uploadAvatar}
                                showUploadList={false}
                                maxCount={1}
                            >
                                <Button
                                    className="profile-avatar-control__button"
                                    shape="circle"
                                    icon={<CameraOutlined />}
                                    loading={uploadingAvatar}
                                    disabled={uploadingAvatar}
                                    aria-label="Upload profile image"
                                />
                            </Upload>
                        </div>
                        <Title level={3}>{watchedName || 'Your profile'}</Title>
                        <Text>{user.email}</Text>
                        <Space wrap className="profile-identity-card__roles">
                            {roles.map((role) => <Tag key={String(role)}>{String(role)}</Tag>)}
                        </Space>
                        <Divider />
                        <div className="profile-access-summary">
                            <div><strong>{permissions.length}</strong><span>Permissions</span></div>
                            <div><strong>{resources.length}</strong><span>Routes</span></div>
                        </div>
                        <Text type="secondary">Effective access is computed from roles and updates automatically.</Text>
                    </Card>
                </Col>

                <Col xs={24} lg={16} xl={17}>
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Card className="profile-card" title={<><UserOutlined /> Personal information</>}>
                            <Alert
                                className="profile-card__note"
                                type="info"
                                showIcon
                                message="Your email and user ID are identity fields and cannot be changed here."
                            />
                            <Form form={profileForm} layout="vertical" requiredMark={false} onFinish={saveProfile}>
                                <Row gutter={16}>
                                    <Col xs={24} md={12}>
                                        <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2, max: 80 }]}>
                                            <Input prefix={<UserOutlined />} autoComplete="name" placeholder="Your full name" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item name="email" label="Email address">
                                            <Input prefix={<MailOutlined />} disabled />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item name="phoneNo" label="Phone number">
                                            <Input prefix={<PhoneOutlined />} autoComplete="tel" placeholder="Your phone number" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <div className="profile-card__actions">
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingProfile}>
                                        Save profile
                                    </Button>
                                </div>
                            </Form>
                        </Card>

                        <Card className="profile-card" title={<><LockOutlined /> Password and security</>}>
                            <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={changePassword}>
                                <Row gutter={16}>
                                    <Col xs={24} md={8}>
                                        <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
                                            <Input.Password prefix={<KeyOutlined />} autoComplete="current-password" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 8 }]}>
                                            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            name="confirmPassword"
                                            label="Confirm password"
                                            dependencies={['newPassword']}
                                            rules={[
                                                { required: true },
                                                ({ getFieldValue }) => ({
                                                    validator(_, value) {
                                                        return !value || getFieldValue('newPassword') === value
                                                            ? Promise.resolve()
                                                            : Promise.reject(new Error('Passwords do not match.'));
                                                    },
                                                }),
                                            ]}
                                        >
                                            <Input.Password prefix={<SafetyCertificateOutlined />} autoComplete="new-password" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <div className="profile-card__actions profile-card__actions--security">
                                    <Text type="secondary">Changing your password closes the current authenticated session.</Text>
                                    <Button htmlType="submit" icon={<LockOutlined />} loading={savingPassword}>Change password</Button>
                                </div>
                            </Form>
                        </Card>
                    </Space>
                </Col>
            </Row>
        </main>
    );
}
