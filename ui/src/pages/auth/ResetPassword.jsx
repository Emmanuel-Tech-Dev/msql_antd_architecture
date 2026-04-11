import { Form, Input, Button, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useResetPassword from '../../core/hooks/auth/useResetPassword';
import useNotification from '../../hooks/useNotification';
import { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { alert, AlertJsx } = useNotification();
    const [done, setDone] = useState(false);
    const [invalid, setInvalid] = useState(false);
    const [checking, setChecking] = useState(true);


    function verifyToken() {
        if (!token) {
            setInvalid(true);
            setChecking(false);
            return;
        }
        apiClient
            .get(`/auth/verify_reset_token?token=${token}`)
            .then(() => setChecking(false))
            .catch(() => {
                setInvalid(true);
                setChecking(false);
            });
    }

    useEffect(() => {
        verifyToken();
    }, [token]);

    const { mutate, isPending } = useResetPassword({
        mutationOptions: {
            onSuccess: () => setDone(true),
            onError: (err) => alert.error('Reset failed', err?.message || 'The link may have expired. Please request a new one.'),
        },
    });

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
    };

    const cardStyle = {
        width: 400,
        background: '#fff',
        borderRadius: 8,
        padding: '48px 40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
    };

    if (checking) {
        return (
            <div style={containerStyle}>
                <div style={{ ...cardStyle, textAlign: 'center', color: '#8c8c8c', fontSize: 14 }}>
                    Verifying reset link...
                </div>
            </div>
        );
    }

    if (invalid) {
        return (
            <div style={containerStyle}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <Result
                        status="error"
                        title="Invalid or expired link"
                        subTitle="This reset link is no longer valid. Please request a new one."
                        extra={
                            <Button
                                type="primary"
                                onClick={() => navigate('/init_psd_recovery')}
                                style={{ background: '#141414', borderColor: '#141414', borderRadius: 6 }}
                            >
                                Request new link
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div style={containerStyle}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <Result
                        status="success"
                        title="Password updated"
                        subTitle="Your password has been reset successfully. You can now sign in."
                        extra={
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={{ background: '#141414', borderColor: '#141414', borderRadius: 6 }}
                            >
                                Sign in
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>

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
                        Set new password
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                        Must be at least 8 characters
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <Form
                    layout="vertical"
                    onFinish={(values) => mutate({ token, password: values.password })}
                    requiredMark={false}
                    size="large"
                >
                    <Form.Item
                        name="password"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>New password</span>}
                        rules={[
                            { required: true, message: 'Password is required' },
                            { min: 8, message: 'At least 8 characters' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="••••••••"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirm"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Confirm password</span>}
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
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="••••••••"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
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
                            Reset password
                        </Button>
                    </Form.Item>
                </Form>

            </div>
        </div>
    );
}