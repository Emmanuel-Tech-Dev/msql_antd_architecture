import { useState } from 'react';
import { Button, ColorPicker, Input, Segmented } from 'antd';
import { DownOutlined, RightOutlined, UndoOutlined } from '@ant-design/icons';
import { COLOR_GROUPS, colorFieldChanged, paletteKey } from './appearanceFields';
import { COLOR_VALUE } from './themePack';

// Typed hex codes apply when they are valid; anything else goes back to the
// current colour when the field loses focus.
function HexInput({ label, value, disabled, onCommit }) {
    // Holds what is being typed; null shows the current colour.
    const [typed, setTyped] = useState(null);
    const text = typed ?? value;
    const invalid = !COLOR_VALUE.test(text.trim());

    const commit = () => {
        if (!invalid && text.trim() !== value) onCommit(text.trim());
        setTyped(null);
    };

    return (
        <Input
            aria-label={`${label} colour code`}
            value={text}
            disabled={disabled}
            status={invalid ? 'error' : undefined}
            onChange={(event) => setTyped(event.target.value)}
            onBlur={commit}
            onPressEnter={commit}
            className="!h-8 !font-[family-name:var(--ads-font-data)] !text-[length:var(--ads-font-size-body-sm)]"
        />
    );
}

function ColourRow({ field, value, changed, disabled, onChange, onUndo }) {
    return (
        <li className="grid grid-cols-[30px_minmax(0,1fr)_112px_28px] items-center gap-3 border-t border-[var(--ads-border-subtle)] px-1 py-2.5">
            <ColorPicker value={value} disabled={disabled} disabledAlpha onChange={(color) => onChange(color.toHexString().toUpperCase())}>
                <button
                    type="button"
                    aria-label={`Pick ${field.label}`}
                    className="size-[30px] cursor-pointer rounded-[7px] border border-[var(--ads-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ads-focus)] disabled:cursor-not-allowed"
                    style={{ background: value }}
                    disabled={disabled}
                />
            </ColorPicker>
            <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{field.label}</span>
                <span className="truncate text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{field.hint}</span>
            </span>
            <HexInput label={field.label} value={value} disabled={disabled} onCommit={onChange} />
            {changed
                ? <Button type="text" size="small" icon={<UndoOutlined />} aria-label={`Undo ${field.label}`} onClick={onUndo} disabled={disabled} />
                : <span aria-hidden="true" />}
        </li>
    );
}

// The Colours section: a light/dark palette switch and five groups, one open
// at a time, each listing its colours with a picker and a typed hex code.
export default function ColourSection({ draft, stored, mode, onModeChange, onColourChange, disabled }) {
    const [openGroup, setOpenGroup] = useState('surfaces');
    const palette = draft[paletteKey(mode)];

    const setField = (field, value) => field.tokens.forEach((token) => onColourChange(mode, token, value));
    const undoField = (field) => field.tokens.forEach((token) => onColourChange(mode, token, stored[paletteKey(mode)][token]));

    return (
        <>
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="m-0 font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">Colours</h2>
                    <p className="m-0 mt-0.5 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">
                        Light and dark each have their own palette. Hover, focus and soft fills are worked out from these.
                    </p>
                </div>
                <Segmented
                    aria-label="Palette to edit"
                    value={mode}
                    onChange={onModeChange}
                    options={[{ value: 'light', label: 'Light palette' }, { value: 'dark', label: 'Dark palette' }]}
                />
            </div>

            <div className="mt-3">
                {COLOR_GROUPS.map((group) => {
                    const open = openGroup === group.key;
                    const unsaved = group.fields.filter((field) => colorFieldChanged(draft, stored, mode, field)).length;
                    return (
                        <section key={group.key} className={`border-t border-[var(--ads-border-subtle)] ${open ? 'rounded-[var(--ads-radius-md)] bg-[var(--ads-surface-sunken)]' : ''}`}>
                            <h3 className="m-0">
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    onClick={() => setOpenGroup(open ? null : group.key)}
                                    className="grid min-h-[52px] w-full cursor-pointer grid-cols-[16px_minmax(110px,170px)_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--ads-radius-md)] border-0 bg-transparent px-3 text-left text-[var(--ads-text)] hover:bg-[var(--ads-surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--ads-focus)]"
                                >
                                    {open ? <DownOutlined className="text-xs text-[var(--ads-text-muted)]" /> : <RightOutlined className="text-xs text-[var(--ads-text-muted)]" />}
                                    <span className="flex flex-col">
                                        <span className="font-semibold">{group.label}</span>
                                        {unsaved > 0 && <span className="text-[length:var(--ads-font-size-caption)] font-medium text-[var(--ads-warning)]">{unsaved} unsaved</span>}
                                    </span>
                                    <span className="flex min-w-0 flex-wrap gap-1.5" aria-hidden="true">
                                        {group.fields.map((field) => (
                                            <span key={field.label} className="size-6 rounded-[6px] border border-[var(--ads-border-strong)]" style={{ background: palette[field.tokens[0]] }} />
                                        ))}
                                    </span>
                                    {!open && <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">{group.fields.length} colours</span>}
                                </button>
                            </h3>
                            {open && (
                                <ul className="m-0 list-none px-3 pb-2 pt-0">
                                    {group.fields.map((field) => (
                                        <ColourRow
                                            key={field.label}
                                            field={field}
                                            value={palette[field.tokens[0]]}
                                            changed={colorFieldChanged(draft, stored, mode, field)}
                                            disabled={disabled}
                                            onChange={(value) => setField(field, value)}
                                            onUndo={() => undoField(field)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </>
    );
}
