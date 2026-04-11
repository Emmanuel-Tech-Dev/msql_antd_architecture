import { Form, Input, Button, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useForgotPassword from '../../core/hooks/auth/useForgotPassword';
import useNotification from '../../hooks/useNotification';
import { useState } from 'react';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { alert, AlertJsx } = useNotification();
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');

    const { mutate, isPending } = useForgotPassword({
        mutationOptions: {
            onSuccess: () => setSent(true),
            onError: (err) => alert.error('Request failed', err?.message || 'Something went wrong. Please try again.'),
        },
    });

    const cardStyle = {
        width: 400,
        background: '#fff',
        borderRadius: 8,
        padding: '48px 40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
    };

    if (sent) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <Result
                        status="success"
                        title="Check your email"
                        subTitle={
                            <span style={{ color: '#595959', fontSize: 14 }}>
                                We sent a reset link to <strong>{email}</strong>.
                                The link expires in 20 minutes.
                            </span>
                        }
                        extra={
                            <Button
                                type="link"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/login')}
                                style={{ color: '#595959' }}
                            >
                                Back to sign in
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div style={cardStyle}>

                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/login')}
                    style={{ padding: 0, color: '#595959', marginBottom: 24, fontSize: 13 }}
                >
                    Back to sign in
                </Button>

                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#141414' }}>
                        Reset password
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <Form
                    layout="vertical"
                    onFinish={(values) => {
                        setEmail(values.email);
                        mutate({ email: values.email });
                    }}
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
                            Send reset link
                        </Button>
                    </Form.Item>
                </Form>

            </div>
        </div>
    );
}