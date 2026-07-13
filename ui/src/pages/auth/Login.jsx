import { Button, Divider, Form, Input, Typography } from 'antd';
import {
    ArrowRightOutlined,
    CheckCircleFilled,
    LockOutlined,
    MailOutlined,
    SafetyOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import useLogin from '../../core/hooks/auth/useLogin';
import useNotification from '../../hooks/useNotification';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';
import './Login.css';

const { Text, Title } = Typography;

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { AlertJsx, message } = useNotification();
    const from = resolvePostLoginPath(location.state?.from);

    const { mutate, isPending } = useLogin({
        mutationOptions: {
            onSuccess: (response) => {
                if (response?.forcedPasswordChange) {
                    navigate('/change_password', {
                        replace: true,
                        state: { from },
                    });
                    return;
                }
                navigate(from, { replace: true });
            },
            onError: () => message.error('Invalid email or password'),
        },
    });

    return (
        <main className="login-shell">
            <section className="login-story" aria-label="Product introduction">
                <div className="login-brand">
                    <span className="login-brand__mark">B</span>
                    <span>Budget Manager</span>
                </div>

                <div className="login-story__content">
                    <Text className="login-kicker">FINANCIAL OPERATIONS / SECURE ACCESS</Text>
                    <Title level={1}>Control the work.<br />See the whole picture.</Title>
                    <Text className="login-story__summary">
                        A focused workspace for decisions, permissions, records, and the systems that keep them reliable.
                    </Text>

                    <div className="login-assurances">
                        <span><CheckCircleFilled /> Role-aware workspace</span>
                        <span><CheckCircleFilled /> Audited administrative actions</span>
                        <span><CheckCircleFilled /> Protected session lifecycle</span>
                    </div>
                </div>

                <div className="login-story__footer">
                    <span>FRAMEWORK STATUS</span>
                    <strong><i /> Operational</strong>
                </div>
            </section>

            <section className="login-access" aria-labelledby="login-title">
                <div className="login-card">
                    <div className="login-card__heading">
                        <span className="login-lock"><LockOutlined /></span>
                        <div>
                            <Text className="login-kicker">WELCOME BACK</Text>
                            <Title id="login-title" level={2}>Sign in to continue</Title>
                            <Text type="secondary">Use your administrator credentials.</Text>
                        </div>
                    </div>

                    <AlertJsx />

                    <Form
                        className="login-form"
                        layout="vertical"
                        onFinish={(values) => mutate(values)}
                        requiredMark={false}
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            label="Email address"
                            rules={[
                                { required: true, message: 'Email is required' },
                                { type: 'email', message: 'Enter a valid email' },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[{ required: true, message: 'Password is required' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Button
                            type="link"
                            className="login-forgot"
                            onClick={() => navigate('/init_psd_recovery')}
                        >
                            Forgot password?
                        </Button>

                        <Button
                            className="login-submit"
                            type="primary"
                            htmlType="submit"
                            loading={isPending}
                            block
                        >
                            Continue to workspace <ArrowRightOutlined />
                        </Button>
                    </Form>

                    <Divider plain>or use passwordless access</Divider>

                    <Button
                        className="login-otp"
                        block
                        size="large"
                        icon={<SafetyOutlined />}
                        onClick={() => navigate('/otp_request', { state: { from } })}
                    >
                        Send me a secure email code
                    </Button>

                    <Text className="login-privacy">
                        Authentication activity is monitored and recorded for account security.
                    </Text>
                </div>
            </section>
        </main>
    );
}
