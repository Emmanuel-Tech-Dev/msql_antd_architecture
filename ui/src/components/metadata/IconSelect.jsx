import { Select } from 'antd';
import useIcons from '../../hooks/useIcons';

// Offers only the names useIcons can draw, so a stored icon never falls back
// silently. A stored name outside the registry stays visible so it can be fixed.
export default function IconSelect({ value, onChange, disabled, placeholder }) {
    const { resolveIcon, iconNames } = useIcons();
    const names = value && !iconNames.includes(value) ? [value, ...iconNames] : iconNames;
    const options = names.map((name) => ({
        value: name,
        label: (
            <span className="inline-flex items-center gap-2">
                {iconNames.includes(name) ? resolveIcon(name) : <span aria-hidden="true">?</span>}
                <span>{name}</span>
            </span>
        ),
    }));

    return (
        <Select
            showSearch
            allowClear
            value={value || undefined}
            onChange={(name) => onChange?.(name ?? null)}
            disabled={disabled}
            placeholder={placeholder ?? 'Choose an icon'}
            options={options}
            optionFilterProp="value"
            status={value && !iconNames.includes(value) ? 'warning' : undefined}
        />
    );
}
