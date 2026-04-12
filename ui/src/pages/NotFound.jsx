import React from 'react';
import { Button, Result, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '24px'
    }}>
      <Result
        status="404"
        title="404"
        subTitle="Oops! The page you're looking for doesn't exist or you don't have permission to access it."
        extra={
          <Space size="middle">
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
               onClick={() => navigate('/')}
            >
              Back Home
            </Button>
          </Space>
        }
      />
    </div>
  );
};

export default NotFound;
