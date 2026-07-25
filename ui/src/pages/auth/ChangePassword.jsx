import { Button, Form, Input, Typography } from 'antd';
import { ArrowRightOutlined, LockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import useChangePassword from '../../core/hooks/auth/useChangePassword';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';
import AuthShell, { AuthIcon } from './AuthShell';

const { Text, Title } = Typography;

export default function ChangePassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { alert, AlertJsx, message } = useNotification();
    const from = resolvePostLoginPath(location.state?.from);

    const { mutate, isPending } = useChangePassword({
        mutationOptions: {
            onSuccess: () => {
                message.success('Password changed. Please sign in again.');
                navigate('/login', { replace: true });
            },
            onError: (err) => {
                alert.error(
                    'Failed to change password',
                    err?.message || 'Current password may be incorrect.',
                );
            },
        },
    });

    return (
        <AuthShell>
            <Button
                type="link"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate(from, { replace: true })}
                className="!mb-6 !h-auto !px-0 !text-xs"
            >
                Skip for now
            </Button>

            <header className="mb-8 text-center">
                <AuthIcon><LockOutlined /></AuthIcon>
                <Title level={3} className="!mb-1 !text-xl !text-[var(--ads-text-heading)]">
                    Change password
                </Title>
                <Text className="!text-[var(--ads-text-muted)]">
                    Your temporary password is your email address. You can update it now or skip for this session.
                </Text>
            </header>

            <div className="mb-4"><AlertJsx /></div>

            <Form
                className="[&_.ant-form-item-label>label]:!text-[13px] [&_.ant-form-item-label>label]:!font-medium [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)]"
                layout="vertical"
                onFinish={(values) => mutate(values)}
                requiredMark={false}
                size="large"
            >
                <Form.Item
                    name="oldPassword"
                    label="Current password"
                    rules={[{ required: true, message: 'Current password is required' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined className="text-[var(--ads-text-subtle)]" />}
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />
                </Form.Item>

                <Form.Item
                    name="newPassword"
                    label="New password"
                    rules={[
                        { required: true, message: 'New password is required' },
                        { min: 8, message: 'At least 8 characters' },
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined className="text-[var(--ads-text-subtle)]" />}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="Confirm new password"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Please confirm your new password' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Passwords do not match'));
                            },
                        }),
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined className="text-[var(--ads-text-subtle)]" />}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                </Form.Item>

                <Form.Item className="!mb-0">
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={isPending}
                        block
                        className="!h-11 !rounded-[var(--ads-radius-md)] !font-medium"
                    >
                        Update password
                    </Button>
                </Form.Item>
            </Form>
        </AuthShell>
    );
}
