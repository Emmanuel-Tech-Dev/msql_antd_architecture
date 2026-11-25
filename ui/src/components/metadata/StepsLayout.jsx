import { useState } from 'react';
import { Button, Form, Grid } from 'antd';
import { ArrowRightOutlined, CheckOutlined, ExclamationOutlined } from '@ant-design/icons';
import useIcons from '../../hooks/useIcons';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { fieldLabel } from '../../core/metadata/fieldRules';

const isBlank = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

function displayValue(field, value) {
    const definition = getFieldType(field.type);
    return definition.cell(definition.fromForm(value, field), {}, field);
}

function StepMark({ step, index, state, resolveIcon }) {
    if (state === 'done') return <CheckOutlined aria-hidden="true" />;
    if (state === 'error') return <ExclamationOutlined aria-hidden="true" />;
    if (step.icon) return resolveIcon(step.icon) ?? String(index + 1).padStart(2, '0');
    return <span className="font-[var(--font-mono)] text-[13px]">{String(index + 1).padStart(2, '0')}</span>;
}

const MARK_CLASS = {
    done: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    now: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]',
    next: 'border border-[var(--color-border-strong)] bg-[var(--color-bg-container)] text-[var(--color-text-secondary)]',
    error: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
};
const TAG = { done: 'DONE', now: 'NOW', next: 'NEXT', error: 'FIX' };
const TAG_CLASS = {
    done: 'text-[var(--color-success)]', now: 'text-[var(--color-accent)]', next: 'text-[var(--color-text-secondary)]', error: 'text-[var(--color-error)]',
};

function StepCard({ step, index, state, onOpen, resolveIcon, vertical }) {
    const active = state === 'now' || state === 'error';
    const body = (
        <>
            <span className={`grid size-9 shrink-0 place-items-center rounded-[calc(var(--app-radius,6px)*1.6)] ${MARK_CLASS[state]}`}>
                <StepMark step={step} index={index} state={state} resolveIcon={resolveIcon} />
            </span>
            <span className="flex min-w-0 flex-col text-left">
                <span className={`text-[14.5px] ${active ? 'font-semibold' : 'font-medium'} ${state === 'next' ? 'text-[var(--color-text-secondary)]' : ''} ${state === 'error' ? 'text-[var(--color-error)]' : ''}`}>
                    {step.title}
                </span>
                {step.description && <span className="truncate text-[12.5px] text-[var(--color-text-secondary)]">{step.description}</span>}
            </span>
            {!vertical && <span className={`ml-auto font-[var(--font-mono)] text-[11px] tracking-[0.06em] ${TAG_CLASS[state]}`}>{TAG[state]}</span>}
        </>
    );
    const cardClass = [
        'flex w-full items-center gap-3 rounded-[calc(var(--app-radius,6px)*2)] px-3.5 py-3',
        active
            ? `border-[1.5px] bg-[var(--color-bg-container)] shadow-[0_8px_20px_-14px_rgba(0,0,0,0.45)] ${state === 'error' ? 'border-[var(--color-error)]' : 'border-[var(--color-accent)]'}`
            : `border ${state === 'done' ? 'border-[var(--color-border)] bg-[var(--color-bg-container)]' : 'border-[var(--color-border-subtle)]'}`,
    ].join(' ');
    return (
        <li aria-current={active ? 'step' : undefined}>
            {onOpen
                ? <button type="button" onClick={onOpen} className={`${cardClass} cursor-pointer`}>{body}</button>
                : <div className={cardClass}>{body}</div>}
        </li>
    );
}

