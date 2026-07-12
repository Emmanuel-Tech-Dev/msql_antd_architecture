import { Button, Form, Input, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import useNotification from '../../hooks/useNotification';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';

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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-[400px] rounded-lg bg-white px-10 py-12 shadow-sm ring-1 ring-black/5">
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/login')}
                    className="!px-0 !text-slate-600"
                >
                    Back to sign in
                </Button>

                <div className="mt-6 mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950">
                        <SafetyOutlined className="text-xl text-white" />
                    </div>
                    <Title level={3} className="!mb-1 !text-xl">
                        Sign in with email code
                    </Title>
                    <Text type="secondary">
                        Enter a registered email and we will send a one-time login code.
                    </Text>
                </div>

                <div className="mb-4">
                    <AlertJsx />
                </div>

                <Form layout="vertical" requiredMark={false} size="large" onFinish={handleSubmit}>
                    <Form.Item
                        name="email"
                        label={<span className="text-[13px] font-medium">Email</span>}
                        rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Enter a valid email' },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-slate-400" />}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        block
                        className="!h-11 !rounded-md !border-slate-950 !bg-slate-950 !font-medium"
                    >
                        Send login code
                    </Button>
                </Form>
            </div>
        </div>
    );
}
