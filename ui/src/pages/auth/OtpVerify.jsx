import { Button, Result, Input } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import useAuthStore from '../../store/authStore';
import { useCustomMutation } from '../../core/hooks/data/useCustom';
import { useEffect, useState } from 'react';

export default function OtpVerify() {
    const navigate = useNavigate();
    const location = useLocation();
    const { alert, AlertJsx } = useNotification();
    const setAuth = useAuthStore((s) => s.setAuth);
    const { channel, value } = location.state ?? {};
    const [done, setDone] = useState(false);
    const [otp, setOtp] = useState('');



    useEffect(() => {
        if (!channel || !value) {
            alert.error('Invalid access', 'No verification details found. Please request a new code.');
            navigate('/otp_request', { replace: true });
        }
    }, [channel, value, alert, navigate]);


    const { mutate: verify, isPending: verifying } = useCustomMutation({
        mutationOptions: {
            onSuccess: (res) => {
                if (res?.data?.token) {
                    sessionStorage.setItem('access_token', res.data.token);
                    setAuth(res.data.user ?? { email: value }, res.data.token);
                }
                setDone(true);
            },
            onError: (err) => {
                alert.error('Invalid code', err?.message || 'The code is incorrect or has expired.');
                setOtp('');
            },
        },
    });

    const { mutate: resend, isPending: resending } = useCustomMutation({
        mutationOptions: {
            onSuccess: () => setOtp(''),
            onError: (err) => alert.error('Failed to resend', err?.message || 'Try again.'),
        },
    });

    function handleSubmit() {
        if (otp.length < 6) {
            alert.error('Incomplete code', 'Please enter all 6 digits');
            return;
        }
        verify({
            url: 'auth/otp/verify',
            method: 'post',
            payload: { channel, value, code: otp },
        });
    }






    if (done) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div style={{ width: 400, background: '#fff', borderRadius: 8, padding: '48px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                    <Result
                        status="success"
                        title="Verified"
                        subTitle="Your identity has been confirmed."
                        extra={
                            <Button
                                type="primary"
                                onClick={() => navigate('/admin/home', { replace: true })}
                                style={{ background: '#141414', borderColor: '#141414', borderRadius: 6 }}
                            >
                                Continue
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div style={{ width: 400, background: '#fff', borderRadius: 8, padding: '48px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)' }}>

                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/otp_request')}
                    style={{ padding: 0, color: '#595959', marginBottom: 24, fontSize: 13 }}
                >
                    Back
                </Button>

                <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#141414' }}>
                        Enter verification code
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                        We sent a 6-digit code to{' '}
                        <strong style={{ color: '#141414' }}>{value}</strong>
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <AlertJsx />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                    <Input.OTP
                        length={6}
                        value={otp}
                        onChange={setOtp}
                        size="large"
                    />
                </div>

                <Button
                    type="primary"
                    loading={verifying}
                    block
                    onClick={handleSubmit}
                    style={{
                        background: '#141414',
                        borderColor: '#141414',
                        height: 44,
                        borderRadius: 6,
                        fontWeight: 500,
                        marginBottom: 16,
                    }}
                >
                    Verify
                </Button>

                <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#8c8c8c', fontSize: 13 }}>Didn't receive a code? </span>
                    <Button
                        type="link"
                        loading={resending}
                        onClick={() => resend({
                            url: 'auth/otp/send',
                            method: 'post',
                            payload: { channel, value },
                        })}
                        style={{ padding: 0, fontSize: 13, color: '#595959' }}
                    >
                        Resend
                    </Button>
                </div>

            </div>
        </div>
    );
}