// Filled-in values of the steps already passed. Re-renders by itself as the
// form changes, so typing never re-renders the rest of the stepper.
function SummaryPanel({ metadata, sections, current, form }) {
    const values = Form.useWatch([], { form, preserve: true }) ?? {};
    const fieldsByName = Object.fromEntries(metadata.fields.map((field) => [field.column_name, field]));
    const titleColumn = metadata.table?.title_column;
    const rows = sections.slice(0, current).flatMap((section) => section.fieldNames
        .filter((name) => name !== titleColumn && !isBlank(values[name]))
        .slice(0, 2)
        .map((name) => ({ name, field: fieldsByName[name] })));

    return (
        <aside aria-label="Summary" className="flex flex-col gap-3.5 self-start rounded-[calc(var(--app-radius,6px)*2.3)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-[18px]">
            <span className="font-[var(--font-mono)] text-[11px] tracking-[0.1em] text-[var(--color-text-secondary)]">SUMMARY</span>
            {titleColumn && !isBlank(values[titleColumn]) && <strong className="text-sm font-semibold">{values[titleColumn]}</strong>}
            {rows.length ? (
                <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
                    {rows.map(({ name, field }) => (
                        <div key={name} className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-2.5">
                            <dt className="text-[var(--color-text-secondary)]">{fieldLabel(field)}</dt>
                            <dd className="m-0 text-right font-medium">{displayValue(field, values[name])}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <span className="text-[13px] text-[var(--color-text-secondary)]">What you fill in appears here as you go.</span>
            )}
            <p className="m-0 rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] bg-[var(--color-bg-container)] px-3 py-2.5 text-[12.5px] leading-normal text-[var(--color-text-secondary)]">
                Only this step&apos;s fields are checked when you continue. Nothing is saved until the last step.
            </p>
        </aside>
    );
}

function ReviewPanel({ metadata, sections, form, onEdit, resolveIcon }) {
    const values = form.getFieldsValue(true);
    const fieldsByName = Object.fromEntries(metadata.fields.map((field) => [field.column_name, field]));
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {sections.map((section, index) => (
                <section key={section.key ?? 'main'} className="overflow-hidden rounded-[calc(var(--app-radius,6px)*2.3)] border border-[var(--color-border)] bg-[var(--color-bg-container)]">
                    <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3.5">
                        {section.icon && <span className="grid size-[30px] place-items-center rounded-[calc(var(--app-radius,6px)*1.5)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">{resolveIcon(section.icon)}</span>}
                        <h3 className="m-0 grow text-[15px] font-semibold">{section.title ?? 'Details'}</h3>
                        <Button type="link" className="!px-0" onClick={() => onEdit(index)}>Edit</Button>
                    </div>
                    <dl className="m-0 flex flex-col gap-3 px-4 py-3.5 text-sm">
                        {section.fieldNames.map((name) => (
                            <div key={name}>
                                <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{fieldLabel(fieldsByName[name])}</dt>
                                <dd className={`m-0 mt-0.5 ${isBlank(values[name]) ? 'text-[var(--color-text-secondary)]' : 'font-medium'}`}>
                                    {isBlank(values[name]) ? 'Not provided' : displayValue(fieldsByName[name], values[name])}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}

// The 'steps' form layout: one section per step. Continue checks only the
// current step's fields; the record is saved on the last step (or after the
// review step); a server error opens the step holding the first bad field.
export default function StepsLayout({ metadata, sections, renderSection, form, mode, saving, submitText, singular, onCancel, errorFields }) {
    const stepper = metadata.table?.stepper ?? {};
    const screens = Grid.useBreakpoint();
    const variant = screens.md === false ? 'compact' : (stepper.variant ?? 'horizontal');
    const { resolveIcon } = useIcons();
    const [current, setCurrent] = useState(0);
    const [reviewing, setReviewing] = useState(false);

    const stepWithError = errorFields?.length
        ? sections.findIndex((section) => section.fieldNames.some((name) => errorFields.includes(name)))
        : -1;
    // New server errors open the step that holds the first one.
    const [handledErrors, setHandledErrors] = useState(errorFields);
    if (errorFields !== handledErrors) {
        setHandledErrors(errorFields);
        if (stepWithError >= 0) {
            setCurrent(stepWithError);
            setReviewing(false);
        }
    }

    const last = current === sections.length - 1;
    const atFinalStep = last && (!stepper.showReview || reviewing);
    const saveLabel = submitText ?? (mode === 'edit' ? 'Save changes' : `Add ${singular.toLowerCase()}`);

    const advance = async () => {
        if (!reviewing) {
            try {
                // recursive: the rows inside a list field are checked with it.
                await form.validateFields(sections[current].fieldNames, { recursive: true });
            } catch {
                return;
            }
        }
        if (atFinalStep) form.submit();
        else if (last) setReviewing(true);
        else setCurrent(current + 1);
    };
    const back = () => (reviewing ? setReviewing(false) : setCurrent(Math.max(0, current - 1)));
    const open = (index) => { setCurrent(index); setReviewing(false); };
    // Enter in a field means "continue", never "save" before the last step.
    const continueOnEnter = (event) => {
        if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'BUTTON') return;
        event.preventDefault();
        advance();
    };

    const stateOf = (index) => {
        if (index === stepWithError && index === current && !reviewing) return 'error';
        if (reviewing || index < current) return 'done';
        return index === current ? 'now' : 'next';
    };
    const canOpen = (index) => index !== current && (mode === 'edit' || index < current || reviewing);
    const percent = reviewing ? 100 : Math.round((current / sections.length) * 100);
    const primaryLabel = atFinalStep ? saveLabel : last ? 'Review' : (stepper.nextLabel ?? `Continue to ${sections[current + 1].title ?? 'next step'}`);
    const section = sections[current];

    const steps = (
        <ol aria-label="Steps" className={`m-0 list-none p-0 ${variant === 'vertical' ? 'flex flex-col gap-1.5' : 'grid gap-3.5'}`}
            style={variant === 'horizontal' ? { gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` } : undefined}>
            {sections.map((step, index) => (
                <StepCard key={step.key ?? 'main'} step={step} index={index} state={stateOf(index)} resolveIcon={resolveIcon}
                    vertical={variant === 'vertical'} onOpen={canOpen(index) ? () => open(index) : undefined} />
            ))}
        </ol>
    );
    const compactSteps = (
        <div className="flex flex-col gap-2">
            <div role="progressbar" aria-label={`Step ${current + 1} of ${sections.length}`} aria-valuemin={1} aria-valuemax={sections.length} aria-valuenow={current + 1}
                className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
                {sections.map((step, index) => (
                    <span key={step.key ?? 'main'} className={`h-[5px] rounded-full ${index <= current || reviewing ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
                ))}
            </div>
            <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">{reviewing ? 'Review' : section.title}</span>
                <span className="font-[var(--font-mono)] text-xs tracking-[0.06em] text-[var(--color-text-secondary)]">{current + 1} / {sections.length}</span>
            </div>
        </div>
    );

    const content = (
        <div className="flex min-w-0 grow flex-col gap-5">
            {reviewing ? (
                <>
                    <div className="flex flex-col gap-0.5">
                        <h2 className="m-0 font-[var(--font-heading)] text-lg font-semibold">Review</h2>
                        <p className="m-0 text-sm text-[var(--color-text-secondary)]">Check the details. Nothing is saved until you {saveLabel.toLowerCase()}.</p>
                    </div>
                    <ReviewPanel metadata={metadata} sections={sections} form={form} onEdit={open} resolveIcon={resolveIcon} />
                </>
            ) : renderSection(section)}
        </div>
    );
    const withSummary = stepper.showSummary && variant !== 'compact' && !reviewing;

    return (
        <div className="flex flex-col gap-5" onKeyDown={continueOnEnter}>
            {variant !== 'compact' && (
                <div className="flex items-center justify-end gap-3 text-[13px] text-[var(--color-text-secondary)]">
                    <span><strong className="font-semibold text-[var(--color-text-primary)]">{percent}%</strong> complete</span>
                    <span className="block h-1.5 w-[200px] overflow-hidden rounded-full bg-[var(--color-border)]">
                        <span className="block h-full rounded-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${Math.max(percent, 4)}%` }} />
                    </span>
                </div>
            )}
            {variant === 'vertical' ? (
                <div className="flex gap-6">
                    <nav className="w-[260px] shrink-0">{steps}</nav>
                    {content}
                    {withSummary && <div className="w-[280px] shrink-0"><SummaryPanel metadata={metadata} sections={sections} current={current} form={form} /></div>}
                </div>
            ) : (
                <>
                    {variant === 'compact' ? compactSteps : steps}
                    <div className="flex gap-6">
                        {content}
                        {withSummary && <div className="w-[280px] shrink-0"><SummaryPanel metadata={metadata} sections={sections} current={current} form={form} /></div>}
                    </div>
                </>
            )}
            <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
                <span className="font-[var(--font-mono)] text-[11.5px] tracking-[0.06em] text-[var(--color-text-secondary)]">
                    {reviewing ? 'REVIEW' : `STEP ${current + 1} OF ${sections.length}`}
                </span>
                <span className="grow" />
                {current > 0 || reviewing
                    ? <Button size="large" onClick={back}>Back</Button>
                    : onCancel && <Button size="large" onClick={onCancel}>Cancel</Button>}
                <Button size="large" type="primary" loading={saving} onClick={advance} icon={atFinalStep ? <CheckOutlined /> : undefined}>
                    {primaryLabel}{!atFinalStep && <ArrowRightOutlined aria-hidden="true" />}
                </Button>
            </div>
        </div>
    );
}
