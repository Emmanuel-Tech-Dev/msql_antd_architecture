import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Skeleton,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

const INHERIT = 'INHERIT';
const MANAGE_AUTHORITY = 'manage:user_authority';

const AUTHORITY_ROOT_CLASS = [
  'text-[var(--color-text-primary,#17202a)]',
  '[&>.ant-alert]:mb-[13px] [&>.ant-alert]:rounded-[3px] [&_.ant-tabs-nav]:mb-2',
].join(' ');

const AUTHORITY_HEADING_CLASS = [
  'mb-3.5 flex items-center justify-between gap-[18px]',
  '[&>div:first-child]:min-w-0',
  '[&>div:first-child>span]:text-[10px] [&>div:first-child>span]:font-bold',
  '[&>div:first-child>span]:uppercase [&>div:first-child>span]:tracking-[0.09em]',
  '[&>div:first-child>span]:text-[var(--color-primary,#b04c10)]',
  '[&_h3]:mt-[3px] [&_h3]:mb-0 [&_h3]:text-[19px] [&_h3]:tracking-[-0.025em]',
].join(' ');

const TONE_STYLES = {
  allow: {
    state: 'text-[var(--ads-success,#16805c)] bg-[color-mix(in_srgb,var(--ads-success,#16805c)_11%,transparent)]',
    tag: '!text-[var(--ads-success,#16805c)] !bg-[color-mix(in_srgb,var(--ads-success,#16805c)_10%,transparent)]',
  },
  deny: {
    state: 'text-[var(--ads-error,#c93f3f)] bg-[color-mix(in_srgb,var(--ads-error,#c93f3f)_10%,transparent)]',
    tag: '!text-[var(--ads-error,#c93f3f)] !bg-[color-mix(in_srgb,var(--ads-error,#c93f3f)_10%,transparent)]',
  },
  inherited: {
    state: 'text-[var(--ads-info,#2c64a4)] bg-[color-mix(in_srgb,var(--ads-info,#2c64a4)_10%,transparent)]',
    tag: '!text-[var(--ads-info,#2c64a4)] !bg-[color-mix(in_srgb,var(--ads-info,#2c64a4)_9%,transparent)]',
  },
  none: {
    state: 'bg-[#f1f1ee] text-[#8c918d]',
    tag: '!bg-[#f1f1ee] !text-[#747b76]',
  },
};

function hasPrivilegedRole(roles = []) {
  return roles.some((role) => ['superadmin', 'dev'].includes(
    String(role?.role_id ?? role).trim().toLowerCase(),
  ));
}

function overrideMap(rows, key) {
  return Object.fromEntries((rows ?? []).map((row) => [row[key], row.effect]));
}

function toOverrides(draft, key) {
  return Object.entries(draft)
    .filter(([, effect]) => effect !== INHERIT)
    .map(([target, effect]) => ({ [key]: target, effect }));
}

function accessState(target, inherited, draft) {
  const effect = draft[target] ?? INHERIT;
  if (effect === 'ALLOW') return { effective: true, label: 'Direct allow', tone: 'allow' };
  if (effect === 'DENY') return { effective: false, label: 'Direct deny', tone: 'deny' };
  if (inherited.has(target)) return { effective: true, label: 'Inherited', tone: 'inherited' };
  return { effective: false, label: 'Not granted', tone: 'none' };
}

