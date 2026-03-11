import { useState, useEffect, useRef, useMemo } from 'react';
import ValuesStore from '../store/values-store';
import Settings from '../utils/Settings';
import utils from '../utils/function_utils';
import { Image, Modal, Input, Select, DatePicker, TimePicker, Radio, Checkbox } from 'antd';
import dayjs from 'dayjs';
import useUpload from './useUpload';
import useTextEditor from './useTextEditor';
import useDraggable from './useDraggable';
import useNotification from './useNotification';
import { apiRequest } from '../services/apiClient';

const { RangePicker } = DatePicker;

const useEdit = (tablesMetaData, whereKeyName) => {
    const { message } = useNotification();
    const valuesStore = ValuesStore();
    const upload = useUpload('', '');
    const editor = useTextEditor();
    const draggable = useDraggable();

    const [showModal, setShowModal] = useState(false);
    const [tblMetaDataName, setTblMetaDataName] = useState(tablesMetaData);
    const [whrKeyName, setWhrKeyName] = useState(whereKeyName);
    const [form, setForm] = useState(undefined);
    const [tblName, setTblName] = useState(undefined);
    const [data, setData] = useState(undefined);
    const [recordKey, setRecordKey] = useState(undefined);
    const [saveCompleted, setSaveCompleted] = useState(false);
    const [sqlPlaceHolders, setSqlPlaceHolders] = useState({});
    const [sqlSelectResult, setSqlSelectResult] = useState({});
    const [whichElementChanged, setWhichElementChanged] = useState('');
    const [childrenBottom, setChildrenBottom] = useState(undefined);
    const [childrenTop, setChildrenTop] = useState(undefined);
    const [fields, setFields] = useState(undefined);
    const [extraMetaList, setExtraMetaList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedKeysToEdit, setSelectedKeysToEdit] = useState([]);
    const [validatorMap, setValidatorMap] = useState({});

    // ─── refs ─────────────────────────────────────────────────────────────
    const dataRef = useRef(data);           // always-current data — no stale closure in editableForm
    const extraMetaRef = useRef(new Set());      // O(1) guard — replaces extraMetaList array check
    const targetPendingRef = useRef(new Set());      // prevents duplicate setTarget in-flight calls
    const formBuildingRef = useRef(false);          // prevents concurrent editableForm runs

    // keep dataRef in sync — no form rebuild on every keystroke
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // ─── memoize metadata lookup ──────────────────────────────────────────
    const tblMeta = useMemo(() => {
        if (!tblName) return [];
        return valuesStore
            .getValuesBy(tblMetaDataName, whrKeyName, tblName)
            ?.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) ?? [];
    }, [tblName, tblMetaDataName, whrKeyName, valuesStore]);

    // ─── O(1) meta lookup map — eliminates O(n²) nested loops ────────────
    const metaByColumn = useMemo(() => {
        const map = {};
        tblMeta.forEach((m) => { map[m.column_name] = m; });
        return map;
    }, [tblMeta]);

    // ─── filtered meta ────────────────────────────────────────────────────
    const filteredMeta = useMemo(() => {
        if (!fields?.length) return tblMeta;
        return tblMeta.filter((v) => fields.includes(v.column_name));
    }, [tblMeta, fields]);

    // ─── helpers ──────────────────────────────────────────────────────────
    function selectOptionLabelRender(image, key, value, row) {
        const vl = value?.split(',').map((val) => row[val]).join(' - ');
        return image ? (
            <div key={`${row[key]}_select_options`} className="flex">
                <Image width={18} src={`${Settings.baseUrl}/${row[image]}`} />
                <span className="flex-grow-1">{vl}</span>
            </div>
        ) : vl;
    }

    // ─── useEffect for editableForm — replaces useMemo misuse ────────────
    // data excluded from deps — reads from dataRef.current instead
    // valuesStore.getValue(recordKey) removed — was a function call in deps array
    useEffect(() => {
        if (!tblName || !data || !recordKey) return;
        if (formBuildingRef.current) return;
        editableForm(data, recordKey, tblName);
    }, [
        tblName,
        recordKey,
        sqlSelectResult,
        fields,
        upload.fileList,
    ]);

    // ─── editableForm ─────────────────────────────────────────────────────
    async function editableForm(data, recordKey, tableName) {
        if (formBuildingRef.current) return;
        formBuildingRef.current = true;

        try {
            const meta = filteredMeta;
            if (!meta?.length) {
                formBuildingRef.current = false;
                return;
            }

            const currentData = dataRef.current ?? {};
            const tempValidatorMap = {};
            const batchedSqlResults = {};  // accumulate — one setSqlSelectResult at end
            const html = [];

            for (const key of Object.keys(currentData)) {
                // O(1) lookup — replaces O(n) inner for loop per key
                const metaItem = metaByColumn[key];
                if (!metaItem) continue;

                const realName = metaItem['col_real_name'];
                const name = metaItem['column_name'];
                const type = metaItem['type'];
                const visible = metaItem['backend_visible'];
                const disabled = metaItem?.['disabled'] ? true : false;
                const validator = metaItem['validator'];

                tempValidatorMap[key] = { validator, realName };

                if (!visible) continue;

                const value = valuesStore.getValue(recordKey)?.[key];
                const marginBottom = 'mb-2';
                const showValidatorIndicator = validator ? <label className="text-red-500">*</label> : '';

                let options;

                switch (type) {
                    case 'file': {
                        upload.setUploaderID(name);
                        upload.setMetaData(metaItem);
                        break;
                    }
                    case 'jsonCheck':
                    case 'jsonRadio':
                    case 'jsonSelect':
                    case 'jsonMultiSelect': {
                        if (!sqlSelectResult[name] && !batchedSqlResults[name]) {
                            const p = metaItem['options'] ? JSON.parse(metaItem['options']) : {};
                            options = Object.entries(p).map(([k, v]) => ({ value: k, label: v }));
                            batchedSqlResults[name] = options;
                        } else {
                            options = batchedSqlResults[name] ?? sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'csvCheck':
                    case 'csvRadio':
                    case 'csvSelect':
                    case 'csvMultiSelect': {
                        if (!sqlSelectResult[name] && !batchedSqlResults[name]) {
                            options = metaItem['options']
                                ? metaItem['options'].split(',').map((v) => ({ value: v, label: v }))
                                : [];
                            batchedSqlResults[name] = options;
                        } else {
                            options = batchedSqlResults[name] ?? sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'sqlCheck':
                    case 'sqlRadio':
                    case 'sqlSelect':
                    case 'sqlMultiSelect': {
                        const p = metaItem['options'] ? JSON.parse(metaItem['options']) : {};
                        let sql = p?.sql;
                        const optKey = p?.key;
                        const optValue = p?.value;
                        const image = p?.image;
                        const groupBy = p?.groupBy;
                        const endpoint = p?.endpoint;
                        const endpointResKey = p?.endpoint_result_key;
                        const requestTo = endpoint ? endpoint : 'get_extra_meta_options';

                        for (const placeholder in sqlPlaceHolders) {
                            sql = sql.replace(placeholder, sqlPlaceHolders[placeholder]);
                        }

                        if (sql) {
                            if (sqlSelectResult[name] || batchedSqlResults[name]) {
                                options = batchedSqlResults[name] ?? sqlSelectResult[name];
                            } else if (!extraMetaRef.current.has(name)) {
                                extraMetaRef.current.add(name);
                                setExtraMetaList((r) => [...r, name]);

                                const res = await utils.requestWithReauth(
                                    'post',
                                    `${Settings.baseUrl}/${requestTo}`,
                                    null,
                                    { sql }
                                );

                                if (groupBy) {
                                    const grouped = utils.groupBy(res.details, groupBy);
                                    options = Object.entries(grouped).map(([group, items]) => ({
                                        label: group,
                                        options: items.map((v) => ({
                                            value: v[optKey],
                                            label: selectOptionLabelRender(image, optKey, optValue, v),
                                        })),
                                    }));
                                } else {
                                    const rows = res.details ?? res[endpointResKey] ?? [];
                                    options = rows.map((v) => ({
                                        value: v[optKey],
                                        label: selectOptionLabelRender(image, optKey, optValue, v),
                                    }));
                                }

                                batchedSqlResults[name] = options;
                            }
                        }
                        break;
                    }
                    default: {
                        if (!sqlSelectResult[name] && !batchedSqlResults[name]) {
                            const opts = metaItem['options'] ? JSON.parse(metaItem['options']) : {};
                            batchedSqlResults[name] = opts;
                        }
                        break;
                    }
                }

                switch (type?.trim()) {
                    case 'time':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <TimePicker
                                        key={`${name}_editable`}
                                        value={dayjs(value || '00:00:00', 'HH:mm:ss')}
                                        placeholder={`Enter ${realName}`}
                                        onChange={(_, dateString) => changeValue(dateString, key, recordKey)}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'dateTime':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <DatePicker
                                        key={`${name}_editable`}
                                        value={dayjs(value || '0000-00-00 00:00:00', sqlSelectResult[name]?.format ?? 'YYYY-MM-DD HH:mm:ss')}
                                        placeholder={`Enter ${realName}`}
                                        showTime
                                        onChange={(_, dateString) => changeValue(dateString, key, recordKey)}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'dateRange':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <RangePicker
                                        key={`${name}_editable`}
                                        value={value ? [
                                            value.split(',')[0] ? dayjs(value.split(',')[0]) : null,
                                            value.split(',')[1] ? dayjs(value.split(',')[1]) : null,
                                        ] : null}
                                        placeholder={['Start Date', 'End Date']}
                                        onChange={(dates, dateStrings) => {
                                            const dateValue = dates
                                                ? [dateStrings[0] || null, dateStrings[1] || null].join(',')
                                                : dateStrings?.join(',') ?? null;
                                            changeValue(dateValue, key, recordKey);
                                        }}
                                        allowEmpty={[true, true]}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'customGenerateString':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom} hidden`}>
                                <Input disabled className="hidden" key={`${name}_editable`} value={value} />
                            </div>
                        );
                        break;

                    case 'number':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        type="number"
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'password':
                    case 'cpassword':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input.Password
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        size="small"
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'text':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        type="text"
                                        size="small"
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'email':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        type="email"
                                        size="small"
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'jsonCheck':
                    case 'csvCheck':
                    case 'sqlCheck': {
                        const checked = (options ?? sqlSelectResult[name])?.filter((opt) => opt.value == value);
                        const val = checked?.length ? checked[0]?.value?.toString() : (value || undefined);
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Checkbox.Group
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        options={options ?? sqlSelectResult[name]}
                                        onChange={(v) => changeValue(v, key, recordKey)}
                                        value={val}
                                    />
                                </div>
                            </div>
                        );
                        break;
                    }

                    case 'jsonRadio':
                    case 'csvRadio':
                    case 'sqlRadio': {
                        const checked = (options ?? sqlSelectResult[name])?.filter((opt) => opt.value == value);
                        const val = checked?.length ? checked[0]?.value?.toString() : (value || undefined);
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Radio.Group
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        options={options ?? sqlSelectResult[name]}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                        value={val}
                                    />
                                </div>
                            </div>
                        );
                        break;
                    }

                    case 'sqlSelect':
                    case 'jsonSelect':
                    case 'csvSelect':
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Select
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        placeholder={`Select ${realName}`}
                                        className="w-full"
                                        onChange={(v) => changeValue(v, key, recordKey)}
                                        value={(options ?? sqlSelectResult[name])?.filter((opt) => opt.value == value)?.[0] ?? value ?? undefined}
                                        options={options ?? sqlSelectResult[name]}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'sqlMultiSelect':
                    case 'jsonMultiSelect':
                    case 'csvMultiSelect':
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Select
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        mode="multiple"
                                        allowClear
                                        placeholder={`Select ${realName}`}
                                        className="w-full"
                                        onChange={(v) => changeValue(v, key, recordKey)}
                                        value={value ? value?.toString()?.split(',') : []}
                                        options={options ?? sqlSelectResult[name]}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'textEditor':
                        html.push(
                            <div key={`${name}_editable`} className={marginBottom}>
                                <label className={`font-bold ${marginBottom}`}>Enter {realName}{showValidatorIndicator}</label>
                                {editor.editor(value)}
                            </div>
                        );
                        break;

                    case 'file':
                        html.push(
                            <div key={`${name}_editable`}>
                                <label className={`font-bold ${marginBottom}`}>Upload {realName}{showValidatorIndicator}</label>
                                {upload.uploader('uploadedImages', '', `${name}_editable`)}
                            </div>
                        );
                        break;

                    case 'textArea':
                        html.push(
                            <div key={`${name}_textarea_wrapper`} className={`${marginBottom} w-full`}>
                                <span>{realName}{showValidatorIndicator}</span>
                                <Input.TextArea
                                    disabled={disabled}
                                    key={`${name}_editable`}
                                    className="w-full"
                                    placeholder={`Enter ${realName}`}
                                    value={value}
                                    onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    autoSize
                                />
                            </div>
                        );
                        break;

                    case 'otp':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input.OTP
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    default:
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Input
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        type={type?.trim()}
                                        placeholder={`Enter ${realName}`}
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key, recordKey)}
                                    />
                                </div>
                            </div>
                        );
                }
            }

            // one batched setState for all option results — not N separate calls
            if (Object.keys(batchedSqlResults).length) {
                setSqlSelectResult((prev) => ({ ...prev, ...batchedSqlResults }));
            }

            setForm(html);
            setValidatorMap(tempValidatorMap);

        } catch (err) {
            console.error('[useEdit] editableForm error:', err.message, err.stack);
        } finally {
            formBuildingRef.current = false;
        }
    }

    // ─── changeValue — updates store + dataRef, does NOT trigger form rebuild
    function changeValue(value, key, recordKey) {
        const normalized = Array.isArray(value) ? value.join(',') : value;
        const current = valuesStore.getValue(recordKey);
        if (current && current[key] !== undefined) {
            valuesStore.updateObjectValue(recordKey, key, normalized);
            // keep dataRef in sync so editableForm always reads latest values
            dataRef.current = { ...dataRef.current, [key]: normalized };
        }
        setWhichElementChanged(key);
        setTarget(normalized, key);
    }

    // ─── setTarget — ref guard prevents duplicate in-flight requests ──────
    async function setTarget(v, key) {
        const guardKey = `${key}:${v}`;
        if (targetPendingRef.current.has(guardKey)) return;

        const elem = metaByColumn[key] ?? {};  // O(1) lookup
        const opts = elem.extra_options;
        if (!opts) return;

        const j = JSON.parse(opts);
        const targets = j?.targets;
        if (!targets?.length) return;

        targetPendingRef.current.add(guardKey);

        try {
            await Promise.all(
                targets.map(async (p) => {
                    let sql = p?.sql;
                    const optKey = p?.key;
                    const optValue = p?.value;
                    const image = p?.image;
                    const target = p?.target;
                    const groupBy = p?.groupBy;

                    if (!sql) return;

                    sql = sql.replace('this.value', v);
                    const res = await utils.requestWithReauth(
                        'post',
                        `${Settings.baseUrl}/get_extra_meta_options`,
                        null,
                        { sql }
                    );

                    let resolvedOptions;
                    if (groupBy) {
                        const grouped = utils.groupBy(res.details, groupBy);
                        resolvedOptions = Object.entries(grouped).map(([group, items]) => ({
                            label: group,
                            options: items.map((row) => ({
                                value: row[optKey],
                                label: selectOptionLabelRender(image, optKey, optValue, row),
                            })),
                        }));
                    } else {
                        resolvedOptions = res.details.map((row) => ({
                            value: row[optKey],
                            label: selectOptionLabelRender(image, optKey, optValue, row),
                        }));
                    }

                    setSqlSelectResult((prev) => ({ ...prev, [target]: resolvedOptions }));
                })
            );
        } finally {
            targetPendingRef.current.delete(guardKey);
        }
    }

    // ─── validation ───────────────────────────────────────────────────────
    function validate() {
        if (Object.keys(validatorMap).length <= 0) return { verbose: {}, isValid: false };

        let isValid = true;
        const result = {};

        for (const key in validatorMap) {
            const value = data?.[key];
            const rule = validatorMap[key]?.validator;
            const realName = validatorMap[key]?.realName;
            if (rule) {
                const v = utils.validateSoftData({ realName, name: key, value, required: true, validator: rule });
                if (!v.valid) isValid = false;
                result[key] = v;
            }
        }

        return { verbose: result, isValid };
    }

    function validateShowErrorMessage() {
        const v = validate();
        if (!v?.isValid) {
            for (const item in v?.verbose) {
                if (!v.verbose[item]?.valid) {
                    message.error(`Empty or Invalid ${v.verbose[item]?.realName}`);
                    break;
                }
            }
        }
        return v;
    }

    // ─── removeNonEditableFields ──────────────────────────────────────────
    function removeNonEditableFields(rKey, tableName) {
        const meta = valuesStore.getValuesBy(tblMetaDataName, whrKeyName, tableName);
        for (let i = 0; i < meta.length; i++) {
            const editable = meta[i]['editable'];
            const name = meta[i]['column_name'];
            const type = meta[i]['type'];
            if (!editable && type !== 'primaryKey') {
                valuesStore.deleteObjectValue(rKey, name);
            }
        }
    }

    // ─── removeUnknownFields ──────────────────────────────────────────────
    function removeUnknownFields(tableName, data) {
        const meta = valuesStore.getValuesBy(tblMetaDataName, whrKeyName, tableName);
        const metaMap = {};
        meta.forEach((m) => { metaMap[m.column_name] = true; });
        for (const key in data) {
            if (!metaMap[key]) delete data[key];
        }
        return data;
    }

    // ─── save ─────────────────────────────────────────────────────────────
    async function save(key = undefined, url = `${Settings.baseUrl}/update`, tableName = tblName, endpoint = null, callback) {
        removeNonEditableFields(key || recordKey, tableName);
        const d = valuesStore.getValue(key || recordKey);
        const b = removeUnknownFields(tableName, d);
        const res = await apiRequest('put', url, b);
        if (res.status === 'Ok') {
            reset(key);
            message.success('Record has been updated successfully');
            callback?.(true, 'Record has been updated successfully');
        } else {
            message.error(res.msg);
            callback?.(false, res.msg);
        }
    }

    async function saveRaw(key = undefined, url = `${Settings.baseUrl}/edit`, tableName = tblName, endpoint = null, callback) {
        removeNonEditableFields(key || recordKey, tableName);
        const d = valuesStore.getValue(key || recordKey);
        const res = await utils.requestWithReauth('post', url, endpoint, d);
        if (res.status === 'Ok') {
            reset(key);
            message.success('Record has been updated successfully');
            callback?.(true, 'Record has been updated successfully');
        } else {
            message.error(res.msg);
            callback?.(false, res.msg);
        }
    }

    async function saveSelected(key = undefined, url = `${Settings.baseUrl}/edit`, tableName = tblName, endpoint = null, callback, localSelectedKeysToEdit) {
        removeNonEditableFields(key || recordKey, tableName);
        const d = valuesStore.getValue(key || recordKey);
        const keys = localSelectedKeysToEdit || selectedKeysToEdit;

        if (!Array.isArray(keys)) {
            message.error('Keys to select must be an array');
            return;
        }

        const b = {};
        for (const k of keys) { b[k] = d[k]; }

        const res = await utils.requestWithReauth('post', url, endpoint, b);
        if (res.status === 'Ok') {
            reset(key);
            message.success('Record has been updated successfully');
            callback?.(true, 'Record has been updated successfully');
        } else {
            message.error(res.msg);
            callback?.(false, res.msg);
        }
    }

    async function saveWithFiles(key = undefined, url = `${Settings.baseUrl}/edit_with_files`, tableName = tblName, endpoint = null) {
        removeNonEditableFields(key || recordKey, tableName);
        const d = valuesStore.getValue(key || recordKey);
        const b = removeUnknownFields(tableName, d);
        const data = { record: JSON.stringify(b), files: JSON.stringify(upload.fileList) };
        const res = await utils.requestWithReauth('post', url, endpoint, data);
        if (res.status === 'Ok') {
            reset(key);
            message.success('Record has been updated successfully');
        } else {
            message.error(res.msg);
        }
    }

    // ─── reset ────────────────────────────────────────────────────────────
    function reset(key) {
        setTblName(undefined);
        setShowModal(false);
        setData(undefined);
        valuesStore.deleteValue(key || recordKey);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setSaveCompleted(true);
    }

    function resetCompletely() {
        setTblName(undefined);
        setShowModal(false);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setData(undefined);
        setSaveCompleted(true);
        setLoading(false);
        setSqlSelectResult({});
        setExtraMetaList([]);
        extraMetaRef.current.clear();
        targetPendingRef.current.clear();
    }

    // ─── file recall helpers ──────────────────────────────────────────────
    function recallFiles(record, filePathDBField, tableName, fileDelURL, fileDelRowIDFieldName, container) {
        const value = record[filePathDBField];
        const fs = value?.split(',').filter((f) => f !== '').map((filename) => ({
            name: filename, uid: filename,
            url: `${Settings.baseUrl}/${filename}`, container,
        })) ?? [];
        upload.setMultipleFiles(fs, 'name', 'url', 'uid', {
            tableName, fileDelURL, fileDelRowIDFieldName,
            fileDelRowIDValue: record[fileDelRowIDFieldName],
            filePathDBField, container,
        });
    }

    function recallSingleFile(file = { name: '', key: '', path: '', sysname: '' }, filePathDBField, tableName, fileDelURL, fileDelRowIDFieldName, fileDelRowIDValue, container) {
        const fs = [{ name: file?.name, uid: file?.key, url: `${Settings.baseUrl}/${file?.path}`, container }];
        upload.setMultipleFiles(fs, 'name', 'url', 'uid', {
            tableName, fileDelURL, fileDelRowIDFieldName,
            fileDelRowIDValue, filePathDBField, container, ...file,
        });
    }

    // ─── modal ────────────────────────────────────────────────────────────
    function editModal(title, handleOk, okText = 'Save', okButtonProps = { style: { background: Settings.secondaryColorHex, border: 'none' } }, width, shouldDrag = true) {
        const modalTitle = shouldDrag ? <div {...draggable.draggableTitleProps}>{title}</div> : title;
        return (
            <>
                <Modal
                    confirmLoading={loading}
                    modalRender={(modal) => shouldDrag ? draggable.drag(modal) : modal}
                    zIndex={1002}
                    width={width}
                    title={modalTitle}
                    open={showModal}
                    onOk={handleOk}
                    onCancel={() => setShowModal(false)}
                    okText={okText}
                    okButtonProps={okButtonProps}
                >
                    <div className="grid grid-cols-1 gap-2">
                        <div>{childrenTop}</div>
                        <div>{form}</div>
                        <div>{childrenBottom}</div>
                    </div>
                </Modal>
                {upload.preview()}
            </>
        );
    }

    return {
        fields, setFields,
        setSqlPlaceHolders,
        whichElementChanged, setWhichElementChanged,
        reset, resetCompletely,
        editModal,
        saveCompleted, setSaveCompleted,
        recallFiles, recallSingleFile,
        setShowModal,
        setTblMetaDataName, setWhrKeyName,
        save, saveRaw, saveSelected, saveWithFiles,
        setTblName, tblName,
        setData, setRecordKey,
        upload, editor,
        record: valuesStore.getValue(recordKey),
        childrenBottom, setChildrenBottom,
        childrenTop, setChildrenTop,
        form,
        loading, setLoading,
        sqlSelectResult, setSqlSelectResult,
        extraMetaList, setExtraMetaList,
        selectedKeysToEdit, setSelectedKeysToEdit,
        setValidatorMap, validatorMap,
        validate, validateShowErrorMessage,
    };
};

export default useEdit;