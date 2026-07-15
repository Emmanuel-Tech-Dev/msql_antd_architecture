import { Typography } from 'antd';
import './AdminWorkspace.css';

const { Paragraph, Title } = Typography;

export function AdminSectionHeader({ eyebrow, title, description, action }) {
    return (
        <div className="admin-section-header">
            <div className="admin-section-header__copy">
                {eyebrow && <span className="admin-section-header__eyebrow">{eyebrow}</span>}
                <Title level={4}>{title}</Title>
                {description && <Paragraph>{description}</Paragraph>}
            </div>
            {action && <div className="admin-section-header__action">{action}</div>}
        </div>
    );
}

export function AdminEntity({ title, description, leading, trailing }) {
    return (
        <div className="admin-entity">
            {leading && <span className="admin-entity__leading">{leading}</span>}
            <span className="admin-entity__copy">
                <strong>{title}</strong>
                {description && <small title={description}>{description}</small>}
            </span>
            {trailing}
        </div>
    );
}

