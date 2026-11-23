import { Avatar, Button, Empty, Tag, Typography } from 'antd';
import {
    ArrowRightOutlined,
    RightOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import utils from '../../utils/function_utils';

const { Text } = Typography;
const number = (value) => Number(value) || 0;

export default function UserAccessInsights({ data, loading, onOpenUser }) {
    const overview = data?.overview ?? {};
    const total = number(overview.total_users);
    const active = number(overview.active_users);
    const setupRequired = number(overview.setup_required_users);
    const ready = Math.max(0, active - setupRequired);
    const readiness = total ? Math.round((ready / total) * 100) : 0;
    const setupUsers = (data?.recentUsers ?? []).filter((user) => Number(user.forced_password_change) === 1).slice(0, 3);
    const roles = (data?.roles ?? []).slice(0, 5);
    const largestRole = Math.max(1, ...roles.map((role) => number(role.user_count)));

    return (
        <aside className="grid content-start gap-3.5 xl:h-[724px]" aria-label="User access insights">
            <section className="h-[154px] rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] p-4 shadow-[var(--ads-shadow-xs)]">
                <div className="flex items-start justify-between gap-3">
                    <div><span className="font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.04em] text-[var(--ads-text-muted)]">Access readiness</span><strong className="mt-1 block font-[var(--font-heading)] text-[length:var(--ads-font-size-h3)] font-semibold leading-none text-[var(--ads-text-heading)]">{loading ? '—' : `${readiness}%`}</strong></div>
                    <Tag className="!m-0 !rounded-full !border-0 !bg-[var(--ads-success-soft)] !px-2.5 !font-[var(--font-caption)] !text-[length:var(--ads-font-size-caption)] !font-semibold !text-[var(--ads-success)]">{readiness >= 80 ? 'HEALTHY' : 'NEEDS ATTENTION'}</Tag>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ads-surface-sunken)]"><span className="block h-full rounded-full bg-[var(--ads-accent)] transition-[width]" style={{ width: `${readiness}%` }} /></div>
                <Text className="mt-3 block !font-[var(--font-body)] !text-[length:var(--ads-font-size-body-sm)] !leading-[1.45] !text-[var(--ads-text-muted)]">{ready} of {total} users can sign in without a pending account setup step.</Text>
            </section>

            <section className="h-[220px] overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] p-4 shadow-[var(--ads-shadow-xs)]">
                <div className="flex items-start justify-between gap-3">
                    <div><strong className="block font-[var(--font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold leading-none text-[var(--ads-text-heading)]">Setup required</strong><Text className="mt-1.5 block !text-[length:var(--ads-font-size-body-sm)] !text-[var(--ads-text-muted)]">{setupRequired} user{setupRequired === 1 ? '' : 's'} need attention</Text></div>
                    <Button type="link" size="small" className="!h-auto !p-0 !font-[var(--font-caption)] !text-[length:var(--ads-font-size-caption)] !font-semibold">VIEW ALL</Button>
                </div>
                <div className="mt-2.5">
                    {setupUsers.length ? setupUsers.map((user) => (
                        <button className="flex h-[42px] w-full items-center gap-2.5 text-left hover:bg-[var(--ads-surface-hover)]" key={user.custom_id} type="button" onClick={() => onOpenUser(user)}>
                            <Avatar shape="square" size={28} className="!rounded-[var(--ads-radius-sm)] !bg-[var(--ads-accent-soft)] !font-[var(--font-caption)] !text-[length:var(--ads-font-size-caption)] !font-semibold !text-[var(--ads-accent)]">{utils.getInitials_v2(user.name)}</Avatar>
                            <span className="min-w-0 flex-1"><strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--ads-font-size-body-sm)] font-semibold text-[var(--ads-text-heading)]">{user.name}</strong><small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Temporary password not changed</small></span>
                            <RightOutlined className="text-[9px] text-[var(--ads-text-subtle)]" />
                        </button>
                    )) : <Empty className="!my-4 [&_.ant-empty-description]:!font-[var(--font-body)] [&_.ant-empty-description]:!text-[length:var(--ads-font-size-body-sm)] [&_.ant-empty-description]:!text-[var(--ads-text-muted)]" image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending setup" />}
                </div>
            </section>

            <section className="h-[210px] rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] p-4 shadow-[var(--ads-shadow-xs)]">
                <div className="mb-3 flex items-center justify-between"><strong className="font-[var(--font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold text-[var(--ads-text-heading)]">Role coverage</strong><span className="font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.04em] text-[var(--ads-text-muted)]">{total} users</span></div>
                <div className="space-y-2">
                    {roles.map((role, index) => {
                        const count = number(role.user_count);
                        return (
                            <div className="grid h-[22px] grid-cols-[72px_minmax(0,1fr)_18px] items-center gap-2" key={role.role_name}>
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase text-[var(--ads-text-muted)]">{role.role_name}</span>
                                <span className="h-[5px] overflow-hidden rounded-full bg-[var(--ads-surface-sunken)]"><span className={`block h-full rounded-full ${index === 0 ? 'bg-[var(--ads-accent)]' : 'bg-[var(--ads-border-strong)]'}`} style={{ width: `${Math.round((count / largestRole) * 100)}%` }} /></span>
                                <strong className="font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold text-[var(--ads-text-heading)]">{count}</strong>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="flex min-h-[84px] items-center gap-2.5 rounded-[var(--ads-radius-lg)] border border-[var(--ads-success-border)] bg-[var(--ads-success-soft)] p-3.5 text-[var(--ads-text-heading)]">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-surface)] text-[var(--ads-success)]"><SafetyCertificateOutlined /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[length:var(--ads-font-size-body-sm)] font-semibold">Access policies healthy</strong><small className="mt-1 block font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.04em] text-[var(--ads-text-muted)]">No policy engine conflicts</small></span>
                <ArrowRightOutlined className="text-[var(--ads-text-subtle)]" />
            </section>
        </aside>
    );
}
