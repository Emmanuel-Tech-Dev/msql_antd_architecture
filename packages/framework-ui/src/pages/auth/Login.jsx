import { useCallback, useState } from "react";
import { Button, Divider, Form, Input, Typography } from "antd";
import {
  ArrowRightOutlined,
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
import utils from "../../utils/function_utils";
import AuthShell from "./AuthShell";
import useLoginOptions from "./useLoginOptions";

const { Text, Title } = Typography;

// How each sign-in column the server accepts is described to the user.
const IDENTIFIER_FIELDS = {
  email: { label: "email", example: "you@company.com" },
  custom_id: { label: "registration number", example: "REG-000123" },
  phone_no: { label: "phone number", example: "024 123 4567" },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { AlertJsx, message } = useNotification();
  const from = resolvePostLoginPath(location.state?.from);
  const { identifiers, page } = useLoginOptions();
  // Google draws its button at a fixed width (at most 400 px), so it is
  // measured to the column it sits in.
  const [googleWidth, setGoogleWidth] = useState(400);
  const googleBoxRef = useCallback((box) => {
    if (!box) return undefined;
    const observer = new ResizeObserver(([entry]) => setGoogleWidth(Math.min(400, Math.floor(entry.contentRect.width)) || 400));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const identifierFields = identifiers
    .map((column) => IDENTIFIER_FIELDS[column] ?? { label: column.replaceAll("_", " "), example: "" });
  const identifierPhrase = utils.listPhrase(identifierFields.map((field) => field.label));
  const identifierLabel = identifierPhrase.charAt(0).toUpperCase() + identifierPhrase.slice(1);

  const finishLogin = (response) => {
    if (response?.forcedPasswordChange) {
      navigate("/change_password", { replace: true, state: { from, required: true } });
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
    <AuthShell>
      <div className="mb-6 flex flex-col gap-1">
        <Title level={2} className="!m-0 !text-[28px] !tracking-[-0.03em] !text-[var(--ads-text-heading)]">Welcome back</Title>
        <Text type="secondary">Sign in to {page.brand.name}.</Text>
      </div>

      <AlertJsx />

      <Form
        className="[&_.ant-form-item]:!mb-[18px] [&_.ant-form-item-label>label]:!text-[length:var(--ads-font-size-body-sm)] [&_.ant-form-item-label>label]:!font-semibold [&_.ant-input-affix-wrapper]:!min-h-12 [&_.ant-input-affix-wrapper]:!rounded-[var(--ads-radius-md)] [&_.ant-input-prefix]:!mr-2.5"
        layout="vertical"
        onFinish={(values) => passwordLogin.mutate(values)}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          name="identifier"
          label={identifierLabel}
          rules={[{ required: true, message: `Enter your ${identifierPhrase}` }]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder={utils.listPhrase(identifierFields.map((field) => field.example).filter(Boolean))}
            autoComplete="username"
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

        <Button
          type="link"
          className="!-mt-1 !mb-[18px] !ml-auto !block !h-auto !p-0 !text-[length:var(--ads-font-size-body-sm)]"
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
      </Form>

      <Divider plain className="!my-6 !border-[var(--ads-border-subtle)] !text-[length:var(--ads-font-size-caption)] !text-[var(--ads-text-subtle)]">or</Divider>

      <div ref={googleBoxRef} className="grid min-h-11 w-full place-items-center" aria-busy={googleLogin.isPending}>
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
          width={String(googleWidth)}
        />
      </div>

      <Button
        className="!mt-3 !h-[42px] !rounded-[var(--ads-radius-md)] !text-[length:var(--ads-font-size-body-sm)] !font-semibold"
        type="text"
        block
        icon={<SafetyOutlined />}
        onClick={() => navigate("/otp_request", { state: { from } })}
      >
        Sign in with a one-time code
      </Button>
    </AuthShell>
  );
}
