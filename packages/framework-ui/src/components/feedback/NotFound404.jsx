import { Button, Result, Space } from 'antd';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useNavigationRoutes } from '../../core/provider/ResourceProvider';
import { isWorkspacePath } from '../../core/navigation/routeResolver';

export default function NotFound404() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigationRoutes = useNavigationRoutes();
  const firstPage = navigationRoutes.find((route) =>
    isWorkspacePath(route?.resource_path) && route.resource_path !== '/admin/404',
  );
  const homePath = isAuthenticated ? firstPage?.resource_path || '/admin' : '/login';

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