function AuthorityList({ items, itemKey, inherited, draft, onChange, search, disabled }) {
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item[itemKey], item.alias, item.description, item.resource_path]
      .some((value) => String(value ?? '').toLowerCase().includes(needle)));
  }, [itemKey, items, search]);

  if (!filtered.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No authority targets match this search" />;

  return (
    <div className="max-h-[410px] overflow-y-auto border border-[var(--color-border-secondary,#e7e3dc)] [scrollbar-width:thin]">
      {filtered.map((item) => {
        const target = item[itemKey];
        const state = accessState(target, inherited, draft);
        const itemDisabled = disabled || item.is_public === true || Number(item.is_public) === 1;
        return (
          <div className="flex min-h-[82px] items-center gap-2.5 border-b border-[var(--color-border-secondary,#eeeae4)] px-3 py-[11px] last:border-b-0 max-[760px]:flex-wrap max-[760px]:items-start" key={target}>
            <span className={`grid size-[31px] shrink-0 place-items-center ${TONE_STYLES[state.tone].state}`} aria-hidden>
              {state.effective ? <CheckCircleOutlined /> : <StopOutlined />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col max-[760px]:min-w-[calc(100%-45px)] [&>strong]:text-[13px] [&>strong]:leading-[1.3] [&>code]:mt-0.5 [&>code]:overflow-hidden [&>code]:text-ellipsis [&>code]:whitespace-nowrap [&>code]:text-[10px] [&>code]:text-[var(--color-text-secondary,#66706a)] [&>small]:mt-1 [&>small]:overflow-hidden [&>small]:text-ellipsis [&>small]:whitespace-nowrap [&>small]:text-[11px] [&>small]:text-[var(--color-text-tertiary,#7f8781)]">
              <strong>{item.alias || item.resource || target}</strong>
              <code>{itemKey === 'permission_name' ? target : item.resource_path}</code>
              <small>{item.description || 'No description provided'}</small>
            </div>
            <Tag className={`!m-0 min-w-[76px] !rounded-sm !border-0 text-center !text-[10px] max-[760px]:ml-[41px] ${TONE_STYLES[state.tone].tag}`}>{state.label}</Tag>
            <Segmented
              className="shrink-0 !rounded-[3px] !text-[11px]"
              aria-label={`Authority override for ${target}`}
              disabled={itemDisabled}
              options={[
                { label: 'Inherit', value: INHERIT },
                { label: 'Allow', value: 'ALLOW' },
                { label: 'Deny', value: 'DENY' },
              ]}
              value={draft[target] ?? INHERIT}
              onChange={(effect) => onChange(target, effect)}
            />
          </div>
        );
      })}
    </div>
  );
}

function ReadonlyPermissions({ permissions }) {
  return (
    <section className={`${AUTHORITY_ROOT_CLASS} [&>p]:mt-0 [&>p]:mb-3 [&>p]:text-xs [&>p]:text-[var(--color-text-secondary,#69716c)]`}>
      <div className={AUTHORITY_HEADING_CLASS}>
        <div><span>Effective authority</span><h3>Role-derived access</h3></div>
        <Tag>{permissions.length} permissions</Tag>
      </div>
      <p>You can inspect this user, but your account cannot create direct authority exceptions.</p>
      <div className="flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto border border-[var(--color-border-secondary,#e7e3dc)] bg-[var(--color-bg-layout,#f8f7f4)] p-[11px] [&_.ant-tag]:m-0">
        {permissions.length
          ? permissions.map((permission) => <Tag key={permission}>{permission}</Tag>)
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No effective permissions" />}
      </div>
    </section>
  );
}

export default function UserAuthorityPanel({ userId, fallbackPermissions = [] }) {
  const actorRoles = useAuthStore((state) => state.roles) ?? [];
  const actorPermissions = useAuthStore((state) => state.permissions) ?? [];
  const canManage = hasPrivilegedRole(actorRoles) || actorPermissions.includes(MANAGE_AUTHORITY);
  const [permissionDraft, setPermissionDraft] = useState(null);
  const [routeDraft, setRouteDraft] = useState(null);
  const [reason, setReason] = useState('');
  const [validUntil, setValidUntil] = useState(undefined);
  const [search, setSearch] = useState('');

  const {
    data: authorityResponse,
    error: authorityError,
    loading,
    run: loadAuthority,
  } = useApi('get', canManage ? `/access/user_authority/${userId}` : null, { manual: true });
  const authority = authorityResponse?.data;

  const { run: saveAuthority, loading: saving } = useApi('post', '/access/user_authority/save', {
    successMessage: 'User authority updated successfully',
    onSuccess: () => {
      setReason('');
      setPermissionDraft(null);
      setRouteDraft(null);
      setValidUntil(undefined);
      loadAuthority();
    },
  });

  useEffect(() => {
    if (canManage && userId) loadAuthority();
  }, [canManage, loadAuthority, userId]);

  if (!canManage) return <ReadonlyPermissions permissions={fallbackPermissions} />;
  if (authorityError) {
    return (
      <Alert
        showIcon
        type="error"
        title="Authority information is unavailable"
        description="The user's effective access could not be loaded. Try again or inspect the request details if the problem continues."
        action={<Button icon={<ReloadOutlined />} onClick={() => loadAuthority()}>Try again</Button>}
      />
    );
  }
  if (loading || !authority) return <Skeleton active paragraph={{ rows: 9 }} />;

  const persistedExpiry = [...(authority.permissionOverrides ?? []), ...(authority.routeOverrides ?? [])]
    .find((row) => row.valid_until)?.valid_until;
  const currentPermissionDraft = permissionDraft
    ?? overrideMap(authority.permissionOverrides, 'permission');
  const currentRouteDraft = routeDraft
    ?? overrideMap(authority.routeOverrides, 'resource');
  const currentValidUntil = validUntil === undefined
    ? (persistedExpiry ? dayjs(persistedExpiry) : null)
    : validUntil;
  const inheritedPermissions = new Set(authority.inheritedPermissions ?? []);
  const inheritedRoutes = new Set(authority.inheritedRoutes ?? []);
  const permissionOverrides = toOverrides(currentPermissionDraft, 'permission');
  const routeOverrides = toOverrides(currentRouteDraft, 'resource');
  const overrideCount = permissionOverrides.length + routeOverrides.length;
  const editingDisabled = Boolean(authority.privileged);

  const setDraftValue = (setter) => (target, effect) => {
    setter((current) => ({ ...current, [target]: effect }));
  };

  const save = () => saveAuthority({
    user_id: userId,
    permissionOverrides,
    routeOverrides,
    reason: reason.trim(),
    valid_until: currentValidUntil ? currentValidUntil.toISOString() : null,
  });

  const clearOverrides = () => {
    setPermissionDraft({});
    setRouteDraft({});
  };

  return (
    <section className={AUTHORITY_ROOT_CLASS} aria-labelledby="user-authority-title">
      <div className={AUTHORITY_HEADING_CLASS}>
        <div><span>Hybrid RBAC authority</span><h3 id="user-authority-title">Direct user exceptions</h3></div>
        <div className="flex gap-1.5 [&>span]:min-w-[72px] [&>span]:bg-[var(--color-bg-layout,#f7f6f3)] [&>span]:px-[9px] [&>span]:py-[7px] [&>span]:text-center [&>span]:text-[10px] [&_strong]:block [&_strong]:text-[17px] [&_strong]:leading-[1.1]">
          <span><strong>{authority.effectivePermissions?.length ?? 0}</strong> effective</span>
          <span><strong>{overrideCount}</strong> direct</span>
        </div>
      </div>

      {authority.privileged ? (
        <Alert
          showIcon
          type="warning"
          title="Privileged system role"
          description="SuperAdmin and dev bypass ordinary mappings. Direct overrides are intentionally ignored; remove the privileged role before defining user exceptions."
        />
      ) : (
        <Alert
          showIcon
          type="info"
          title="Deny wins for this user"
          description="Inherit follows the role. Allow adds one capability. Deny removes an inherited capability without changing anyone else in the role."
        />
      )}

      <div className="mb-1 flex items-center gap-2 [&_.ant-input-affix-wrapper]:min-h-[38px] [&_.ant-input-affix-wrapper]:flex-1 [&_.ant-input-affix-wrapper]:!rounded-[3px] [&_.ant-btn]:size-[38px] [&_.ant-btn]:min-w-[38px] [&_.ant-btn]:!rounded-[3px]">
        <Input
          allowClear
          aria-label="Search authority targets"
          prefix={<SearchOutlined />}
          placeholder="Search permissions or routes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Tooltip title="Reload persisted authority">
          <Button aria-label="Reload authority" icon={<ReloadOutlined />} onClick={() => loadAuthority()} />
        </Tooltip>
      </div>

      <Tabs
        items={[
          {
            key: 'permissions',
            label: `Permissions (${authority.allPermissions?.length ?? 0})`,
            children: (
              <AuthorityList
                disabled={editingDisabled}
                draft={currentPermissionDraft}
                inherited={inheritedPermissions}
                itemKey="permission_name"
                items={authority.allPermissions ?? []}
                search={search}
                onChange={setDraftValue(setPermissionDraft)}
              />
            ),
          },
          {
            key: 'routes',
            label: `Navigation (${authority.allRoutes?.length ?? 0})`,
            children: (
              <AuthorityList
                disabled={editingDisabled}
                draft={currentRouteDraft}
                inherited={inheritedRoutes}
                itemKey="resource"
                items={authority.allRoutes ?? []}
                search={search}
                onChange={setDraftValue(setRouteDraft)}
              />
            ),
          },
        ]}
      />

      <div className="mt-[13px] border border-[var(--color-border-secondary,#e7e3dc)] bg-[var(--color-bg-layout,#f8f7f4)] p-[13px] [&_.ant-input]:!rounded-[3px]">
        <div className="mb-2 flex items-center justify-between [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[7px] [&>span]:text-xs [&>span]:font-bold [&_.ant-btn]:text-[11px]">
          <span><SafetyCertificateOutlined /> Audit context</span>
          <Button disabled={editingDisabled || overrideCount === 0} type="text" onClick={clearOverrides}>Clear direct overrides</Button>
        </div>
        <Input.TextArea
          disabled={editingDisabled}
          maxLength={500}
          placeholder="Required: explain why this user needs an exception"
          rows={2}
          showCount
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="mt-2.5 flex items-center gap-2.5 max-[760px]:flex-col max-[760px]:items-stretch [&>.ant-picker]:min-h-[38px] [&>.ant-picker]:!rounded-[3px] [&>.ant-btn]:min-h-[38px] [&>.ant-btn]:!rounded-[3px] [&>span]:flex-1 [&>span]:text-[10px] [&>span]:text-[var(--color-text-secondary,#69716c)] max-[760px]:[&>span]:-order-1">
          <DatePicker
            allowClear
            disabled={editingDisabled}
            disabledDate={(date) => date.endOf('day').isBefore(dayjs())}
            placeholder="No expiration"
            prefix={<ClockCircleOutlined />}
            showTime
            value={currentValidUntil}
            onChange={setValidUntil}
          />
          <span>{overrideCount} direct exception{overrideCount === 1 ? '' : 's'} will be persisted</span>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={editingDisabled || reason.trim().length < 8}
            loading={saving}
            onClick={save}
          >
            Save authority
          </Button>
        </div>
      </div>
    </section>
  );
}
