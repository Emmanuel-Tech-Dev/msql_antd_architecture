import { Button, Input, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import { useEffect, useState } from 'react';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';
import AuthShell, { AuthIcon } from './AuthShell';

const { Text, Title } = Typography;

export default function OtpVerify() {
    const navigate = useNavigate();
    const location = useLocation();
    const { alert, AlertJsx } = useNotification();
    const authProvider = useAuthProvider();
    const { challengeToken: initialChallengeToken, email } = location.state ?? {};
    const from = resolvePostLoginPath(location.state?.from);
    const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);



    useEffect(() => {
        if (!challengeToken || !email) {
            alert.error('Invalid access', 'No verification details found. Please request a new code.');
            navigate('/otp_request', { replace: true, state: { from } });
        }
    }, [challengeToken, email, alert, navigate, from]);


    async function verifyCode(code) {
        const normalizedCode = String(code).replace(/\s/g, '');

        if (normalizedCode.length < 6 || verifying) {
            return;
        }

        try {
            setVerifying(true);
            const response = await authProvider.verifyOtpLogin({
                challengeToken,
                code: normalizedCode,
                email,
            });
            if (response?.forcedPasswordChange) {
                navigate('/change_password', {
                    replace: true,
                    state: { from },
                });
                return;
            }
            navigate(from, { replace: true });
        } catch (err) {
            alert.error('Invalid code', err?.response?.data?.message || err?.message || 'The code is incorrect or has expired.');
            setOtp('');
        } finally {
            setVerifying(false);
        }
    }

    function handleOtpChange(value) {
        setOtp(value);

        if (value.length === 6) {
            verifyCode(value);
        }
    }

    async function handleResend() {
        try {
            setResending(true);
            const response = await authProvider.resendOtpLogin({ challengeToken });
            setChallengeToken(response.challengeToken);
            setOtp('');
        } catch (err) {
            alert.error('Failed to resend', err?.response?.data?.message || err?.message || 'Try again.');
        } finally {
            setResending(false);
        }
    }
    return (
        <AuthShell>

                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/otp_request', { state: { from } })}
                    className="!mb-6 !h-auto !px-0 !text-xs"
                >
                    Back
                </Button>

                <header className="mb-8 text-center">
                    <AuthIcon><MailOutlined /></AuthIcon>
                    <Title level={3} className="!mb-1 !text-xl !text-[var(--ads-text-heading)]">
                        Enter login code
                    </Title>
                    <Text className="!text-[var(--ads-text-muted)]">
                        We sent a 6-digit login code to <strong className="text-[var(--ads-text-heading)]">{email}</strong>
                    </Text>
                </header>

                <div className="mb-4">
                    <AlertJsx />
                </div>

                <div className="mb-8 flex justify-center">
                    <Input.OTP
                        length={6}
                        value={otp}
                        onChange={handleOtpChange}
                        disabled={verifying}
                        size="large"
                    />
                </div>

                {verifying && (
                    <div className="mb-4 text-center text-[13px] text-[var(--ads-text-muted)]">
                        Checking code...
                    </div>
                )}

                <div className="text-center">
                    <span className="text-[13px] text-[var(--ads-text-muted)]">Didn't receive a code? </span>
                    <Button
                        type="link"
                        loading={resending}
                        onClick={handleResend}
                        className="!h-auto !px-0 !text-[13px]"
                    >
                        Resend
                    </Button>
                </div>

        </AuthShell>
    );
}
