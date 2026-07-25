import { Button, Form, Input, Result, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useForgotPassword from '../../core/hooks/auth/useForgotPassword';
import useNotification from '../../hooks/useNotification';
import AuthShell, { AuthIcon } from './AuthShell';

const { Text, Title } = Typography;

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { alert, AlertJsx } = useNotification();
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');

    const { mutate, isPending } = useForgotPassword({
        mutationOptions: {
            onSuccess: () => setSent(true),
            onError: (err) => alert.error(
                'Request failed',
                err?.message || 'Something went wrong. Please try again.',
            ),
        },
    });

    if (sent) {
        return (
            <AuthShell>
                <Result
                    className="!p-0 [&_.ant-result-subtitle]:!text-[var(--ads-text-muted)]"
                    status="success"
                    title="Check your email"
                    subTitle={
                        <span>
                            We sent a reset link to <strong>{email}</strong>.
                            {' '}The link expires in 20 minutes.
                        </span>
                    }
                    extra={
                        <Button
                            type="link"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/login')}
                        >
                            Back to sign in
                        </Button>
                    }
                />
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
                className="!mb-6 !h-auto !px-0 !text-xs"
            >
                Back to sign in
            </Button>

            <header className="mb-6 text-center">
                <AuthIcon><MailOutlined /></AuthIcon>
                <Title level={3} className="!mb-1 !text-xl !text-[var(--ads-text-heading)]">
                    Reset password
                </Title>
                <Text className="!text-[var(--ads-text-muted)]">
                    Enter your email and we will send you a reset link.
                </Text>
            </header>

            <div className="mb-4"><AlertJsx /></div>

            <Form
                className="[&_.ant-form-item-label>label]:!text-[13px] [&_.ant-form-item-label>label]:!font-medium [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)]"
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

                <Form.Item className="!mb-0">
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={isPending}
                        block
                        className="!h-11 !rounded-[var(--ads-radius-md)] !font-medium"
                    >
                        Send reset link
                    </Button>
                </Form.Item>
            </Form>
        </AuthShell>
    );
}
