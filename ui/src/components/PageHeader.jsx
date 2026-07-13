import { Breadcrumb, Space, Typography } from 'antd';
import './PageHeader.css';

const { Paragraph, Title } = Typography;

export const PageHeader = ({
    title,
    header,
    description,
    icon,
    items = [],
    actions,
    aside,
    children,
    className = '',
    contentClassName = '',
}) => {
    const resolvedTitle = title ?? header;
    const hasContent = children !== undefined && children !== null;

    return (
        <main className={`page-shell ${className}`.trim()}>
            <header className="page-header">
                <div className="page-header__heading">
                    {items.length > 0 && (
                        <nav className="page-header__breadcrumbs" aria-label="Breadcrumb">
                            <Breadcrumb items={items} />
                        </nav>
                    )}

                    <div className="page-header__title-row">
                        {icon && (
                            <span className="page-header__icon" aria-hidden="true" p-4 border >
                                {icon}
                            </span>
                        )}
                        <Title level={2}>{resolvedTitle}</Title>
                    </div>

                    {description && <Paragraph>{description}</Paragraph>}
                </div>

                {actions && (
                    <Space className="page-header__actions" size="small" wrap>
                        {actions}
                    </Space>
                )}
            </header>

            {aside}

            {hasContent && (
                <section className={`page-header__surface ${contentClassName}`.trim()}>
                    {children}
                </section>
            )}
        </main>
    );
};
