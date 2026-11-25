import { Button, Form, Input, Result, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useResetPassword from '../../core/hooks/auth/useResetPassword';
import useNotification from '../../hooks/useNotification';
import apiClient from '../../services/apiClient';
import AuthShell, { AuthIcon } from './AuthShell';

const { Text, Title } = Typography;

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { alert, AlertJsx } = useNotification();
    const [done, setDone] = useState(false);
    const [invalid, setInvalid] = useState(false);
    const [checking, setChecking] = useState(Boolean(token));
    const invalidResetLink = !token || invalid;

    useEffect(() => {
        let active = true;

        if (!token) {
            return () => { active = false; };
        }

        apiClient
            .get(`/auth/verify_reset_token?token=${token}`)
            .then(() => {
                if (active) setChecking(false);
            })
            .catch(() => {
                if (!active) return;
                setInvalid(true);
                setChecking(false);
            });

        return () => { active = false; };
    }, [token]);

    const { mutate, isPending } = useResetPassword({
        mutationOptions: {
            onSuccess: () => setDone(true),
            onError: (err) => alert.error(
                'Reset failed',
                err?.message || 'The link may have expired. Please request a new one.',
            ),
        },
    });

    if (checking) {
        return (
            <AuthShell>
                <div className="text-center text-sm text-[var(--ads-text-muted)]">
                    Verifying reset link...
                </div>
            </AuthShell>
        );
    }

    if (invalidResetLink) {
        return (
            <AuthShell>
                <Result
                    className="!p-0"
                    status="error"
                    title="Invalid or expired link"
                    subTitle="This reset link is no longer valid. Please request a new one."
                    extra={
                        <Button type="primary" onClick={() => navigate('/init_psd_recovery')}>
                            Request new link
                        </Button>
                    }
                />
            </AuthShell>
        );
    }

    if (done) {
        return (
            <AuthShell>
                <Result
                    className="!p-0"
                    status="success"
                    title="Password updated"
                    subTitle="Your password has been reset successfully. You can now sign in."
                    extra={
                        <Button type="primary" onClick={() => navigate('/login')}>
                            Sign in
                        </Button>
                    }
                />
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <header className="mb-8 text-center">
                <AuthIcon><LockOutlined /></AuthIcon>
                <Title level={3} className="!mb-1 !text-xl !text-[var(--ads-text-heading)]">
                    Set new password
                </Title>
                <Text className="!text-[var(--ads-text-muted)]">Must be at least 8 characters.</Text>
            </header>

            <div className="mb-4"><AlertJsx /></div>

            <Form
                className="[&_.ant-form-item-label>label]:!text-[13px] [&_.ant-form-item-label>label]:!font-medium [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)]"
                layout="vertical"
                onFinish={(values) => mutate({ token, password: values.password })}
                requiredMark={false}
                size="large"
            >
                <Form.Item
                    name="password"
                    label="New password"
                    rules={[
                        { required: true, message: 'Password is required' },
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
                    name="confirm"
                    label="Confirm password"
                    dependencies={['password']}
                    rules={[
                        { required: true, message: 'Please confirm your password' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
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
                        Reset password
                    </Button>
                </Form.Item>
            </Form>
        </AuthShell>
    );
}
