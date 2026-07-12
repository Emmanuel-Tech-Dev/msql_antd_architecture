import { Button, Result, Space } from 'antd';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useNavigationRoutes } from '../../core/provider/ResourceProvider';

function toAbsolutePath(path) {
  if (!path) return null;
  const cleaned = String(path).trim();
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export default function NotFound404() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigationRoutes = useNavigationRoutes();
  const firstAdminRoute = navigationRoutes.find((route) => {
    const path = toAbsolutePath(route?.resource_path);
    return (
      path &&
      path.startsWith('/admin') &&
      path !== '/admin/404'
    );
  });
  const homePath = isAuthenticated
    ? toAbsolutePath(firstAdminRoute?.resource_path) || '/admin/home'
    : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Result
        status="404"
        title="404"
        subTitle="The page does not exist or is not available for your account."
        extra={
          <Space size="middle" wrap>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate(homePath, { replace: true })}
            >
              Home
            </Button>
          </Space>
        }
      />
    </div>
  );
}
