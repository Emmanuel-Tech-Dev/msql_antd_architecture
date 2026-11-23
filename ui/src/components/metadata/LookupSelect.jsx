import { useEffect, useRef } from 'react';
import { Form, Select } from 'antd';
import { useLookupOptions } from '../../core/metadata/useTableMetadata';

function LookupOptionsSelect({ lookupKey, dependsOn, parentValue, multiple, value, onChange, ...props }) {
    const { data: options = [], isFetching } = useLookupOptions(lookupKey, { dependsOn, parent: parentValue });
    return (
        <Select
            {...props}
            mode={multiple ? 'multiple' : undefined}
            value={value}
            onChange={onChange}
            loading={isFetching}
            options={options.map((option) => ({ value: String(option.value), label: option.label }))}
            showSearch
            optionFilterProp="label"
            notFoundContent={dependsOn && !parentValue ? 'Choose the field above first' : undefined}
        />
    );
}

// Watches only its parent field, and clears a choice that no longer applies
// when the parent changes.
function DependentLookupSelect({ dependsOn, multiple, onChange, ...props }) {
    const form = Form.useFormInstance();
    const parentValue = Form.useWatch(dependsOn, form);
    const previousParent = useRef(parentValue);

    useEffect(() => {
        if (previousParent.current !== undefined && previousParent.current !== parentValue) {
            onChange?.(multiple ? [] : undefined);
        }
        previousParent.current = parentValue;
    }, [multiple, onChange, parentValue]);

    return <LookupOptionsSelect {...props} dependsOn={dependsOn} parentValue={parentValue} multiple={multiple} onChange={onChange} />;
}

// A select whose options come from a named lookup. A dependent lookup reloads
// when its parent field changes.
export default function LookupSelect({ dependsOn, ...props }) {
    return dependsOn
        ? <DependentLookupSelect dependsOn={dependsOn} {...props} />
        : <LookupOptionsSelect {...props} />;
}
