import { Form, Input, Button, Radio } from 'antd';
import { MailOutlined, PhoneOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import { useCustomMutation } from '../../core/hooks/data/useCustom';
import { useState } from 'react';

export default function OtpRequest() {
    const navigate = useNavigate();
    const { alert, AlertJsx } = useNotification();
    const [channel, setChannel] = useState('email');

    const { mutate, isPending } = useCustomMutation({
        mutationOptions: {
            onSuccess: (_, variables) => {
                navigate('/verify_otp', {
                    state: {
                        channel: variables.payload.channel,
                        value: variables.payload.value,
                    },
                });
            },
            onError: (err) => {
                alert.error(
                    'Failed to send OTP',
                    err?.message || 'Something went wrong. Please try again.'
                );
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

                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/login')}
                    style={{ padding: 0, color: '#595959', marginBottom: 24, fontSize: 13 }}
                >
                    Back to sign in
                </Button>

                <div style={{ marginBottom: 32 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#141414' }}>
                        Two-factor authentication
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                        We'll send a one-time code to verify your identity
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <Form
                    layout="vertical"
                    onFinish={(values) => mutate({
                        url: 'auth/otp/send',
                        method: 'post',
                        payload: { channel, value: values.value },
                    })}
                    requiredMark={false}
                    size="large"
                >
                    <Form.Item
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Send code via</span>}
                    >
                        <Radio.Group
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            style={{ display: 'flex', gap: 12 }}
                        >
                            <Radio.Button value="email" style={{ flex: 1, textAlign: 'center', borderRadius: 6 }}>
                                Email
                            </Radio.Button>
                            <Radio.Button value="sms" style={{ flex: 1, textAlign: 'center', borderRadius: 6 }}>
                                SMS
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="value"
                        label={
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                                {channel === 'email' ? 'Email address' : 'Phone number'}
                            </span>
                        }
                        rules={[
                            { required: true, message: `${channel === 'email' ? 'Email' : 'Phone number'} is required` },
                            ...(channel === 'email'
                                ? [{ type: 'email', message: 'Enter a valid email' }]
                                : [{ pattern: /^\+?[0-9]{7,15}$/, message: 'Enter a valid phone number' }]
                            ),
                        ]}
                    >
                        <Input
                            prefix={
                                channel === 'email'
                                    ? <MailOutlined style={{ color: '#bfbfbf' }} />
                                    : <PhoneOutlined style={{ color: '#bfbfbf' }} />
                            }
                            placeholder={channel === 'email' ? 'you@example.com' : '+1234567890'}
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
                            Send code
                        </Button>
                    </Form.Item>
                </Form>

            </div>
        </div>
    );
}