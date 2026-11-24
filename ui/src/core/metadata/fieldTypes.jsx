import { Checkbox, DatePicker, Input, InputNumber, Radio, Select, Switch, Tag, TimePicker } from 'antd';
import dayjs from 'dayjs';
import cryptoRandomString from 'crypto-random-string';
import LookupSelect from '../../components/metadata/LookupSelect';
import UploadField from '../../components/metadata/UploadField';
import ChoiceGroup from '../../components/metadata/ChoiceGroup';
import IconSelect from '../../components/metadata/IconSelect';
import IconCell from '../../components/metadata/IconCell';

// One definition per field type, shared by MetadataForm (input, value
// conversion) and MetadataTable (cell). Built-in types are registered the
// same way a project adds its own: registerFieldType('signaturePad', {...}).
//
// input({ field, table, disabled, placeholder, lookupDependsOn }) -> antd control
//   (Form.Item gives it value / onChange)
// toForm(stored) / fromForm(formValue): stored value <-> form value
// cell(value, record, field): how the value shows in a list
// fullWidth: always spans the whole row
//
// Display settings in a field's config: select / multiSelect take
// display "chips" or "cards" (an option may carry a description for cards);
// money takes currency ("GHS") as a prefix.
// createDefault(): value for a new record when the field has no default

const registry = new Map();

export function registerFieldType(type, definition) {
  registry.set(type, { toForm: (value) => value, fromForm: (value) => value, ...definition });
}

export function getFieldType(type) {
  return registry.get(type) ?? registry.get('text');
}

const options = (field) => (field.config?.options ?? []).map((option) => ({ value: String(option.value), label: option.label, description: option.description }));
const displayedAsChoices = (field) => ['chips', 'cards'].includes(field.config?.display);
const optionLabel = (field, value) => options(field).find((option) => option.value === String(value))?.label ?? value;
const toList = (value) => (Array.isArray(value) ? value : String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean));
const blankToUndefined = (value) => (value === null || value === '' ? undefined : value);
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const text = {
  input: ({ disabled, placeholder }) => <Input disabled={disabled} placeholder={placeholder} />,
  cell: (value) => value ?? '',
};

registerFieldType('text', text);
registerFieldType('phone', text);
registerFieldType('url', text);
registerFieldType('email', { ...text, input: ({ disabled, placeholder }) => <Input type="email" disabled={disabled} placeholder={placeholder} /> });
registerFieldType('password', { ...text, input: ({ disabled, placeholder }) => <Input.Password disabled={disabled} placeholder={placeholder} />, cell: () => '••••••' });
registerFieldType('textarea', {
  ...text,
  fullWidth: true,
  input: ({ disabled, placeholder, field }) => <Input.TextArea disabled={disabled} placeholder={placeholder} autoSize={{ minRows: field.config?.rows ?? 3, maxRows: 10 }} />,
});
registerFieldType('richText', { ...registry.get('textarea') });
registerFieldType('icon', {
  input: ({ disabled, placeholder }) => <IconSelect disabled={disabled} placeholder={placeholder} />,
  toForm: (value) => blankToUndefined(value),
  fromForm: (value) => value ?? null,
  cell: (value) => (value ? <IconCell name={value} /> : ''),
});
const upload = (kind) => ({
  input: ({ field, table, disabled }) => (
    <UploadField kind={kind} table={table} column={field.column_name} disabled={disabled}
      accept={field.config?.accept?.join(',')} maxSizeMb={field.config?.maxSizeMb} />
  ),
  toForm: (value) => blankToUndefined(value) ?? null,
});
registerFieldType('image', {
  ...upload('image'),
  cell: (value) => (value ? <img src={value} alt="" width={32} height={32} className="rounded object-cover" /> : ''),
});
registerFieldType('file', {
  ...upload('file'),
  cell: (value) => (value ? <a href={value} target="_blank" rel="noreferrer">View file</a> : ''),
});
registerFieldType('generatedId', {
  ...text,
  input: () => <Input readOnly />,
  createDefault: () => cryptoRandomString({ length: 10 }),
});

