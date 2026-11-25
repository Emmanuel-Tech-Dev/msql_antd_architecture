import { Button, Form, Input, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import useNotification from '../../hooks/useNotification';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';
import AuthShell, { AuthIcon } from './AuthShell';

const { Text, Title } = Typography;

export default function OtpRequest() {
    const navigate = useNavigate();
    const location = useLocation();
    const authProvider = useAuthProvider();
    const { alert, AlertJsx } = useNotification();
    const [submitting, setSubmitting] = useState(false);
    const from = resolvePostLoginPath(location.state?.from);

    async function handleSubmit(values) {
        try {
            setSubmitting(true);
            const response = await authProvider.requestOtpLogin(values);
            navigate('/verify_otp', {
                replace: true,
                state: {
                    challengeToken: response.challengeToken,
                    email: response.email ?? values.email,
                    from,
                    mode: 'email-login',
                },
            });
        } catch (err) {
            alert.error(
                'Unable to send code',
                err?.response?.data?.message || err?.message || 'Confirm the email is registered and try again.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell>
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/login')}
                    className="!h-auto !px-0 !text-xs"
                >
                    Back to sign in
                </Button>

                <header className="mb-8 mt-6 text-center">
                    <AuthIcon><SafetyOutlined /></AuthIcon>
                    <Title level={3} className="!mb-1 !text-xl !text-[var(--ads-text-heading)]">
                        Sign in with email code
                    </Title>
                    <Text className="!text-[var(--ads-text-muted)]">
                        Enter a registered email and we will send a one-time login code.
                    </Text>
                </header>

                <div className="mb-4">
                    <AlertJsx />
                </div>

                <Form
                    className="[&_.ant-form-item-label>label]:!text-[13px] [&_.ant-form-item-label>label]:!font-medium [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)]"
                    layout="vertical"
                    requiredMark={false}
                    size="large"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Enter a valid email' },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-[var(--ads-text-subtle)]" />}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        block
                        className="!h-11 !rounded-[var(--ads-radius-md)] !font-medium"
                    >
                        Send login code
                    </Button>
                </Form>
        </AuthShell>
    );
}
