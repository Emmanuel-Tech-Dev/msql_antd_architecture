import { Breadcrumb, Space, Typography } from 'antd';

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
        <main className={`min-h-full min-w-0 ${className}`.trim()}>
            <header className="mb-[22px] flex items-start justify-between gap-6 max-[700px]:flex-col max-[700px]:items-stretch max-[700px]:gap-4">
                <div className="min-w-0">
                    {items.length > 0 && (
                        <nav className="mb-2" aria-label="Breadcrumb">
                            <Breadcrumb items={items} />
                        </nav>
                    )}

                    <div className="flex items-center gap-[11px]">
                        {icon && (
                            <span className="grid size-[30px] shrink-0 place-items-center rounded-[calc(var(--app-radius)*0.75)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]" aria-hidden="true">
                                {icon}
                            </span>
                        )}
                        <Title level={4} className="!m-0 text-balance">{resolvedTitle}</Title>
                    </div>

                    {description && <Paragraph className="!mt-2 !mb-0 !max-w-[700px] text-pretty ">{description}</Paragraph>}
                </div>

                {actions && (
                    <Space className="shrink-0 pt-[23px] max-[700px]:w-full max-[700px]:pt-0 max-[700px]:[&_.ant-btn]:flex-1" size="small" wrap>
                        {actions}
                    </Space>
                )}
            </header>

            {aside}

            {hasContent && (
                <section className={`min-w-0 [&>.ant-card]:border-[var(--color-border)] [&>.ant-card]:shadow-[var(--shadow-sm)] [&_.ant-tabs-nav]:mb-5 [&_.ant-tabs-tab]:font-semibold ${contentClassName}`.trim()}>
                    {children}
                </section>
            )}
        </main>
    );
};
