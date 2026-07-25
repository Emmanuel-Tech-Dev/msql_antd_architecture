import { Button, Divider, Form, Input, Typography } from "antd";
import {
  ArrowRightOutlined,
  BookOutlined,
  LockOutlined,
  MailOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { GoogleLogin } from "@react-oauth/google";
import { useLocation, useNavigate } from "react-router-dom";
import useLogin from "../../core/hooks/auth/useLogin";
import useGoogleLogin from "../../core/hooks/auth/useGoogleLogin";
import useNotification from "../../hooks/useNotification";
import { resolvePostLoginPath } from "../../core/navigation/routeResolver";

const { Text, Title } = Typography;

const flow = [
  ["01", "Capture", "Every request begins in one accountable queue."],
  ["02", "Coordinate", "Ownership, priority, and SLA stay visible."],
  ["03", "Resolve", "Customers get a clear answer and a complete record."],
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { AlertJsx, message } = useNotification();
  const from = resolvePostLoginPath(location.state?.from);

  const finishLogin = (response) => {
    if (response?.forcedPasswordChange) {
      navigate("/change_password", { replace: true, state: { from } });
      return;
    }
    navigate(from, { replace: true });
  };

  const passwordLogin = useLogin({
    mutationOptions: {
      onSuccess: finishLogin,
      onError: (error) =>
        message.error(
          error?.technicalMessage ||
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error?.message ||
            "Invalid email or password",
        ),
    },
  });

  const googleLogin = useGoogleLogin({
    mutationOptions: {
      onSuccess: finishLogin,
      onError: (error) =>
        message.error(
          error?.technicalMessage ||
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error?.message ||
            "Google sign-in could not be completed",
        ),
    },
  });

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[var(--ads-canvas)] text-[var(--ads-text)] lg:grid-cols-[minmax(420px,1.06fr)_minmax(480px,0.94fr)]">
      <section
        className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[var(--ads-surface-raised)] px-5 py-6 sm:min-h-[420px] sm:px-7 sm:py-8 lg:min-h-dvh lg:p-[clamp(30px,4.7vw,72px)]"
        aria-label="Helpdesk introduction"
      >
        <div className="relative z-[1] flex items-center gap-3 font-[var(--font-display)] text-[15px] font-semibold tracking-[-0.02em]">
          <span className="grid size-[38px] place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent)] text-[var(--ads-text-inverse)]" aria-hidden="true">H</span>
          <span>Helpdesk</span>
          <span className="hidden border-l border-[var(--ads-border-subtle)] pl-3 font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.11em] text-[var(--ads-text-muted)] sm:inline">
            Support operations
          </span>
        </div>

        <div className="relative z-[1] my-12 w-full max-w-[650px] lg:my-[clamp(58px,9vh,110px)] lg:mb-12">
          <Text className="!font-[var(--font-mono)] !text-[10px] !font-semibold !tracking-[0.15em] !text-[var(--ads-accent)]">
            ONE QUEUE / SHARED CONTEXT
          </Text>
          <Title
            level={1}
            className="!my-4 !max-w-[650px] !text-[clamp(40px,13vw,56px)] !font-semibold !leading-[0.98] !tracking-[-0.055em] !text-[var(--ads-text-heading)] sm:!text-[clamp(43px,10vw,66px)] lg:!my-[17px] lg:!mb-6 lg:!text-[clamp(48px,5.15vw,78px)]"
          >
            Support work,<br />without the noise.
          </Title>
          <Text className="block max-w-[520px] !text-sm !leading-[1.65] !text-[var(--ads-text-muted)] sm:!text-[clamp(15px,1.25vw,18px)]">
            A focused workspace where requests become owned, measurable, and
            easier to resolve.
          </Text>

          <div className="mt-8 grid max-w-[580px] grid-cols-3 gap-4 border-t border-[var(--ads-border-subtle)] lg:mt-[clamp(42px,6vh,70px)] lg:grid-cols-1 lg:gap-0" aria-label="Support workflow">
            {flow.map(([number, title, description]) => (
              <div className="grid grid-cols-1 gap-2 py-3 lg:grid-cols-[42px_1fr] lg:gap-[10px] lg:border-b lg:border-[var(--ads-border-subtle)] lg:py-[15px]" key={number}>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--ads-accent)] lg:pt-0.5">{number}</span>
                <div>
                  <strong className="block text-[13px] font-semibold text-[var(--ads-text-heading)]">{title}</strong>
                  <p className="mt-1 hidden text-xs leading-[1.45] text-[var(--ads-text-muted)] lg:block">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-[1] hidden items-center justify-between border-t border-[var(--ads-border-subtle)] pt-5 font-[var(--font-mono)] text-[9px] tracking-[0.1em] text-[var(--ads-text-subtle)] lg:flex">
          <span>PROTECTED WORKSPACE</span>
          <strong className="font-medium tracking-[0.04em] text-[var(--ads-text-muted)]">
            <i className="mr-[7px] inline-block size-[7px] rounded-full bg-[var(--ads-success)]" aria-hidden="true" />
            Session security active
          </strong>
        </div>
      </section>

      <section className="relative grid min-h-0 place-items-center bg-[var(--ads-canvas)] px-[18px] pb-14 pt-[74px] lg:min-h-dvh lg:px-[clamp(28px,7vw,100px)] lg:py-[clamp(72px,8vw,118px)]" aria-labelledby="login-title">
        <Button
          className="!absolute !right-[18px] !top-[18px] !h-[38px] !rounded-[var(--ads-radius-md)] !text-xs !font-semibold lg:!right-[26px] lg:!top-6"
          icon={<BookOutlined />}
          onClick={() => navigate("/docs")}
        >
          Framework docs
        </Button>

        <div className="w-full max-w-[420px]">
          <div className="mb-[26px] flex items-start gap-[15px] lg:mb-[30px]">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent-soft)] text-base text-[var(--ads-accent)]" aria-hidden="true"><LockOutlined /></span>
            <div>
              <Text className="!font-[var(--font-mono)] !text-[10px] !font-semibold !tracking-[0.15em] !text-[var(--ads-accent)]">SECURE ACCESS</Text>
              <Title id="login-title" level={2} className="!mb-0.5 !mt-1 !text-[30px] !tracking-[-0.035em] !text-[var(--ads-text-heading)]">Welcome back</Title>
              <Text type="secondary">Sign in to enter your support workspace.</Text>
            </div>
          </div>

          <AlertJsx />

          <div className="grid min-h-11 w-full place-items-center [&>div]:!w-full [&_iframe]:!w-full" aria-busy={googleLogin.isPending}>
            <GoogleLogin
              onSuccess={({ credential }) => {
                if (!credential) {
                  message.error("Google did not return a sign-in credential");
                  return;
                }
                googleLogin.mutate({ idToken: credential });
              }}
              onError={() => message.error("Google sign-in was cancelled or failed")}
              shape="rectangular"
              size="large"
              text="continue_with"
              theme="outline"
              width="400"
            />
          </div>

          <Divider plain className="!my-6 !border-[var(--ads-border-subtle)] !text-[10px] !tracking-[0.04em] !text-[var(--ads-text-subtle)]">or continue with email</Divider>

          <Form
            className="[&_.ant-form-item]:!mb-[18px] [&_.ant-form-item-label>label]:!text-xs [&_.ant-form-item-label>label]:!font-semibold [&_.ant-input-affix-wrapper]:!min-h-12 [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)] [&_.ant-input-prefix]:!mr-2.5"
            layout="vertical"
            onFinish={(values) => passwordLogin.mutate(values)}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="-mt-1">
              <Button
                type="link"
                className="!mb-[18px] !ml-auto !block !h-auto !p-0 !text-xs"
                onClick={() => navigate("/init_psd_recovery")}
              >
                Forgot password?
              </Button>

              <Button
                className="!h-[50px] !rounded-[var(--ads-radius-md)] !font-semibold"
                type="primary"
                htmlType="submit"
                loading={passwordLogin.isPending}
                block
              >
                Sign in <ArrowRightOutlined />
              </Button>
            </div>
          </Form>

          <Button
            className="!mt-[13px] !h-[42px] !rounded-[var(--ads-radius-md)] !text-xs !font-semibold"
            type="text"
            block
            icon={<SafetyOutlined />}
            onClick={() => navigate("/otp_request", { state: { from } })}
          >
            Use a one-time email code instead
          </Button>

          <Text className="mx-auto mt-[22px] block max-w-[350px] text-center !text-[10px] !leading-[1.55] !text-[var(--ads-text-subtle)]">
            Sign-in activity is monitored to keep your account and customer data secure.
          </Text>
        </div>
      </section>
    </main>
  );
}
