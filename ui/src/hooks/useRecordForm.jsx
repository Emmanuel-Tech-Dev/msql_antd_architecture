import { useState, useEffect, useRef, useMemo } from 'react';
import ValuesStore from '../store/values-store';
import utils from '../utils/function_utils';
import { Image, Modal, Input, Select, Checkbox, Radio, DatePicker, TimePicker } from 'antd';
import Settings from '../utils/Settings';
import useUpload from './useUpload';
import cryptoRandomString from 'crypto-random-string';
import useTextEditor from './useTextEditor';
import useDraggable from './useDraggable';
import useDynamicForm from './useDynamicForm';
import dayjs from 'dayjs';
import useNotification from './useNotification';
import { useQueryClient } from "@tanstack/react-query";
import { legacySqlToLookup } from '../utils/lookup_utils';
import { getFieldPolicy } from '../core/metadata/fieldPolicy';
import queryKeys from '../core/queryKeys';
import { useDataProvider } from '../core/provider/DataProvider';

const { RangePicker } = DatePicker;

const useRecordForm = (tablesMetaData, whereKeyName, autoFetch = true) => {
    const { message } = useNotification();
    const valuesStore = ValuesStore();
    const upload = useUpload('', '');
    const draggable = useDraggable();
    const editor = useTextEditor();
    const dynamicForm = useDynamicForm('myform', null, null, null, true);
    const dataProvider = useDataProvider();

    const [showModal, setShowModal] = useState(false);
    const [tblMetaDataName, setTblMetaDataName] = useState(tablesMetaData);
    const [whrKeyName, setWhrKeyName] = useState(whereKeyName);
    const [record, setRecord] = useState({});
    const [mode, setMode] = useState('create');
    const [recordId, setRecordId] = useState(undefined);
    const [form, setForm] = useState(undefined);
    const [tblName, setTblName] = useState(undefined);
    const [saveCompleted, setSaveCompleted] = useState(false);
    const [sqlPlaceHolders, setSqlPlaceHolders] = useState({});
    const [customIDIsSet, setCustomIDIsSet] = useState(false);
    const [sqlSelectResult, setSqlSelectResult] = useState({});
    const [whichElementChanged, setWhichElementChanged] = useState('');
    const [childrenBottom, setChildrenBottom] = useState(undefined);
    const [childrenTop, setChildrenTop] = useState(undefined);
    const [fields, setFields] = useState(undefined);
    const [extraMetaList, setExtraMetaList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validatorMap, setValidatorMap] = useState({});
    const [optionsVersion, setOptionsVersion] = useState(0);
    const [selectedKeysToEdit, setSelectedKeysToEdit] = useState([]);

    // ─── refs ─────────────────────────────────────────────────────────────
    const extraMetaRef = useRef(new Set());
    const targetPendingRef = useRef(new Set());       // prevents duplicate setTarget in-flight calls
    const formBuildingRef = useRef(false);


    // ─── memoize metadata lookup ──────────────────────────────────────────
    const tblMeta = useMemo(() => {
        if (!tblName) return [];
        return valuesStore
            .getValuesBy(tblMetaDataName, whrKeyName, tblName)
            ?.sort((a, b) => (Number(a.rank || 0)) - (Number(b.rank || 0))) ?? [];
        //    / console.log("Values", va)
    }, [tblName, tblMetaDataName, whrKeyName, valuesStore]);

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

    // Rebuild only when form structure or asynchronously loaded options change.
    // Record values use uncontrolled inputs and do not rebuild the form per keystroke.
    useEffect(() => {
        if (!autoFetch || !tblName) return;
        if (formBuildingRef.current) return;
        buildForm(tblName);
    }, [
        tblName,
        mode,
        // sqlSelectResult,
        // fields,
        optionsVersion,
        dynamicForm.htmlMarkupModel,
        dynamicForm.childrenHtmlMarkupModel,
        upload.fileList,
    ]);

    // ─── metadata-driven form builder ─────────────────────────────────────
    async function buildForm(tableName) {
        if (formBuildingRef.current) return;
        formBuildingRef.current = true;

        try {
            const meta = mode === 'edit'
                ? filteredMeta.filter((item) => Object.hasOwn(record, item.column_name))
                : filteredMeta;
            if (!meta?.length) {
                formBuildingRef.current = false;
                return;
            }

            const tempValidatorMap = {};
            const batchedSqlResults = {};  // accumulate all option updates — one setSqlSelectResult at end
            const html = [];

            for (let i = 0; i < meta.length; i++) {
                const realName = meta[i]['col_real_name'];
                const name = meta[i]['column_name'];
                const key = name;
                const type = meta[i]['type'];
                const fieldPolicy = getFieldPolicy(meta[i], mode);
                const visible = fieldPolicy.formVisible;
                const validator = meta[i]['validator'];
                const disabled = fieldPolicy.disabled;

                tempValidatorMap[key] = { validator, realName };

                if (!visible) continue;

                // read from ref — always current value, never stale, no form rebuild on keystroke
                const value = record[name] ?? undefined;
                const marginBottom = 'mb-2';
                const showValidatorIndicator = validator ? <label className="text-red-500">*</label> : '';

                let options;

                switch (type) {
                    case 'file': {
                        upload.setUploaderID(name);
                        upload.setMetaData(meta[i]);
                        break;
                    }
                    case 'dynaFormNested': {
                        if (!sqlSelectResult[name]) {
                            const opts = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            dynamicForm.setFormType('nested');
                            dynamicForm.setMeta(opts);
                        }
                        break;
                    }
                    case 'dynaFormSimple': {
                        if (!sqlSelectResult[name]) {
                            const opts = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            dynamicForm.setFormType('simple');
                            dynamicForm.setMeta(opts);
                        }
                        break;
                    }
                    case 'jsonRadio':
                    case 'jsonCheck':
                    case 'jsonSelect':
                    case 'jsonMultiSelect': {
                        if (!sqlSelectResult[name] && !batchedSqlResults[name]) {
                            const p = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            options = Object.entries(p).map(([k, v]) => ({ value: k, label: v }));
                            batchedSqlResults[name] = options;
                        } else {
                            options = batchedSqlResults[name] ?? sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'csvRadio':
                    case 'csvCheck':
                    case 'csvSelect':
                    case 'csvMultiSelect': {
                        if (!sqlSelectResult[name] && !batchedSqlResults[name]) {
                            options = meta[i]['options']
                                ? meta[i]['options'].split(',').map((v) => ({ value: v, label: v }))
                                : [];
                            batchedSqlResults[name] = options;
                        } else {
                            options = batchedSqlResults[name] ?? sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'sqlRadio':
                    case 'sqlCheck':
                    case 'sqlSelect':
                    case 'sqlMultiSelect': {
                        const p = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                        // console.log(p)
                        let sql = p?.sql;
                        const optKey = p?.key;
                        const optValue = p?.value;
                        const image = p?.image;
                        const groupBy = p?.groupBy;
                        const tablemodel = p?.tablemodel;
                        const endpointResKey = p?.endpoint_result_key;
                        const requestTo = tablemodel ? tablemodel : 'extra_meta_options';

                        for (let placeholder in sqlPlaceHolders) {
                            sql = sql.replace(placeholder, sqlPlaceHolders[placeholder]);
                        }

                        if (sql) {
                            if (sqlSelectResult[name] || batchedSqlResults[name]) {
                                options = batchedSqlResults[name] ?? sqlSelectResult[name];

                            } else if (!extraMetaRef.current.has(name)) {
                                // ref-based guard — no stale closure race condition
                                extraMetaRef.current.add(name);
                                setExtraMetaList((r) => [...r, name]);

                                const lookupPayload = legacySqlToLookup(sql);
                                if (!lookupPayload) {
                                    throw new Error(`Unsupported lookup definition for ${name}`);
                                }
                                const { data: res } = await dataProvider.custom({
                                    url: `/api/v1/${requestTo}`,
                                    method: 'post',
                                    payload: lookupPayload,
                                    unwrap: true,
                                });

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
                            const opts = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
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
                                        defaultValue={dayjs(value || '00:00:00', 'HH:mm:ss')}
                                        placeholder={`Enter ${realName}`}
                                        onChange={(_, dateString) => changeValue(dateString, key)}
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
                                        defaultValue={dayjs(value || '0000-00-00 00:00:00', sqlSelectResult[name]?.format ?? 'YYYY-MM-DD HH:mm:ss')}
                                        placeholder={`Enter ${realName}`}
                                        showTime
                                        onChange={(_, dateString) => changeValue(dateString, key)}
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
                                        defaultValue={value ? [
                                            value.split(',')[0] ? dayjs(value.split(',')[0]) : null,
                                            value.split(',')[1] ? dayjs(value.split(',')[1]) : null,
                                        ] : null}
                                        placeholder={['Start Date', 'End Date']}
                                        onChange={(dates, dateStrings) => {
                                            const dateValue = dates
                                                ? [dateStrings[0] || null, dateStrings[1] || null].join(',')
                                                : dateStrings?.join(',') ?? null;
                                            changeValue(dateValue, key);
                                        }}
                                        allowEmpty={[true, true]}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'customGenerateString': {
                        const cid = value || cryptoRandomString({ length: 10 });
                        if (mode === 'create' && !value && !customIDIsSet) {
                            setRecord((r) => ({ ...r, [key]: cid }));
                            setCustomIDIsSet(true);
                        }
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom} hidden`}>
                                <Input disabled className="hidden" key={`${name}_editable`} defaultValue={cid} />
                            </div>
                        );
                        break;
                    }

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
                                        defaultValue={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
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
                                        defaultValue={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
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
                                        defaultValue={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
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
                                        defaultValue={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'jsonCheck':
                    case 'csvCheck':
                    case 'sqlCheck':
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Checkbox.Group
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        options={options ?? sqlSelectResult[name]}
                                        onChange={(v) => changeValue(v, key)}
                                        defaultValue={value ? value?.toString()?.split(',') : []}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'jsonRadio':
                    case 'csvRadio':
                    case 'sqlRadio':
                        html.push(
                            <div key={`${name}_select_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                <div className="mt-1">
                                    <Radio.Group
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        options={options ?? sqlSelectResult[name]}
                                        onChange={(e) => changeValue(e.target.value, key)}
                                        defaultValue={value}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

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
                                        onChange={(v) => changeValue(v, key)}
                                        defaultValue={value}
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
                                        onChange={(v) => {
                                            changeValue(v, key)
                                            console.log(v)
                                        }}
                                        defaultValue={(() => {
                                            if (!value) return [];
                                            const vals = value.toString().split(',').map((v) => v.trim()).filter(Boolean);
                                            const optList = options ?? sqlSelectResult[name] ?? [];
                                            // coerce each value to match the type used in options
                                            return vals.map((v) => {
                                                const match = optList.find(
                                                    (opt) => String(opt.value) === String(v)
                                                );
                                                return match ? match.value : v;
                                            });
                                        })()}
                                        options={options ?? sqlSelectResult[name]}
                                    // showSearch
                                    // filterOption={(input, option) =>
                                    //     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    // }
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'textEditor':
                        html.push(
                            <div key={`${name}_editable`} className={marginBottom}>
                                <label className={`font-bold ${marginBottom}`}>Enter {realName}{showValidatorIndicator}</label>
                                {editor.editor()}
                            </div>
                        );
                        break;

                    case 'file':
                        html.push(
                            <div key={`${name}_editable`}>
                                <label className={`font-bold ${marginBottom}`}>Upload {realName}{showValidatorIndicator}</label>
                                {upload.uploader('files', `${Settings.baseUrl}/file_uploads`, `${name}_editable`, `${name}_editable`)}
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
                                    defaultValue={value}
                                    onChange={(e) => changeValue(e.target.value, key)}
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
                                        defaultValue={value}
                                        onChange={(nextValue) => changeValue(nextValue, key)}
                                        {...(sqlSelectResult[name] ?? {})}
                                    />
                                </div>
                            </div>
                        );
                        break;

                    case 'dynaFormSimple':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                {dynamicForm.dynaFormSimple(dynamicForm.htmlMarkupModel)}
                            </div>
                        );
                        break;

                    case 'dynaFormNested':
                        html.push(
                            <div key={`${name}_input_wrapper`} className={marginBottom}>
                                <span>{realName}{showValidatorIndicator}:</span>
                                {dynamicForm.dynaformNested(dynamicForm.htmlMarkupModel, dynamicForm.childrenHtmlMarkupModel)}
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
                                        type={type}
                                        placeholder={`Enter ${realName}`}
                                        defaultValue={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>
                        );
                }
            }

            // one batched setState for all option results — not N separate calls
            if (Object.keys(batchedSqlResults).length) {
                setSqlSelectResult((prev) => ({ ...prev, ...batchedSqlResults }));
                setOptionsVersion((v) => v + 1);
            }

            setForm(html);
            setValidatorMap(tempValidatorMap);

        } catch (err) {
            console.error('[useRecordForm] buildForm error:', err.message, err.stack);
        } finally {
            formBuildingRef.current = false;
        }
    }

    // ─── changeValue ──────────────────────────────────────────────────────
    // Updating a value does not rebuild the metadata-driven form.
    function changeValue(value, key) {
        const normalized = Array.isArray(value) ? value.join(',') : value;
        setWhichElementChanged(key);
        setRecord((prev) => ({ ...prev, [key]: normalized }));
        setTarget(normalized, key);
    }

    // ─── setTarget — ref guard prevents duplicate in-flight requests ──────
    async function setTarget(v, key) {
        const guardKey = `${key}:${v}`;
        if (targetPendingRef.current.has(guardKey)) return;



        const tblMetaForKey = valuesStore.getValuesBy(tblMetaDataName, whrKeyName, tblName);
        const elem = tblMetaForKey.find((item) => item?.column_name === key) ?? {};
        const options = elem.extra_options;
        if (!options) return;

        const j = JSON.parse(options);
        const targets = j?.targets;
        if (!targets?.length) return;

        targetPendingRef.current.add(guardKey);

        //  console.log(targets)
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
                    const lookupPayload = legacySqlToLookup(sql);
                    if (!lookupPayload) {
                        throw new Error(`Unsupported dependent lookup for ${target}`);
                    }
                    const { data: res } = await dataProvider.custom({
                        url: '/api/v1/extra_meta_options',
                        method: 'post',
                        payload: lookupPayload,
                        unwrap: true,
                    });

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
                    setOptionsVersion((v) => v + 1);
                })
            );
        } finally {
            targetPendingRef.current.delete(guardKey);
        }
    }

    // ─── validation ───────────────────────────────────────────────────────
    function validate() {
        if (Object.keys(validatorMap).length <= 0) return { verbose: {}, isValid: true };

        let isValid = true;
        const result = {};

        for (const key in validatorMap) {
            const value = record[key];
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

    // ─── save ─────────────────────────────────────────────────────────────
    const queryClient = useQueryClient();

    // Replace save():
    function getUpdatePayload(resource, source = record) {
        const metadata = valuesStore.getValuesBy(tblMetaDataName, whrKeyName, resource) ?? [];
        const metadataByColumn = new Map(metadata.map((item) => [item.column_name, item]));

        return Object.entries(source ?? {}).reduce((payload, [key, value]) => {
            const field = metadataByColumn.get(key);
            if (!field) return payload;

            const isPrimaryKey = field.type === 'primaryKey';
            if (!isPrimaryKey && getFieldPolicy(field, 'edit').writable) {
                payload[key] = value;
            }
            return payload;
        }, {});
    }

    function normalizeSaveConfig(options, legacyCallback) {
        if (typeof options === 'string') {
            return { resource: options, legacyCallback };
        }
        if (typeof options === 'function') {
            return { onSuccess: options };
        }
        return { ...(options ?? {}), legacyCallback };
    }

    async function save(options, legacyCallback) {
        const config = normalizeSaveConfig(options, legacyCallback);
        const resource = config.resource ?? tblName;
        const context = { mode, resource, id: recordId, record: { ...record } };

        if (config.validate !== false) {
            const validation = validateShowErrorMessage();
            if (!validation?.isValid) {
                return { success: false, validation };
            }
        }

        if (!resource) {
            const error = new Error('A resource is required to save this record');
            if (config.notify !== false) message.error(error.message);
            config.onError?.(error, context);
            config.legacyCallback?.(false, error.message);
            return { success: false, error };
        }

        const hasRecordId = recordId !== undefined && recordId !== null;
        if (mode === 'edit' && !hasRecordId && !config.endpoint) {
            const error = new Error('A record ID is required for the standard update endpoint');
            if (config.notify !== false) message.error(error.message);
            config.onError?.(error, context);
            config.legacyCallback?.(false, error.message);
            return { success: false, error };
        }

        let payload = mode === 'edit' ? getUpdatePayload(resource) : { ...record };
        try {
            if (config.transform) {
                payload = await config.transform(payload, context);
            }
            if (mode === 'edit' && !config.endpoint) {
                payload = getUpdatePayload(resource, payload);
            }
        } catch (error) {
            const errorMessage = config.errorMessage ?? error?.message ?? 'Failed to transform record payload';
            if (config.notify !== false) message.error(errorMessage);
            config.onError?.(error, context);
            config.legacyCallback?.(false, errorMessage);
            return { success: false, error };
        }

        const multipart = config.multipart === true;
        const defaultEndpoint = multipart
            ? `api/${resource}/file`
            : mode === 'edit'
                ? `api/${resource}/${recordId}`
                : `api/${resource}`;
        let endpoint;
        try {
            endpoint = typeof config.endpoint === 'function'
                ? config.endpoint(context)
                : config.endpoint ?? defaultEndpoint;
        } catch (error) {
            const errorMessage = config.errorMessage ?? error?.message ?? 'Failed to resolve record endpoint';
            if (config.notify !== false) message.error(errorMessage);
            config.onError?.(error, context);
            config.legacyCallback?.(false, errorMessage);
            return { success: false, error };
        }
        const method = String(config.method ?? (multipart ? 'post' : mode === 'edit' ? 'put' : 'post')).toLowerCase();
        if (!['post', 'put', 'patch'].includes(method)) {
            const error = new Error(`Unsupported record save method: ${method}`);
            if (config.notify !== false) message.error(error.message);
            config.onError?.(error, context);
            config.legacyCallback?.(false, error.message);
            return { success: false, error };
        }
        const invalidateResources = Array.isArray(config.invalidateResources)
            ? config.invalidateResources
            : [resource];

        let requestBody = payload;
        const headers = { ...(config.headers ?? {}) };
        if (multipart) {
            const formData = new FormData();
            formData.append(config.bodyField ?? 'body', JSON.stringify(payload));
            upload.fileList?.forEach((file) => {
                if (file.originFileObj) {
                    formData.append(config.fileField ?? 'file', file.originFileObj);
                }
            });
            requestBody = formData;
            headers['Content-Type'] ??= 'multipart/form-data';
        }

        setLoading(true);
        try {
            const isStandardCrud = !config.endpoint && !multipart && !config.method;
            const providerResult = isStandardCrud
                ? mode === 'edit'
                    ? await dataProvider.update({
                        resource,
                        id: recordId,
                        variables: requestBody,
                    })
                    : await dataProvider.create({ resource, variables: requestBody })
                : await dataProvider.custom({
                    url: endpoint,
                    method,
                    payload: requestBody,
                    headers,
                });
            const response = providerResult?.data;

            await Promise.all(
                invalidateResources.map((item) =>
                    queryClient.invalidateQueries({ queryKey: queryKeys.lists(item) })
                )
            );
            if (mode === 'edit' && hasRecordId) {
                queryClient.removeQueries({ queryKey: queryKeys.one(resource, recordId) });
            }

            const successMessage = config.successMessage ?? (mode === 'edit'
                ? 'Record has been updated successfully'
                : 'Record has been added successfully');
            if (config.resetOnSuccess !== false) reset();
            if (config.notify !== false) message.success(successMessage);
            config.onSuccess?.(response, context);
            config.legacyCallback?.(true, successMessage);
            return { success: true, data: response };
        } catch (error) {
            const errorMessage = config.errorMessage
                ?? error?.message
                ?? `Failed to ${mode === 'edit' ? 'update' : 'save'} record`;
            if (config.notify !== false) message.error(errorMessage);
            config.onError?.(error, context);
            config.legacyCallback?.(false, errorMessage);
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    }

    function saveWithFiles(options, legacyCallback) {
        if (typeof options === 'string') {
            return save({ resource: options, multipart: true }, legacyCallback);
        }
        if (typeof options === 'function') {
            return save({ multipart: true, onSuccess: options });
        }
        return save({ ...(options ?? {}), multipart: true }, legacyCallback);
    }

    async function saveSelected(keys = selectedKeysToEdit, callback) {
        if (mode !== 'edit') {
            message.error('Selected-field saving is only available while editing');
            return;
        }
        if (!Array.isArray(keys)) {
            message.error('Selected field keys must be an array');
            return;
        }
        if (!tblName || recordId === undefined || recordId === null) {
            message.error('A resource and record ID are required to update this record');
            return;
        }

        const allowedPayload = getUpdatePayload(tblName);
        const payload = keys.reduce((result, key) => {
            if (Object.hasOwn(allowedPayload, key)) result[key] = allowedPayload[key];
            return result;
        }, {});

        setLoading(true);
        try {
            await dataProvider.update({
                resource: tblName,
                id: recordId,
                variables: payload,
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.lists(tblName) });
            queryClient.removeQueries({ queryKey: queryKeys.one(tblName, recordId) });
            reset();
            const successMessage = 'Selected fields have been updated successfully';
            message.success(successMessage);
            callback?.(true, successMessage);
        } catch (error) {
            message.error(error?.message || 'Failed to update selected fields');
            callback?.(false, error?.message);
        } finally {
            setLoading(false);
        }
    }

    // ─── reset ────────────────────────────────────────────────────────────
    function openCreate(resource, initialValues = {}) {
        setMode('create');
        setRecordId(undefined);
        setRecord({ ...initialValues });
        setTblName(resource);
        setSaveCompleted(false);
        setShowModal(true);
    }

    function openEdit(resource, existingRecord, id = existingRecord?.id) {
        if (!existingRecord || typeof existingRecord !== 'object') {
            throw new Error('[useRecordForm] openEdit requires an existing record');
        }
        setMode('edit');
        setRecordId(id);
        setRecord({ ...existingRecord });
        setTblName(resource);
        setSaveCompleted(false);
        setShowModal(true);
    }

    function reset() {
        setTblName(undefined);
        setShowModal(false);
        setMode('create');
        setRecordId(undefined);
        setForm(undefined);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setRecord({});
        setSaveCompleted(true);
        setLoading(false);
        setCustomIDIsSet(false);
        setSelectedKeysToEdit([]);
        setOptionsVersion(0);
        setSqlSelectResult({});
        setExtraMetaList([]);
        extraMetaRef.current.clear();
        targetPendingRef.current.clear();
        dynamicForm.form.resetFields();

    }

    function resetCompletely() {
        setTblName(undefined);
        setShowModal(false);
        setMode('create');
        setRecordId(undefined);
        setForm(undefined);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setRecord({});
        setSaveCompleted(true);
        setLoading(false);
        setSqlSelectResult({});
        setExtraMetaList([]);
        setCustomIDIsSet(false);
        setSelectedKeysToEdit([]);
        extraMetaRef.current.clear();
        targetPendingRef.current.clear();
        dynamicForm.form.resetFields();
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
    function recordModal({
        createTitle = 'Add Record',
        editTitle = 'Edit Record',
        onOk,
        okText = 'Save',
        okButtonProps = { style: { background: Settings.secondaryColorHex, border: 'none' } },
        width,
        shouldDrag = true,
    } = {}) {
        const title = mode === 'edit' ? editTitle : createTitle;
        const handleOk = onOk ?? (() => save());
        const modalTitle = shouldDrag ? <div {...draggable.draggableTitleProps}>{title}</div> : title;
        return (
            <>
                <Modal
                    modalRender={(modal) => shouldDrag ? draggable.drag(modal) : modal}
                    confirmLoading={loading}
                    zIndex={9999}
                    title={modalTitle}
                    width={width}
                    open={showModal}
                    onOk={handleOk}
                    onCancel={resetCompletely}
                    okText={okText}
                    okButtonProps={okButtonProps}
                >
                    <div className="grid grid-cols-1 gap-2">
                        <div>{childrenTop}</div>
                        <div key={`${mode}:${tblName}:${recordId ?? 'new'}`}>{form}</div>
                        <div>{childrenBottom}</div>
                    </div>
                </Modal>
                {upload.preview()}
            </>
        );
    }

    return {
        mode,
        isEditing: mode === 'edit',
        recordId,
        openCreate,
        openEdit,
        fields, setFields,
        whichElementChanged, setWhichElementChanged,
        setSqlPlaceHolders,
        setRecord, reset, resetCompletely,
        recordModal, saveCompleted, setSaveCompleted,
        setTblName, tblName,
        setShowModal,
        setTblMetaDataName, setWhrKeyName,
        save, saveSelected, saveWithFiles,
        upload, record, editor,
        childrenBottom, setChildrenBottom,
        childrenTop, setChildrenTop,
        form, buildForm,
        loading, setLoading,
        sqlSelectResult, setSqlSelectResult,
        extraMetaList, setExtraMetaList,
        setValidatorMap, validatorMap,
        selectedKeysToEdit, setSelectedKeysToEdit,
        validate, validateShowErrorMessage,
        dynamicForm,
        recallFiles, recallSingleFile,
    };
};

export default useRecordForm;
