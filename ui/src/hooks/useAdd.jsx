import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { apiRequest } from '../services/apiClient';
import useCreate from '../core/hooks/data/useCreate';
import { useCustomMutation } from '../core/hooks/data/useCustom';
import { useQueryClient } from "@tanstack/react-query";

const { RangePicker } = DatePicker;

const useAdd = (tablesMetaData, whereKeyName, autoFetch = true) => {
    const { message } = useNotification();
    const valuesStore = ValuesStore();
    const upload = useUpload('', '');
    const draggable = useDraggable();
    const editor = useTextEditor();
    const dynamicForm = useDynamicForm('myform', null, null, null, true);

    const [showModal, setShowModal] = useState(false);
    const [tblMetaDataName, setTblMetaDataName] = useState(tablesMetaData);
    const [whrKeyName, setWhrKeyName] = useState(whereKeyName);
    const [record, setRecord] = useState({});
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

    // ─── refs ─────────────────────────────────────────────────────────────
    const recordRef = useRef(record);          // always-current record — no stale closure in addForm
    const extraMetaRef = useRef(new Set());       // O(1) guard — replaces extraMetaList array check
    const targetPendingRef = useRef(new Set());       // prevents duplicate setTarget in-flight calls
    const formBuildingRef = useRef(false);           // prevents concurrent addForm runs

    // keep recordRef in sync with record state — no form rebuild triggered
    useEffect(() => {
        recordRef.current = record;
    }, [record]);

    // ─── memoize metadata lookup ──────────────────────────────────────────
    const tblMeta = useMemo(() => {
        if (!tblName) return [];
        return valuesStore
            .getValuesBy(tblMetaDataName, whrKeyName, tblName)
            ?.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) ?? [];
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

    // ─── useEffect for addForm — record removed from deps ─────────────────
    // record is intentionally excluded — values flow through recordRef
    // addForm only rebuilds when structure changes, not on every keystroke
    useEffect(() => {
        if (!autoFetch || !tblName) return;
        if (formBuildingRef.current) return;
        addForm(tblName);
    }, [
        tblName,
        sqlSelectResult,
        fields,
        dynamicForm.htmlMarkupModel,
        dynamicForm.childrenHtmlMarkupModel,
        upload.fileList,
        // record is intentionally NOT here — use recordRef.current inside addForm instead
    ]);

    // ─── addForm ──────────────────────────────────────────────────────────
    async function addForm(tableName) {
        if (formBuildingRef.current) return;
        formBuildingRef.current = true;

        try {
            const meta = filteredMeta;
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
                const visible = meta[i]['backend_visible'];
                const validator = meta[i]['validator'];
                const disabled = meta[i]?.['disabled'] ? true : false;

                tempValidatorMap[key] = { validator, realName };

                if (!visible) continue;

                // read from ref — always current value, never stale, no form rebuild on keystroke
                const value = recordRef.current[name] || undefined;
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

                                const res = await apiRequest(
                                    'post',
                                    `/api/v1/${requestTo}`,
                                    { sql },
                                    null

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
                                        value={dayjs(value || '00:00:00', 'HH:mm:ss')}
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
                                        value={dayjs(value || '0000-00-00 00:00:00', sqlSelectResult[name]?.format ?? 'YYYY-MM-DD HH:mm:ss')}
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
                                        value={value ? [
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
                        const cid = cryptoRandomString({ length: 10 });
                        if (!customIDIsSet) {
                            setRecord((r) => ({ ...r, [key]: cid }));
                            setCustomIDIsSet(true);
                        }
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom} hidden`}>
                                <Input disabled className="hidden" key={`${name}_editable`} value={cid} />
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
                                        value={value}
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
                                        value={value}
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
                                        value={value}
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
                                        value={value}
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
                                        value={value ? value?.toString()?.split(',') : []}
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
                                        value={value}
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
                                        value={value}
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
                                        value={(() => {
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
                                    value={value}
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
                                        value={value}
                                        onChange={(e) => changeValue(e.target.value, key)}
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
                                        value={value}
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
            }

            setForm(html);
            setValidatorMap(tempValidatorMap);

        } catch (err) {
            console.error('[useAdd] addForm error:', err.message, err.stack);
        } finally {
            formBuildingRef.current = false;
        }
    }

    // ─── changeValue ──────────────────────────────────────────────────────
    // only updates record state and recordRef — does NOT trigger addForm rebuild
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

        const tblMetaForKey = valuesStore.getValuesBy(tblMetaDataName, whereKeyName, tblName);
        const elem = tblMetaForKey.find((item) => item?.column_name === key) ?? {};
        const options = elem.extra_options;
        if (!options) return;

        const j = JSON.parse(options);
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
                    const res = await apiRequest(
                        'post',
                        `${Settings.baseUrl}/v1/extra_meta_options`,
                        { sql },
                        null

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
    // const { mutate: createMutate, isPending: createPending } = useCreate({
    //     resource,
    //     meta,
    //     mutationOptions: {
    //         onError: (error) => message.error(error?.message || 'Failed to save record'),
    //     },
    // });

    const queryClient = useQueryClient();

    // Replace save():
    async function save(resource, callback) {
        const v = validateShowErrorMessage();
        if (!v?.isValid) return;

        setLoading(true);
        try {
            await apiRequest('post', `api/${resource}`, { ...record });
            queryClient.invalidateQueries({ queryKey: [resource, 'list'] });
            reset();
            message.success('Record has been added successfully');
            callback?.(true, 'Record has been added successfully');
        } catch (error) {
            message.error(error?.message || 'Failed to save record');
            callback?.(false, error?.message);
        } finally {
            setLoading(false);
        }
    }

    // Replace saveWithFiles():
    async function saveWithFiles(resource, callback) {
        const v = validateShowErrorMessage();
        if (!v?.isValid) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('body', JSON.stringify(record));

            if (upload.fileList?.length) {
                upload.fileList.forEach((file) => {
                    if (file.originFileObj) formData.append('file', file.originFileObj);
                });
            }

            await apiRequest(
                'post',
                `/api/${resource}/file`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            queryClient.invalidateQueries({ queryKey: [resource, 'list'] });
            reset();
            message.success('Record has been added successfully');
            callback?.(true, 'Record has been added successfully');
        } catch (error) {
            message.error(error?.message || 'Failed to save record');
            callback?.(false, error?.message);
        } finally {
            setLoading(false);
        }
    }

    // ─── reset ────────────────────────────────────────────────────────────
    function reset() {
        setTblName(undefined);
        setShowModal(false);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setRecord({});
        setSaveCompleted(true);
        setLoading(false);
        setCustomIDIsSet(false);
        dynamicForm.form.resetFields();
    }

    function resetCompletely() {
        setTblName(undefined);
        setShowModal(false);
        upload.setBase64FileList([]);
        upload.setFileList([]);
        setRecord({});
        setSaveCompleted(true);
        setLoading(false);
        setSqlSelectResult({});
        setExtraMetaList([]);
        setCustomIDIsSet(false);
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
    function addModal(title, handleOk, okText = 'Save', okButtonProps = { style: { background: Settings.secondaryColorHex, border: 'none' } }, width, shouldDrag = true) {
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
        whichElementChanged, setWhichElementChanged,
        setSqlPlaceHolders,
        setRecord, reset, resetCompletely,
        addModal, saveCompleted, setSaveCompleted,
        setTblName, tblName,
        setShowModal,
        setTblMetaDataName, setWhrKeyName,
        save, saveWithFiles,
        upload, record, editor,
        childrenBottom, setChildrenBottom,
        childrenTop, setChildrenTop,
        form, addForm,
        loading, setLoading,
        sqlSelectResult, setSqlSelectResult,
        extraMetaList, setExtraMetaList,
        setValidatorMap, validatorMap,
        validate, validateShowErrorMessage,
        dynamicForm,
        recallFiles, recallSingleFile,
    };
};

export default useAdd;