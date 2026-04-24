import { Form, Input, Button, Divider } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useLogin from '../../core/hooks/auth/useLogin';
import useNotification from '../../hooks/useNotification';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { alert, AlertJsx, message } = useNotification();
    const from = location.state?.from ?? '/admin/home';

    const { mutate, isPending } = useLogin({
        mutationOptions: {
            onSuccess: () => navigate(from, { replace: true }),
            onError: (err) => {
                message.error('Invalid email or password');
                console.error('Login error:', err);
            },
        },
    });

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
        }}>
            <div style={{
                width: 400,
                background: '#fff',
                borderRadius: 8,
                padding: '48px 40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
            }}>

                <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        background: '#141414',
                        borderRadius: 8,
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <LockOutlined style={{ color: '#fff', fontSize: 20 }} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#141414' }}>
                        Sign in
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                        Enter your credentials to continue
                    </p>
                </div>




                <Form
                    layout="vertical"
                    initialValues={{
                        email: "emmanuelkusi345@gmail.com",
                        password: "root@user1"
                    }}
                    onFinish={(values) => mutate(values)}
                    requiredMark={false}
                    size="large"
                >
                    <Form.Item
                        name="email"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Email</span>}
                        rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Enter a valid email' },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={"emmanuelkusi345@gmail.com"}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Password</span>}
                        rules={[{ required: true, message: 'Password is required' }]}
                        style={{ marginBottom: 8 }}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={"root@user1"}
                        />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginBottom: 24 }}>
                        <Button
                            type="link"
                            style={{ padding: 0, fontSize: 13, color: '#595959' }}
                            onClick={() => navigate('/init_psd_recovery')}
                        >
                            Forgot password?
                        </Button>
                    </div>

                    <Form.Item style={{ marginBottom: 12 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isPending}
                            block
                            style={{
                                background: '#141414',
                                borderColor: '#141414',
                                height: 44,
                                borderRadius: 6,
                                fontWeight: 500,
                            }}
                        >
                            Sign in
                        </Button>
                    </Form.Item>
                </Form>

                <Divider style={{ color: '#bfbfbf', fontSize: 12 }}>or</Divider>

                <Button
                    block
                    size="large"
                    style={{
                        height: 44,
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                    </svg>
                    Continue with Google
                </Button>

            </div>
        </div>
    );
}