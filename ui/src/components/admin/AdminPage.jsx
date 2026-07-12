import { Space, Typography } from 'antd';
import './AdminPage.css';

const { Paragraph, Text, Title } = Typography;

export default function AdminPage({ eyebrow, title, description, icon, actions, children, aside }) {
    return (
        <main className="admin-page">
            <header className="admin-page__header">
                <div className="admin-page__heading">
                    <div className="admin-page__eyebrow">
                        {icon && <span className="admin-page__icon" aria-hidden="true">{icon}</span>}
                        <Text>{eyebrow}</Text>
                    </div>
                    <Title level={2}>{title}</Title>
                    <Paragraph>{description}</Paragraph>
                </div>
                {actions && <Space className="admin-page__actions" wrap>{actions}</Space>}
            </header>
            {aside}
            <section className="admin-page__surface">{children}</section>
        </main>
    );
}
