import { Button, Input, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import { useEffect, useState } from 'react';
import { useAuthProvider } from '../../core/provider/AuthProvider';
import { resolvePostLoginPath } from '../../core/navigation/routeResolver';

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
            await authProvider.verifyOtpLogin({
                challengeToken,
                code: normalizedCode,
                email,
            });
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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-[400px] rounded-lg bg-white px-10 py-12 shadow-sm ring-1 ring-black/5">

                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/otp_request', { state: { from } })}
                    className="!mb-6 !px-0 !text-slate-600"
                >
                    Back
                </Button>

                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950">
                        <MailOutlined className="text-xl text-white" />
                    </div>
                    <Title level={3} className="!mb-1 !text-xl">
                        Enter login code
                    </Title>
                    <Text type="secondary">
                        We sent a 6-digit login code to <strong className="text-slate-950">{email}</strong>
                    </Text>
                </div>

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
                    <div className="mb-4 text-center text-[13px] text-slate-500">
                        Checking code...
                    </div>
                )}

                <div className="text-center">
                    <span className="text-[13px] text-slate-500">Didn't receive a code? </span>
                    <Button
                        type="link"
                        loading={resending}
                        onClick={handleResend}
                        className="!px-0 !text-[13px] !text-slate-700"
                    >
                        Resend
                    </Button>
                </div>

            </div>
        </div>
    );
}
