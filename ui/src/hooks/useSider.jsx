// src/hooks/useSider.js

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SiderLayout from '../components/Layout/SiderLayout';

const BREAKPOINT_WIDTHS = {
  xs: 480, sm: 576, md: 768,
  lg: 992, xl: 1200, xxl: 1600,
};

const DEFERRED_NAV_CATEGORIES = new Set(['administration']);

const normalizeNavValue = (value) => String(value ?? '').trim().toLowerCase();

const isDeferredNavItem = (item) => (
  DEFERRED_NAV_CATEGORIES.has(normalizeNavValue(item?.category))
);

const matchesNavigationKey = (item, keys) => keys.some((key) => {
  const normalizedKey = normalizeNavValue(key);
  return [item?.key, item?.path, item?.label]
    .some((value) => normalizeNavValue(value) === normalizedKey);
});

function partitionNavigationItems(data, keys) {
  const main = [];
  const pinned = [];

  data.forEach((item) => {
    if (matchesNavigationKey(item, keys)) {
      pinned.push(item);
      return;
    }

    if (item.children?.length) {
      const partitioned = partitionNavigationItems(item.children, keys);
      if (partitioned.main.length) {
        main.push({ ...item, children: partitioned.main });
      }
      pinned.push(...partitioned.pinned);
      return;
    }

    main.push(item);
  });

  return { main, pinned };
}

