import { useMemo } from 'react';
import { createAdsStyle, getAppearancePalette } from '../../../utils/appearanceTokens';

const BARS = [[40, 26, 14], [58, 30, 28], [50, 34, 16], [66, 38, 28]];
const STATUS_TAGS = [['Paid', 'success'], ['Overdue', 'danger'], ['Sent', 'info']];

// A small copy of the real app drawn with the draft's own --ads-* variables,
// so it shows unsaved edits without touching the rest of the page.
export default function AppearancePreview({ config, isDark }) {
    const style = useMemo(() => createAdsStyle(config, isDark), [config, isDark]);
    const colors = getAppearancePalette(config, isDark);

    return (
        <div
            className="flex h-[450px] overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-canvas)] font-[family-name:var(--ads-font-sans)] text-[var(--ads-text)]"
            style={style}
            aria-hidden="true"
        >
            <div className="flex w-[112px] shrink-0 flex-col gap-1 border-r border-[var(--ads-border)] p-2.5" style={{ background: colors.siderBg }}>
                <div className="mb-2 flex items-center gap-1.5">
                    <span className="grid size-5 place-items-center rounded-[4px] font-[family-name:var(--ads-font-heading)] text-[8px] font-bold" style={{ background: colors.accent, color: colors.accentText }}>
                        {config.brand.mark}
                    </span>
                    <span className="truncate font-[family-name:var(--ads-font-heading)] text-[9px] font-semibold" style={{ color: colors.textPrimary }}>{config.brand.name}</span>
                </div>
                {['Dashboard', 'Invoices', 'Projects', 'Customers'].map((label) => (
                    <span
                        key={label}
                        className="rounded-[5px] px-[7px] py-1.5 text-[9px]"
                        style={label === 'Invoices'
                            ? { background: colors.itemActive, color: colors.accent, fontWeight: 600 }
                            : { color: colors.textMuted, fontWeight: 500 }}
                    >
                        {label}
                    </span>
                ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-[34px] shrink-0 items-center border-b border-[var(--ads-border)] px-2.5" style={{ background: colors.headerBg }}>
                    <span className="flex h-5 w-[150px] items-center rounded-[4px] border border-[var(--ads-border-strong)] px-1.5 text-[8px] text-[var(--ads-text-subtle)]">Search…</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
                    <span className="font-[family-name:var(--ads-font-heading)] text-sm font-semibold">Invoice INV-2026-014</span>

                    <div className="flex flex-col gap-2 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] bg-[var(--ads-surface)] p-3">
                        <div className="flex items-center gap-2">
                            <span className="flex-1 truncate text-[10px] text-[var(--ads-text-muted)]">Mr Asare · Kanyase, Kumasi</span>
                            <span className="rounded-full bg-[var(--ads-warning-soft)] px-[7px] py-0.5 text-[9px] font-semibold text-[var(--ads-warning)]">Part paid</span>
                        </div>
                        <div className="flex items-center">
                            <span className="flex-1 text-[10px] text-[var(--ads-text-muted)]">Balance due</span>
                            <span className="font-[family-name:var(--ads-font-data)] text-[13px] font-semibold">GH₵ 4,200.00</span>
                        </div>
                        <div className="flex gap-1.5">
                            <span className="rounded-[var(--ads-radius-sm)] bg-[var(--ads-accent)] px-2 py-1 text-[9px] font-semibold text-[var(--ads-accent-text)]">Record payment</span>
                            <span className="rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-strong)] bg-[var(--ads-surface)] px-2 py-1 text-[9px] font-medium">Download PDF</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-medium text-[var(--ads-text-muted)]">Amount received</span>
                        <span className="flex h-[26px] items-center rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-strong)] bg-[var(--ads-surface)] px-2 font-[family-name:var(--ads-font-data)] text-[10px]">2,000.00</span>
                    </div>

                    <div className="flex flex-col gap-1.5 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] bg-[var(--ads-surface)] p-2.5">
                        <span className="text-[10px] font-semibold">Revenue vs costs</span>
                        <div className="flex h-[72px] items-end gap-2.5">
                            {BARS.map(([revenue, costs, net], month) => (
                                <div key={month} className="flex h-full flex-1 items-end gap-0.5">
                                    <span className="flex-1 rounded-[2px] bg-[var(--ads-chart-revenue)]" style={{ height: revenue }} />
                                    <span className="flex-1 rounded-[2px] bg-[var(--ads-chart-costs)]" style={{ height: costs }} />
                                    <span className="flex-1 rounded-[2px] bg-[var(--ads-chart-net)]" style={{ height: net }} />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2.5 text-[9px] text-[var(--ads-text-muted)]">
                            {[['Revenue', 'revenue'], ['Costs', 'costs'], ['Net', 'net']].map(([label, key]) => (
                                <span key={key} className="inline-flex items-center gap-1">
                                    <i className="size-[7px] rounded-[2px]" style={{ background: `var(--ads-chart-${key})` }} />{label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-1.5">
                        {STATUS_TAGS.map(([label, tone]) => (
                            <span key={label} className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `var(--ads-${tone}-soft)`, color: `var(--ads-${tone})` }}>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
