import { Form, Input, Button } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import useChangePassword from '../../core/hooks/auth/useChangePassword';

export default function ChangePassword() {
    const navigate = useNavigate();
    const { alert, AlertJsx, message } = useNotification();

    const { mutate, isPending } = useChangePassword({
        mutationOptions: {
            onSuccess: () => {
                message.success('Password changed. Please sign in again.');
                navigate('/login', { replace: true });
            },
            onError: (err) => {
                alert.error(
                    'Failed to change password',
                    err?.message || 'Current password may be incorrect.'
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
                    onClick={() => navigate(-1)}
                    style={{ padding: 0, color: '#595959', marginBottom: 24, fontSize: 13 }}
                >
                    Back
                </Button>

                <div style={{ marginBottom: 32 }}>
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
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#141414', textAlign: 'center' }}>
                        Change password
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14, textAlign: 'center' }}>
                        You'll be signed out after changing your password
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <Form
                    layout="vertical"
                    onFinish={(values) => mutate(values)}
                    requiredMark={false}
                    size="large"
                >
                    <Form.Item
                        name="oldPassword"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Current password</span>}
                        rules={[{ required: true, message: 'Current password is required' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Form.Item
                        name="newPassword"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>New password</span>}
                        rules={[
                            { required: true, message: 'New password is required' },
                            { min: 8, message: 'At least 8 characters' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label={<span style={{ fontSize: 13, fontWeight: 500 }}>Confirm new password</span>}
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
                            Update password
                        </Button>
                    </Form.Item>
                </Form>

            </div>
        </div>
    );
}