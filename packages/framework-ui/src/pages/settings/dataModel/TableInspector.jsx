import { Alert, Button, Input, Segmented, Select, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import IconSelect from '../../../components/metadata/IconSelect';
import { Eyebrow } from './dataModelShared';

// The table's own settings in the form designer: names, form container,
// columns, sections and the stepper.
export default function TableInspector({ settings, fields, onChange }) {
    const set = (changes) => onChange({ ...settings, ...changes });
    const sections = settings.sections ?? [];
    const setSection = (index, changes) => set({ sections: sections.map((section, at) => (at === index ? { ...section, ...changes } : section)) });
    const stepper = settings.stepper;
    const setStepper = (changes) => set({ stepper: { ...(stepper ?? {}), ...changes } });
    const sectionKeys = new Set(sections.map((section) => section.key));
    const unsectioned = fields.filter((field) => Number(field.form_visible) === 1 && field.type !== 'primaryKey' && !sectionKeys.has(field.section_key));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
                <Eyebrow>TABLE · {settings.table_name}</Eyebrow>
                <strong className="font-[var(--font-heading)] text-[17px] font-semibold">{settings.label}</strong>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Name in menus<Input value={settings.label} onChange={(event) => set({ label: event.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Name of one record
                <Input placeholder="e.g. Transaction" value={settings.singular_label} onChange={(event) => set({ singular_label: event.target.value })} />
                <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">
                    Used in buttons and titles: &ldquo;Add {(settings.singular_label || 'record').toLowerCase()}&rdquo;, &ldquo;Edit {(settings.singular_label || 'record').toLowerCase()}&rdquo;.
                </span>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Record title field
                <Select allowClear value={settings.title_column ?? undefined} onChange={(value) => set({ title_column: value ?? null })}
                    options={fields.filter((field) => field.type !== 'primaryKey').map((field) => ({ value: field.column_name, label: field.col_real_name || field.column_name }))} />
                <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">The field that names a record when it is shown elsewhere, such as a reference number or a name. It heads the stepper summary.</span>
            </label>
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Form opens in
                <Segmented block value={settings.form_layout} onChange={(form_layout) => set({ form_layout })}
                    options={[{ value: 'modal', label: 'Modal' }, { value: 'drawer', label: 'Drawer' }, { value: 'page', label: 'Page' }]} />
            </div>
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Columns
                <Segmented block value={Number(settings.form_columns) || 1} onChange={(form_columns) => set({ form_columns })} options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two' }]} />
            </div>
            <label className="flex items-start justify-between gap-3 text-[13px] font-semibold">
                <span className="flex flex-col gap-0.5">System table
                    <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">Hidden from Grant table access on the Permissions page. The framework&apos;s own tables are never offered there, whatever this says.</span>
                </span>
                <Switch checked={Number(settings.is_system) === 1} onChange={(checked) => set({ is_system: checked ? 1 : 0 })} />
            </label>

            <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Sections</span>
                <span className="text-[12.5px] text-[var(--color-text-secondary)]">Group the form&apos;s fields. To put a field in a section, use the folder button beside it in the outline, or its Section setting.</span>
                {sections.map((section, index) => (
                    <div key={section.key} className="flex flex-col gap-1.5 rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] p-2.5">
                        <div className="flex items-center gap-1.5">
                            <Input aria-label={`Section ${index + 1} title`} placeholder="Title" value={section.title} onChange={(event) => setSection(index, { title: event.target.value })} />
                            <Button type="text" aria-label={`Remove section ${index + 1}`} icon={<DeleteOutlined />} onClick={() => set({ sections: sections.filter((_, at) => at !== index) })} />
                        </div>
                        <Input aria-label={`Section ${index + 1} description`} placeholder="Description" value={section.description} onChange={(event) => setSection(index, { description: event.target.value })} />
                        <IconSelect placeholder="Icon (optional)" value={section.icon} onChange={(icon) => setSection(index, { icon: icon || undefined })} />
                    </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />}
                    onClick={() => set({ sections: [...sections, { key: `section_${Date.now().toString(36)}`, title: `Section ${sections.length + 1}` }] })}>
                    Add section
                </Button>
            </div>

            <div className="flex flex-col gap-2.5 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
                <label className="flex items-center justify-between text-[13px] font-semibold">Show as steps
                    <Switch checked={Boolean(stepper)} onChange={(on) => set({ stepper: on ? { variant: 'horizontal', showSummary: true } : null })} />
                </label>
                {stepper && (
                    <>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">Each section is one step.</span>
                        {unsectioned.length > 0 && (
                            <Alert type="warning" showIcon title={`${unsectioned.length} field${unsectioned.length === 1 ? ' has' : 's have'} no section`}
                                description={sections.length
                                    ? 'They form an untitled first step. Move them into sections with the folder button in the outline.'
                                    : 'With no sections, the whole form is one untitled step. Add sections above, then move fields into them.'} />
                        )}
                        <Segmented block value={stepper.variant ?? 'horizontal'} onChange={(variant) => setStepper({ variant })}
                            options={[{ value: 'horizontal', label: 'Across' }, { value: 'vertical', label: 'Down' }, { value: 'compact', label: 'Compact' }]} />
                        <label className="flex items-center justify-between text-[13px]">Summary panel<Switch size="small" checked={Boolean(stepper.showSummary)} onChange={(showSummary) => setStepper({ showSummary })} /></label>
                        <label className="flex items-center justify-between text-[13px]">Review before saving<Switch size="small" checked={Boolean(stepper.showReview)} onChange={(showReview) => setStepper({ showReview })} /></label>
                        <Input placeholder="Continue button (optional)" value={stepper.nextLabel} onChange={(event) => setStepper({ nextLabel: event.target.value || undefined })} />
                    </>
                )}
            </div>
        </div>
    );
}