/*
  initConfig  — layout structure, set once at mount, never changes
  liveConfig  — reactive values, update after mount
*/
const useSider = (initConfig = {}, liveConfig = {}) => {

  // ─── initConfig captured in ref — read once, never stale ───────────────
  const {
    variant = 'sider',
    width = 220,
    collapsedWidth = 80,
    breakpoint = 'lg',
    theme = 'dark',
    collapsible = true,
    defaultCollapsed = false,
    reverseArrow = false,
    headerHeight = 64,
    isGrouped = false,
    groupKey,
    groupVariant = 'dropdown',
    orderKey = 'order',
    bottomKey = 'settings',
    defaultHeader = true,
    defaultFooter = false,
    footerText = `© ${new Date().getFullYear()}`,
    headerStyle,
    siderStyle,
    contentStyle,
    layoutStyle,
    footerStyle,
    colors,
  } = initConfig;

  // ─── liveConfig — reactive, flows through normally ──────────────────────
  const {
    items = [],
    headerItems = [],
    appName = 'My App',
    user = { name: 'Admin', email: '' },
    businessName = 'Business',
    businessRole = '',
    notificationCount = 0,
    onLogout,
    onProfile,
    showSiderProfile = false,
    showSiderLogout = false,
  } = liveConfig;

  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [headerItemsState, setHeaderItemsState] = useState(headerItems);

  const onCollapse = useCallback((value) => setCollapsed(value), []);
  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  // keep headerItems in sync with liveConfig
  useEffect(() => {
    if (!headerItems.length) return;
    setHeaderItemsState(headerItems);
  }, [headerItems]);
  // Bootstrap updates happen without remounting the layout. Keep the state in
  // step with the saved preference and expand when collapsing is disabled.
  useEffect(() => {
    setCollapsed(collapsible ? defaultCollapsed : false);
  }, [collapsible, defaultCollapsed]);

  // ─── responsive collapse ────────────────────────────────────────────────
  useEffect(() => {
    const bp = BREAKPOINT_WIDTHS[breakpoint] ?? 992;
    const media = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const handleBreakpoint = (event) => {
      setCollapsed(collapsible ? (event.matches || defaultCollapsed) : false);
    };
    handleBreakpoint(media);
    media.addEventListener?.('change', handleBreakpoint);
    return () => media.removeEventListener?.('change', handleBreakpoint);
  }, [breakpoint, collapsible, defaultCollapsed]);

  // ─── Sort ───────────────────────────────────────────────────────────────
  const sortByOrder = useCallback((data) => (
    [...data].sort((a, b) => {
      const categoryDifference = Number(isDeferredNavItem(a)) - Number(isDeferredNavItem(b));
      if (categoryDifference !== 0) return categoryDifference;
      return (a[orderKey] ?? Infinity) - (b[orderKey] ?? Infinity);
    })
  ), [orderKey]);

  // ─── Group ──────────────────────────────────────────────────────────────
  const groupData = useCallback((data) => {
    if (!isGrouped || !groupKey) return null;

    const groupMap = {};
    const groupOrder = {};
    const ungrouped = [];

    sortByOrder(data).forEach((item) => {
      const val = item[groupKey];
      if (val === undefined || val === null) {
        ungrouped.push(item);
      } else {
        if (!groupMap[val]) {
          groupMap[val] = [];
          groupOrder[val] = item[orderKey] ?? Infinity;
        } else {
          groupOrder[val] = Math.min(groupOrder[val], item[orderKey] ?? Infinity);
        }
        groupMap[val].push(item);
      }
    });

    const sorted = Object.entries(groupMap).sort(
      ([a], [b]) => {
        const categoryDifference = Number(DEFERRED_NAV_CATEGORIES.has(normalizeNavValue(a)))
          - Number(DEFERRED_NAV_CATEGORIES.has(normalizeNavValue(b)));
        if (categoryDifference !== 0) return categoryDifference;
        return (groupOrder[a] ?? Infinity) - (groupOrder[b] ?? Infinity);
      }
    );

    return { groupMap: Object.fromEntries(sorted), groupOrder, ungrouped };
  }, [isGrouped, groupKey, sortByOrder, orderKey]);

  // ─── Build single menu item ─────────────────────────────────────────────
  const buildItem = useCallback((item) => ({
    key: item.key || item.path || item.label,
    icon: item.icon,
    label: item.label,
    title: <span className="business-sider__tooltip-label">{item.label}</span>,
    category: item.category,
    onClick: () => item.path && navigate(item.path),
  }), [navigate]);

  const partitionedItems = useMemo(() => {
    const keys = bottomKey ? [].concat(bottomKey) : [];
    return keys.length
      ? partitionNavigationItems(items, keys)
      : { main: items, pinned: [] };
  }, [bottomKey, items]);

  // ─── Build full sider menu items ────────────────────────────────────────
  const processedSiderItems = useMemo(() => {
    if (!partitionedItems.main.length) return [];

    let result = [];

    if (isGrouped && groupKey) {
      const { groupMap, ungrouped } = groupData(partitionedItems.main);
      sortByOrder(ungrouped).forEach((item) => result.push(buildItem(item)));

      Object.entries(groupMap).forEach(([groupName, groupItems]) => {
        if (groupVariant === 'dropdown') {
          result.push({
            key: groupName,
            label: groupName,
            children: sortByOrder(groupItems).map(buildItem),
          });
        } else {
          result.push({
            type: 'group',
            key: groupName,
            label: groupName,
            children: sortByOrder(groupItems).map(buildItem),
          });
        }
      });
    } else {
      result = sortByOrder(partitionedItems.main).map((item) =>
        item.children?.length
          ? {
            key: item.key || item.label,
            icon: item.icon,
            label: item.label,
            children: sortByOrder(item.children).map(buildItem),
          }
          : buildItem(item)
      );
    }

    return result;
  }, [partitionedItems.main, isGrouped, groupKey, groupData, groupVariant, buildItem, sortByOrder]);

  const processedBottomItems = useMemo(
    () => sortByOrder(partitionedItems.pinned).map(buildItem),
    [buildItem, partitionedItems.pinned, sortByOrder],
  );

  // ─── Build header menu items ────────────────────────────────────────────
  const processedHeaderItems = useMemo(() => {
    const source = headerItemsState.length ? headerItemsState : items;
    if (!source?.length) return [];
    return sortByOrder(source).map((item) =>
      item.children?.length
        ? {
          key: item.key || item.label,
          icon: item.icon,
          label: item.label,
          children: sortByOrder(item.children).map(buildItem),
        }
        : buildItem(item)
    );
  }, [items, headerItemsState, buildItem, sortByOrder]);

  // ─── Active route keys ──────────────────────────────────────────────────
  const selectedKeys = useMemo(() => {
    const keys = [];
    const scan = (list) => list.forEach((item) => {
      if (item.path && location.pathname === item.path) {
        keys.push(item.key || item.path || item.label);
      }
      if (item.children?.length) scan(item.children);
    });
    scan(items);
    return keys;
  }, [items, location.pathname]);

  const openKeys = useMemo(() => {
    const keys = [];
    if (isGrouped && groupKey) {
      const grouped = groupData(items);
      if (grouped?.groupMap) {
        Object.entries(grouped.groupMap).forEach(([groupName, groupItems]) => {
          if (groupItems.some((item) =>
            item.path && location.pathname === item.path
          )) {
            keys.push(groupName);
          }
        });
      }
    } else {
      items.forEach((item) => {
        if (item.children?.some((c) =>
          c.path && location.pathname === c.path
        )) {
          keys.push(item.key || item.label);
        }
      });
    }
    return keys;
  }, [items, isGrouped, groupKey, groupData, location.pathname]);

  // ─── layoutJSX ──────────────────────────────────────────────────────────
  const layoutJSX = useCallback(({ header, siderHeader, trigger, footer } = {}) => (
    <SiderLayout
      variant={variant}
      collapsed={collapsed}
      collapsedWidth={collapsedWidth}
      collapsible={collapsible}
      breakpoint={breakpoint}
      reverseArrow={reverseArrow}
      theme={theme}
      width={width}
      headerHeight={headerHeight}
      siderStyle={siderStyle}
      headerStyle={headerStyle}
      contentStyle={contentStyle}
      layoutStyle={layoutStyle}
      footerStyle={footerStyle}
      footerText={footerText}
      defaultHeader={defaultHeader}
      defaultFooter={defaultFooter}
      appName={appName}
      user={user}
      businessName={businessName}
      businessRole={businessRole}
      notificationCount={notificationCount}
      onLogout={onLogout}
      onProfile={onProfile}
      showSiderProfile={showSiderProfile}
      showSiderLogout={showSiderLogout}
      processedSiderItems={processedSiderItems}
      processedBottomItems={processedBottomItems}
      processedHeaderItems={processedHeaderItems}
      selectedKeys={selectedKeys}
      openKeys={openKeys}
      onCollapse={onCollapse}
      toggle={toggle}
      siderHeader={siderHeader}
      header={header}
      footer={footer}
      trigger={trigger}
      colors={colors}
    />
  ), [
    collapsed, processedSiderItems, processedBottomItems, processedHeaderItems,
    selectedKeys, openKeys, onCollapse, toggle,
    appName, user, businessName, businessRole, notificationCount, onLogout, onProfile,
    showSiderProfile, showSiderLogout,
    variant, collapsedWidth, collapsible, breakpoint, reverseArrow,
    theme, width, headerHeight, siderStyle, headerStyle,
    contentStyle, layoutStyle, footerStyle, footerText,
    defaultHeader, defaultFooter,
    colors,
  ]);

  return {
    collapsed,
    toggle,
    onCollapse,
    setCollapsed,
    setHeaderItems: setHeaderItemsState,
    layoutJSX,
  };
};

export default useSider;
