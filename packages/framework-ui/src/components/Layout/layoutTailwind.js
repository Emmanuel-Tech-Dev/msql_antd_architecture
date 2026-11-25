export const SIDER_SCROLLBAR_CLASS = [
    '[scrollbar-width:thin] [scrollbar-color:rgba(127,127,127,0.28)_transparent]',
    '[&::-webkit-scrollbar]:size-1',
    '[&::-webkit-scrollbar-track]:bg-[color-mix(in_srgb,var(--app-sider-scrollbar-tone)_5%,var(--app-sider-scrollbar-bg))]',
    '[&::-webkit-scrollbar-thumb]:rounded-full',
    '[&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--app-sider-scrollbar-tone)_28%,var(--app-sider-scrollbar-bg))]',
    'hover:[&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--app-sider-scrollbar-tone)_40%,var(--app-sider-scrollbar-bg))]',
    '[&::-webkit-scrollbar-corner]:bg-[var(--app-sider-scrollbar-bg)]',
].join(' ');

export const WORKSPACE_CONTENT_CLASS = [
    '[&>*]:transition-[opacity,transform] [&>*]:duration-300 [&>*]:ease-out',
    '[&>*]:starting:translate-y-[7px] [&>*]:starting:opacity-0',
    'motion-reduce:[&>*]:transition-none',
    '[html[data-motion=reduced]_&>*]:transition-none',
].join(' ');
