export const ACCESS_HEADING_CLASS = [
    'mb-[18px] flex items-start justify-between gap-6 max-[600px]:flex-col max-[600px]:items-stretch',
    '[&_h4.ant-typography]:!mb-1 [&_h4.ant-typography]:!mt-0 [&_h4.ant-typography]:!text-[17px]',
    '[&_.ant-typography]:text-xs',
].join(' ');

export const ACCESS_STATUS_CLASS = [
    'grid min-w-[92px] grid-cols-[auto_1fr] rounded-[var(--app-radius)]',
    'border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5',
    'max-[600px]:self-start',
    '[&>strong]:row-span-2 [&>strong]:mr-2 [&>strong]:font-[var(--font-display)]',
    '[&>strong]:text-[22px] [&>strong]:leading-none [&>strong]:text-[var(--color-text-primary)]',
    '[&>span]:text-[10px] [&>span]:text-[var(--color-text-secondary)]',
    '[&_.ant-badge]:col-span-2 [&_.ant-badge]:mt-[7px]',
].join(' ');

export const ACCESS_ROUTE_LIST_CLASS = 'overflow-hidden rounded-[var(--app-radius)] border border-[var(--color-border)]';

export const ACCESS_ROUTE_CLASS = [
    'grid min-h-[66px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3',
    'border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3.5 py-2.5',
    'opacity-70 transition-[background-color,opacity] duration-150 last:border-b-0 motion-reduce:transition-none',
].join(' ');

export const ACCESS_ROUTE_COPY_CLASS = [
    'flex min-w-0 flex-col',
    '[&>strong]:text-[13px] [&>strong]:text-[var(--color-text-primary)]',
    '[&>code]:mt-0.5 [&>code]:overflow-hidden [&>code]:text-ellipsis [&>code]:whitespace-nowrap',
    '[&>code]:text-[10px] [&>code]:text-[var(--color-text-tertiary)]',
].join(' ');
