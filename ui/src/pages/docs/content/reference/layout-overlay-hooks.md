---
id: layout-overlay-hooks
title: Layout and overlay hooks
track: reference
group: Hooks
order: 2
eyebrow: useSider, useModal, useDrawer
audience: Frontend developers
readTime: 24 min
summary: Build the application shell and controlled overlays with the exact APIs exposed by useSider, useModal, useDrawer, useDraggable, and useTheme.
---

These hooks are composition helpers. They do not replace page state or business services. useSider owns shell navigation state, useModal and useDrawer own overlay state, useDraggable supplies bounded modal movement, and useTheme reads the normalized appearance context.

## Hook ownership

| Hook | Owns | Does not own |
| --- | --- | --- |
| useSider | Collapsed state, route selection, item processing, shell JSX | Resource authorization or bootstrap fetching |
| useModal | Visibility, title, content, footer, loading, confirmation loading | Form validation or database mutations |
| useDrawer | Visibility, content, placement sizing, optional resizing | Record selection or API persistence |
| useDraggable | Viewport bounds and draggable modal wrapper | A complete modal |
| useTheme | Access to ThemeProvider context | Saving appearance settings |

## useSider initialization configuration

| Option | Default | Meaning |
| --- | --- | --- |
| variant | sider | Shell arrangement passed to SiderLayout |
| width / collapsedWidth | 220 / 80 | Expanded and collapsed navigation width |
| breakpoint | lg | Responsive collapse boundary: xs through xxl |
| theme | dark | Ant Design sider/menu theme |
| collapsible / defaultCollapsed | true / false | Whether collapse is allowed and its saved starting state |
| isGrouped / groupKey / groupVariant | false / undefined / dropdown | Optional navigation grouping |
| orderKey / bottomKey | order / settings | Sorting field and item pinned to the bottom |
| defaultHeader / defaultFooter | true / false | Whether SiderLayout supplies standard regions |
| colors and style objects | undefined | Appearance tokens and region-level overrides |

```jsx Complete useSider shell
function WorkspaceShell({ resources, user, appearance }) {
  const items = useMemo(() => resources.map((resource) => ({
    key: resource.route,
    path: resource.route,
    label: resource.label,
    icon: resolveResourceIcon(resource.icon),
    group: resource.category,
    order: resource.display_order,
  })), [resources]);

  const shell = useSider({
    variant: appearance.layout.variant,
    width: appearance.layout.sider.width,
    collapsedWidth: appearance.layout.sider.collapsedWidth,
    breakpoint: appearance.layout.sider.breakpoint,
    theme: appearance.layout.sider.theme,
    collapsible: appearance.layout.sider.collapsible,
    defaultCollapsed: appearance.layout.sider.defaultCollapsed,
    isGrouped: appearance.layout.sider.groupNavigation,
    groupKey: 'group',
    colors: appearance.colors,
  }, {
    items,
    appName: appearance.brand.name,
    user,
    showSiderProfile: true,
    onProfile: () => navigate('/admin/profile'),
    onLogout: logout,
  });

  return shell.layoutJSX({
    header: <WorkspaceHeader onToggle={shell.toggle} />,
    footer: <BuildVersion />,
  });
}
```

## useSider rules

- Call it beneath BrowserRouter because it reads useNavigate and useLocation.
- Treat the first argument as structural configuration and the second as live runtime data. Memoize resource items so they are not rebuilt on every render.
- defaultCollapsed is synchronized when saved bootstrap appearance changes; collapsible=false forces the shell open.
- The resource list must already be authorized. show_in_nav controls visibility, not direct-route authorization.
- layoutJSX renders the complete SiderLayout, including its Outlet. Do not nest it inside another workspace shell.

```jsx Reusable confirmation modal
function DeleteProjectButton({ project }) {
  const dialog = useModal({
    width: 480,
    centered: true,
    draggable: true,
    resetOnClose: true,
    okText: 'Delete project',
    okType: 'danger',
  });

  const confirmDelete = () => dialog.openModal({
    title: 'Delete project?',
    content: <p>{project.name} will no longer be available.</p>,
    onOk: async () => {
      await deleteProject(project.id);
      dialog.closeModal();
    },
  });

  return <>
    <Button danger onClick={confirmDelete}>Delete</Button>
    {dialog.modalJSX()}
  </>;
}
```

## useModal return contract

| Member | Use |
| --- | --- |
| open, loading, confirmLoading | Read current overlay state |
| openModal(config) | Set dynamic title/content/footer/callbacks and open |
| closeModal() | Close and optionally reset dynamic state |
| updateTitle / updateContent / updateFooter | Replace content while the modal remains open |
| setLoading / setConfirmLoading | Control Ant Design loading states |
| modalJSX(overrides, localContent) | Render the modal once near the owning component return |

:::warning Async confirmation behavior
useModal enables confirmLoading while onOk runs. It deliberately does not close automatically after a successful callback; call closeModal after the mutation succeeds. If the promise rejects, the modal remains open so the user can recover.
:::

```jsx Resizable details drawer
function ProjectDetails({ project }) {
  const panel = useDrawer({
    placement: 'right',
    width: 520,
    resizable: true,
    minWidth: 360,
    maxWidth: 760,
    resetOnClose: true,
  });

  return <>
    <Button onClick={() => panel.openDrawer({
      title: project.name,
      extra: <Tag color="green">Active</Tag>,
      content: <ProjectSummary project={project} />,
      footer: <Button onClick={panel.closeDrawer}>Done</Button>,
    })}>View details</Button>
    {panel.drawerJSX()}
  </>;
}
```

## useDrawer return contract

| Member | Use |
| --- | --- |
| open, loading, width, height | Read current panel and resize state |
| openDrawer(config) / closeDrawer() | Open with dynamic regions or close/reset |
| updateTitle / updateContent / updateExtra / updateFooter | Update an open drawer |
| setOpen / setLoading / setWidth / setHeight | Imperative control for advanced compositions |
| drawerJSX(overrides, localContent) | Render the Ant Design Drawer |

```jsx Reading appearance tokens
function StatusSurface() {
  const {
    isDark, mode, scope, isWorkspace,
    configuredMode, toggle, clearPreference, appearance,
  } = useTheme();

  return <Card style={{ background: appearance.colors.elevatedBg }}>
    <span>{scope} / {mode}</span>
    <Button onClick={toggle}>{isDark ? 'Light' : 'Dark'}</Button>
    <Button onClick={clearPreference}>Use configured mode</Button>
  </Card>;
}
```

:::note Theme scope
ThemeProvider supplies the context and Ant Design ConfigProvider tokens. The workspace scope uses saved appearance settings; public surfaces can use their own normalized scope. useTheme reads this state—it does not write ui_settings.
:::
