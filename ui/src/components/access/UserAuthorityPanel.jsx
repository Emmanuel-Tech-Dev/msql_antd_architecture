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
import './UserAuthorityPanel.css';

const INHERIT = 'INHERIT';
const MANAGE_AUTHORITY = 'manage:user_authority';

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
    <div className="user-authority__list">
      {filtered.map((item) => {
        const target = item[itemKey];
        const state = accessState(target, inherited, draft);
        const itemDisabled = disabled || item.is_public === true || Number(item.is_public) === 1;
        return (
          <div className="user-authority__row" key={target}>
            <span className={`user-authority__state is-${state.tone}`} aria-hidden>
              {state.effective ? <CheckCircleOutlined /> : <StopOutlined />}
            </span>
            <div className="user-authority__identity">
              <strong>{item.alias || item.resource || target}</strong>
              <code>{itemKey === 'permission_name' ? target : item.resource_path}</code>
              <small>{item.description || 'No description provided'}</small>
            </div>
            <Tag className={`user-authority__source is-${state.tone}`}>{state.label}</Tag>
            <Segmented
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
    <section className="user-authority user-authority--readonly">
      <div className="user-authority__heading">
        <div><span>Effective authority</span><h3>Role-derived access</h3></div>
        <Tag>{permissions.length} permissions</Tag>
      </div>
      <p>You can inspect this user, but your account cannot create direct authority exceptions.</p>
      <div className="user-authority__readonly-tags">
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
    <section className="user-authority" aria-labelledby="user-authority-title">
      <div className="user-authority__heading">
        <div><span>Hybrid RBAC authority</span><h3 id="user-authority-title">Direct user exceptions</h3></div>
        <div className="user-authority__metrics">
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

      <div className="user-authority__toolbar">
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

      <div className="user-authority__commit">
        <div className="user-authority__commit-heading">
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
        <div className="user-authority__commit-actions">
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
