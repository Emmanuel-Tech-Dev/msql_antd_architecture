// src/hooks/useGlobalSelect.jsx
//
// Usage:
//   const role    = useGlobalSelect('role_name', 'admin_roles')
//   const roles   = useGlobalSelect('role_name', 'admin_roles', true)
//   const grouped = useGlobalSelect('permission_name', 'admin_permissions', false, 'resource_type')
//
//   <role.SelectJsx placeholder="Select role" style={{ width: 200 }} />
//   role.selected   →  "Admin"
//   roles.selected  →  ["Admin", ...]
//   grouped options →  [{ label: 'API_ENDPOINT', options: [...] }, ...]

import { Select, Tag } from 'antd';
import { useCallback, useRef, useState } from 'react';
import useApi from './useApi';
import utils from '../utils/function_utils';

const useGlobalSelect = (col, tblName, multi = false, groupBy = null) => {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(multi ? [] : undefined);
    const [styles, setStyles] = useState({})
    const hasFetched = useRef(false);

    const { run, loading } = useApi('post', '/api/v1/extra_meta_options', {
        onSuccess: (response) => {
            const rows = response?.data?.details ?? [];

            if (!groupBy) {
                // Flat list — standard behaviour
                setOptions(rows.map((row) => ({
                    label: row[col],
                    value: row[col],
                    key: row.id,
                })));
            } else {
                // Grouped — Ant Design format: [{ label: 'GroupName', options: [...] }]
                const groups = {};
                rows.forEach((row) => {
                    const key = row[groupBy] ?? 'Other';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push({
                        label: row[col],
                        value: row[col],
                        key: row.id,
                    });
                });
                setOptions(
                    Object.entries(groups).map(([label, opts]) => ({ label, options: opts }))
                );
            }

            hasFetched.current = true;
        },
    });

    // Fetch once — on first dropdown open
    // When groupBy is set, also select that column so we can group on it
    const handleDropdownOpen = useCallback((open) => {
        if (open && !hasFetched.current) {
            const cols = groupBy
                ? `id, \`${col}\`, \`${groupBy}\``
                : `id, \`${col}\``;
            run({ sql: `SELECT ${cols} FROM \`${tblName}\` LIMIT 500` });
        }
    }, [run, col, tblName, groupBy]);

    const handleChange = useCallback((value) => {
        setSelected(value);
    }, []);

    const reset = useCallback(() => {
        setSelected(multi ? [] : undefined);
        setOptions([]);
        hasFetched.current = false;
    }, [multi]);

    const SelectJsx = useCallback(({
        placeholder = `Select ${col}`,
        style = { width: '100%', ...styles },
        variant = 'outlined',
        onChange,
        ...rest
    } = {}) => (
        <Select
            mode={multi ? 'multiple' : undefined}
            value={selected}
            options={options}
            loading={loading}
            placeholder={placeholder}
            style={style}
            allowClear
            showSearch
            filterOption={(input, option) =>
                // Works for both flat and grouped — Ant Design passes child options here
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            maxTagCount={multi ? 3 : undefined}
            maxTagPlaceholder={multi ? (n) => `+${n.length} more` : undefined}
            tagRender={multi ? ({ label, closable, onClose }) => (
                <Tag closable={closable} onClose={onClose} style={{ marginRight: 3, borderRadius: 4, fontSize: 11 }}>
                    {label}
                </Tag>
            ) : undefined}
            onDropdownVisibleChange={handleDropdownOpen}
            notFoundContent={loading ? 'Loading...' : 'No results'}
            onChange={(val, opt) => {
                handleChange(val);
                onChange?.(val, opt);
            }}
            variant={variant}
            onClear={() => setSelected(multi ? [] : undefined)}
            {...rest}
        />
    ), [col, multi, selected, options, loading, handleDropdownOpen, handleChange]);

    return {
        SelectJsx,
        selected,
        setSelected,
        options,
        setOptions,
        loading,
        reset,
        setStyles,
    };
};

export default useGlobalSelect;