const number = {
  input: ({ disabled, placeholder, field }) => (
    <InputNumber className="!w-full" disabled={disabled} placeholder={placeholder} min={field.config?.min} max={field.config?.max} step={field.config?.step} precision={field.config?.precision} />
  ),
  toForm: (value) => (value === null || value === '' || value === undefined ? undefined : Number(value)),
  cell: (value) => value ?? '',
};
for (const type of ['number', 'integer', 'percent', 'duration']) registerFieldType(type, number);
registerFieldType('money', {
  ...number,
  input: ({ disabled, placeholder, field }) => (
    <InputNumber className="!w-full" disabled={disabled} placeholder={placeholder ?? '0.00'} min={field.config?.min ?? 0} max={field.config?.max}
      precision={field.config?.precision ?? 2} prefix={field.config?.currency} />
  ),
  cell: (value, record, field) => (value === null || value === undefined || value === ''
    ? ''
    : `${field.config?.currency ? `${field.config.currency} ` : ''}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
});

const choice = {
  toForm: (value) => (value === null || value === undefined || value === '' ? undefined : String(value)),
  cell: (value, record, field) => optionLabel(field, value),
};
registerFieldType('select', {
  ...choice,
  input: ({ disabled, placeholder, field }) => (displayedAsChoices(field)
    ? <ChoiceGroup name={field.column_name} display={field.config.display} options={options(field)} disabled={disabled} />
    : <Select disabled={disabled} placeholder={placeholder} options={options(field)} showSearch optionFilterProp="label" allowClear />),
});
registerFieldType('radio', {
  ...choice,
  input: ({ disabled, field }) => <Radio.Group disabled={disabled} options={options(field)} />,
});

const multiChoice = {
  toForm: (value) => toList(value),
  fromForm: (value) => toList(value),
  cell: (value, record, field) => toList(value).map((item) => <Tag key={item}>{optionLabel(field, item)}</Tag>),
};
registerFieldType('multiSelect', {
  ...multiChoice,
  input: ({ disabled, placeholder, field }) => (displayedAsChoices(field)
    ? <ChoiceGroup multiple name={field.column_name} display={field.config.display} options={options(field)} disabled={disabled} />
    : <Select mode="multiple" disabled={disabled} placeholder={placeholder} options={options(field)} optionFilterProp="label" />),
});
registerFieldType('checkboxGroup', {
  ...multiChoice,
  input: ({ disabled, field }) => <Checkbox.Group disabled={disabled} options={options(field)} />,
});

registerFieldType('lookup', {
  ...choice,
  input: ({ disabled, placeholder, field, lookupDependsOn }) => (
    <LookupSelect disabled={disabled} placeholder={placeholder} lookupKey={field.config?.lookup} dependsOn={lookupDependsOn} allowClear />
  ),
  cell: (value) => value ?? '',
});
registerFieldType('multiLookup', {
  ...multiChoice,
  input: ({ disabled, placeholder, field, lookupDependsOn }) => (
    <LookupSelect multiple disabled={disabled} placeholder={placeholder} lookupKey={field.config?.lookup} dependsOn={lookupDependsOn} />
  ),
  cell: (value) => toList(value).map((item) => <Tag key={item}>{item}</Tag>),
});

registerFieldType('switch', {
  input: ({ disabled }) => <Switch disabled={disabled} />,
  valuePropName: 'checked',
  toForm: (value) => value === true || value === 1 || value === '1',
  fromForm: (value) => (value ? 1 : 0),
  cell: (value) => (value === true || Number(value) === 1 ? 'Yes' : 'No'),
});

const dateType = (format, picker) => ({
  input: ({ disabled }) => picker(disabled),
  toForm: (value) => (blankToUndefined(value) ? dayjs(value) : undefined),
  fromForm: (value) => (value ? dayjs(value).format(format) : null),
  cell: (value) => (blankToUndefined(value) ? dayjs(value).format(format.replace(':ss', '')) : ''),
});
registerFieldType('date', dateType('YYYY-MM-DD', (disabled) => <DatePicker className="!w-full" disabled={disabled} />));
registerFieldType('dateTime', dateType(DATE_TIME_FORMAT, (disabled) => <DatePicker className="!w-full" showTime disabled={disabled} />));
registerFieldType('time', {
  input: ({ disabled }) => <TimePicker className="!w-full" disabled={disabled} />,
  toForm: (value) => (blankToUndefined(value) ? dayjs(value, 'HH:mm:ss') : undefined),
  fromForm: (value) => (value ? dayjs(value).format('HH:mm:ss') : null),
  cell: (value) => value ?? '',
});
