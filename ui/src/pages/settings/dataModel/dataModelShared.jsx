import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export function Eyebrow({ children }) {
    return <span className="font-[var(--font-mono)] text-[11px] tracking-[0.1em] text-[var(--color-text-secondary)]">{children}</span>;
}

// The header of a builder screen below the Data model page: back, title, actions.
export function ScreenHeader({ eyebrow, title, onBack, actions }) {
    return (
        <div className="flex flex-wrap items-center gap-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-container)] px-6 py-3.5">
            {onBack && <Button aria-label="Back" icon={<ArrowLeftOutlined />} onClick={onBack} className="!size-11" />}
            <div className="flex min-w-[240px] grow flex-col">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                <Title level={4} className="!m-0">{title}</Title>
            </div>
            {actions}
        </div>
    );
}

export function Panel({ title, extra, children, className = '' }) {
    return (
        <section className={`overflow-hidden rounded-[calc(var(--app-radius,6px)*2.6)] border border-[var(--color-border)] bg-[var(--color-bg-container)] ${className}`}>
            {(title || extra) && (
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                    {title && <Text strong className="grow">{title}</Text>}
                    {extra}
                </div>
            )}
            {children}
        </section>
    );
}
