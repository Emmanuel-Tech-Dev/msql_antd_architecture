// src/components/auth/ChangePasswordModal.jsx

import { Form, Input, Button, Modal } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import useNotification from '../../hooks/useNotification';
import useChangePassword from '../../core/hooks/auth/useChangePassword';
import { useNavigate } from 'react-router-dom';

export default function ChangePasswordModal({ open, onClose }) {
    const navigate = useNavigate();
    const { alert, AlertJsx, message } = useNotification();
    const [form] = Form.useForm();

    const { mutate, isPending } = useChangePassword({
        mutationOptions: {
            onSuccess: () => {
                message.success('Password changed. Please sign in again.');
                form.resetFields();
                onClose?.();
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
        <Modal
            title="Change Password"
            open={open}
            onCancel={() => {
                form.resetFields();
                onClose?.();
            }}
            footer={null}
            width={420}
            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                <p style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 20 }}>
                    You'll be signed out after changing your password.
                </p>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <Form
                    form={form}
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

                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
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
        </Modal>
    );
}