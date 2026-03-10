
import { useState, useMemo } from 'react';
import ValuesStore from '../store/values-store';
import utils from '../utils/function_utils';
import { Space, Image, Modal, Input, Select, Checkbox, Radio, DatePicker, TimePicker } from 'antd';
import Settings from "../utils/Settings"
import useUpload from './useUpload';
import cryptoRandomString from 'crypto-random-string';
import useTextEditor from './useTextEditor';
import useDraggable from './useDraggable';
import useDynamicForm from './useDynamicForm';
// import moment from 'moment';
import dayjs from 'dayjs';
import useNotification from './useNotification';
import { apiRequest } from '../services/apiClient';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
//this hook is based on zustand
const useAdd = (tablesMetaData, whereKeyName, autoFetch = true) => {
    const { message } = useNotification()
    const valuesStore = ValuesStore();
    const [showModal, setShowModal] = useState(false);
    const [tblMetaDataName, setTblMetaDataName] = useState(tablesMetaData);
    const [whrKeyName, setWhrKeyName] = useState(whereKeyName);
    const [record, setRecord] = useState({});
    const [form, setForm] = useState(undefined);
    const [tblName, setTblName] = useState(undefined);
    const upload = useUpload('', '');
    const [saveCompleted, setSaveCompleted] = useState(false);
    const [sqlPlaceHolders, setSqlPlaceHolders] = useState({});
    const [customIDIsSet, setCustomIDIsSet] = useState(false);
    const [sqlSelectResult, setSqlSelectResult] = useState({});
    const [whichElementChanged, setWhichElementChanged] = useState('');
    const [childrenBottom, setChildrenBottom] = useState(undefined);
    const [childrenTop, setChildrenTop] = useState(undefined);
    const [fields, setFields] = useState(undefined);
    const draggable = useDraggable();
    const editor = useTextEditor();
    const dynamicForm = useDynamicForm("myform", null, null, null, true)
    const [extraMetaList, setExtraMetaList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validatorMap, setValidatorMap] = useState({});




    async function save(url = `${Settings.baseUrl}/${tblName}`, tablemodel = { tbl: tblName }, callback) {
        console.log(url, tablemodel, record)
        const v = validateShowErrorMessage();
        if (!v?.isValid) return;
        let res = await apiRequest('post', url, { ...record }, null,);
        console.log(res, record)
        if (res.status === 'Ok') {
            reset();
            if (callback) {
                callback(true, 'Record has been added successfully');
            }
            message.success('Record has been added succesfully');
        } else {
            if (callback) {
                callback(false, 'Record has been added successfully');
            }
            message.error(res.msg);
        }
    }

    async function saveWithFiles(url = `${Settings.baseUrl}/add_with_files`, tablemodel = { tbl: tblName }, callback) {
        const v = validateShowErrorMessage();
        if (!v?.isValid) return;
        const data = { 'record': JSON.stringify(record), 'files': JSON.stringify(upload.base64FileList) }
        let res = await utils.requestWithReauth('post', url, tablemodel, data);
        if (res.status === 'Ok') {
            reset();
            if (callback) {
                callback(true, 'Record has been added successfully');
            }
            message.success('Record has been added succesfully');
        } else {
            if (callback) {
                callback(false, res.msg);
            }
            message.error(res.msg);
        }
    }

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
        dynamicForm.form.resetFields();
    }

    useMemo(() => {
        if (autoFetch) {
            addForm(tblName);
        }

        // console.log('add hook looping');
    }, [tblName, upload.fileList, record, sqlSelectResult, fields, dynamicForm.htmlMarkupModel, dynamicForm.childrenHtmlMarkupModel]);

    function selectOptionLabelRender(image, key, value, row) {
        const vl = value?.split(',').map(val => row[val]).join(' - ');
        return image ?
            <div key={`${row[key]}_select_options`} className={`flex`}>
                <Image
                    className=''
                    width={18}
                    src={`${Settings.baseUrl}/${row[image]}`}
                />
                <span className="flex-grow-1">{vl}</span>
            </div> : vl;
    }

    function validate() {
        let isValid = true; // Initialize isValid to true
        let result = {};
        if (Object.keys(validatorMap)?.length <= 0) {
            return { verbose: result, isValid: false };
        }
        for (let key in validatorMap || {}) {
            const value = record[key];//value to be validated
            const rule = validatorMap?.[key]?.['validator'];
            const realName = validatorMap?.[key]?.['realName'];
            if (rule) {//skip fields with  falsy (null or undefined) rules
                const d = { realName, name: key, value, required: true, validator: rule };
                const v = utils.validateSoftData(d);
                if (!v.valid) {
                    isValid = false; // If validation fails, set isValid to false
                }
                result = { ...result, [key]: v };
            }
        }
        return { verbose: result, isValid };
    }

    function validateShowErrorMessage() {
        const v = validate();
        if (!v?.isValid) {
            const verbose = v?.verbose;
            for (let item in verbose) {
                if (!verbose[item]?.valid) {
                    message.error(`Empty or Invalid ${verbose[item]?.realName}`);
                    break;
                }
            }
        }
        return v;
    }

    //this sets the upload hook up by getting data from the record object that is supplied
    //this works on multiple files whose path are in csv format
    function recallFiles(record, filePathDBField, tableName, fileDelURL, fileDelRowIDFieldName, container) {
        let value = record[filePathDBField];
        let fs = value?.split(',').filter(f => f !== '')?.map(filename => ({ name: filename, uid: filename, url: `${Settings.baseUrl}/${filename}`, container }));
        fs = fs ? fs : [];
        upload.setMultipleFiles(fs, 'name', 'url', 'uid', { tableName, fileDelURL, fileDelRowIDFieldName, fileDelRowIDValue: record[fileDelRowIDFieldName], filePathDBField, container });
    }

    //this sets the upload hook up by using some raw data that is supplied 
    function recallSingleFile(file = { name: '', key: '', path: '', sysname: '' }, filePathDBField, tableName, fileDelURL, fileDelRowIDFieldName, fileDelRowIDValue, container) {
        const fs = [{
            name: file?.name,
            uid: file?.key, url: `${Settings.baseUrl}/${file?.path}`,
            container
        }];
        upload.setMultipleFiles(fs, 'name', 'url', 'uid', { tableName, fileDelURL, fileDelRowIDFieldName, fileDelRowIDValue, filePathDBField, container, ...file });
    }


    async function addForm(tableName) {
        try {
            let meta = valuesStore?.getValuesBy(tblMetaDataName, whrKeyName, tableName)?.sort((a, b) => a.rank - b.rank);


            if (fields && fields?.length) {
                meta = meta.filter((v) => {
                    return fields.includes(v.column_name)
                });
            }
            // console.log(meta);
            let tempValidatorMap = {}; // Temporary object to accumulate validator mappings
            let html = [];
            for (let i = 0; i < meta.length; i++) {
                let realName = meta[i]['col_real_name'];
                let name = meta[i]['column_name'];
                const key = name;
                let type = meta[i]['type'];
                let options = undefined;
                let visible = meta[i]['backend_visible'];
                let validator = meta[i]['validator'];
                let disabled = meta[i]?.['disabled'] ? true : false;
                tempValidatorMap[key] = { validator, realName }; // setting various field name and their validator fns and real names
                //e.g {field_colname:{validator:'validationFunction',realName:'myFieldNae'}}
                const showValidatorIndicator = validator ? <label className='text-red-500'>*</label> : '';
                let icon = meta[i]['icon'];
                if (!visible) continue;
                const value = record[name] || undefined;
                const marginBottom = 'mb-2';
                switch (type) {
                    case "file": {
                        upload.setUploaderID(name);
                        upload.setMetaData(meta[i]);
                        break;
                    }
                    case 'dynaFormNested': {
                        if (!sqlSelectResult[name]) {
                            const options = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            dynamicForm.setFormType('nested');
                            dynamicForm.setMeta(options);
                        }
                        break;
                    }
                    case 'dynaFormSimple': {
                        if (!sqlSelectResult[name]) {
                            const options = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            dynamicForm.setFormType('simple');
                            dynamicForm.setMeta(options);
                        }
                        break;
                    }
                    case 'jsonRadio':
                    case 'jsonCheck':
                    case 'jsonSelect':
                    case 'jsonMultiSelect': {
                        if (!sqlSelectResult[name]) {
                            const p = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            const a = Object.entries(p);
                            options = a?.map(v => ({ value: v[0], label: v[1] }));
                            setSqlSelectResult(r => ({ ...r, [name]: options }));
                        } else {
                            options = sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'csvRadio':
                    case 'csvCheck':
                    case 'csvSelect':
                    case 'csvMultiSelect': {
                        if (!sqlSelectResult[name]) {
                            options = meta[i]['options'] ? meta[i]['options'].split(',').map(v => ({ value: v, label: v })) : [];
                            setSqlSelectResult(r => ({ ...r, [name]: options }));
                        } else {
                            options = sqlSelectResult[name];
                        }
                        break;
                    }
                    case 'sqlRadio':
                    case 'sqlCheck':
                    case 'sqlSelect':
                    case 'sqlMultiSelect': {
                        const p = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                        let sql = p?.sql;
                        const key = p?.key;
                        const value = p?.value;
                        const image = p?.image;
                        const groupBy = p?.groupBy;
                        const tablemodel = p?.tablemodel;
                        const endpointResKey = p?.endpoint_result_key;
                        const requestTo = tablemodel ? tablemodel : 'get_extra_meta_options';

                        for (let placeholder in sqlPlaceHolders) {
                            sql = sql.replace(placeholder, sqlPlaceHolders[placeholder]);
                        }

                        if (sql) {
                            if (sqlSelectResult[name]) {//to prevent multiple request
                                options = sqlSelectResult[name];
                            } else {
                                if (!extraMetaList.includes(name)) {//for optimization
                                    setExtraMetaList(r => [...r, name]);
                                    const res = await utils.requestWithReauth('post', `${Settings.baseUrl}v1/${requestTo}`, null, { sql });
                                    if (groupBy) {
                                        const grouped = utils.groupBy(res.details, groupBy);
                                        let final = [];
                                        for (let group in grouped) {
                                            final.push({
                                                label: group,
                                                options: grouped[group]?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }))
                                            });
                                        }
                                        options = final;
                                        setSqlSelectResult(r => ({ ...r, [name]: options }));
                                    } else {
                                        if (res.details) {
                                            options = res?.details?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                                        } else {
                                            options = res[endpointResKey]?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                                        }
                                        setSqlSelectResult(r => ({ ...r, [name]: options }));
                                    }
                                }
                            }
                        }
                        break;
                    }
                    default: {
                        if (!sqlSelectResult[name]) {
                            const options = meta[i]['options'] ? JSON.parse(meta[i]['options']) : {};
                            setSqlSelectResult(r => ({ ...r, [name]: options }));
                        }
                    }
                }

                switch (type?.trim()) {
                    case 'time': {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <TimePicker key={`${name}_editable`} value={dayjs(value || '00:00:00', 'HH:mm:ss')} placeholder={`Enter ${realName}`}
                                        onChange={(dateObject, dateString) => {
                                            changeValue(dateString, key);
                                        }}
                                        {...sqlSelectResult[name]}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case 'dateTime': {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <DatePicker key={`${name}_editable`} value={dayjs(value || '0000-00-00 00:00:00', sqlSelectResult[name]?.format ? sqlSelectResult[name]?.format : 'YYYY-MM-DD HH:mm:ss')} placeholder={`Enter ${realName}`} showTime
                                        onChange={(dateObject, dateString) => {
                                            changeValue(dateString, key);
                                        }}
                                        {...sqlSelectResult[name]}
                                    />
                                </div>
                            </div>);
                        break;
                    } case 'dateRange': {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <RangePicker
                                        key={`${name}_editable`}
                                        value={value ? [
                                            value.split(',')[0] ? dayjs(value.split(',')[0]) : null,
                                            value.split(',')[1] ? dayjs(value.split(',')[1]) : null
                                        ] : null}
                                        placeholder={['Start Date', 'End Date']}
                                        onChange={(dates, dateStrings) => {
                                            // Handle null dates when clearing
                                            const dateValue = dates ? [dateStrings[0] ? dateStrings[0] : null, dateStrings[1] ? dateStrings[1] : null].join(',') : dateStrings ? dateStrings.join(',') : null;
                                            changeValue(dateValue, key);
                                        }}
                                        allowEmpty={[true, true]}
                                        {...sqlSelectResult[name]}
                                    />
                                </div>
                            </div>
                        );
                        break;
                    }
                    case 'customGenerateString': {
                        const cid = cryptoRandomString({ length: 10 });
                        if (!customIDIsSet) {
                            setRecord(record => ({ ...record, [key]: cid }));
                            setCustomIDIsSet(true);
                        }

                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="hidden">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input
                                        disabled
                                        className={`hidden`}
                                        key={`${name}_editable`} type='text' placeholder={`Enter ${realName}`} value={cid} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case 'number': {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input
                                        disabled={disabled}
                                        className={``}
                                        key={`${name}_editable`} type='number' placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                        break;
                    }

                    case 'password':
                    case 'cpassword': {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input.Password
                                        disabled={disabled}
                                        className={``}
                                        key={`${name}_editable`} type='password' size='small' placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case "text": {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input
                                        disabled={disabled}
                                        className={``}
                                        key={`${name}_editable`} type='text' size='small' placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case "email": {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input
                                        disabled={disabled}
                                        className={``}
                                        key={`${name}_editable`} type='email' size='small' placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case "jsonCheck":
                    case "csvCheck":
                    case "sqlCheck": {
                        html.push(
                            <div key={`${name}_select_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Checkbox.Group
                                        disabled={disabled}
                                        className=''
                                        key={`${name}_editable`}
                                        options={sqlSelectResult[name]}
                                        onChange={v => changeValue(v, key)}
                                        value={value ? value?.toString()?.split(',') : []}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case "jsonRadio":
                    case "csvRadio":
                    case "sqlRadio": {
                        html.push(
                            <div key={`${name}_select_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Radio.Group
                                        disabled={disabled}
                                        className=''
                                        key={`${name}_editable`}
                                        options={sqlSelectResult[name]}
                                        onChange={v => changeValue(v?.target?.value, key)}
                                        value={value}
                                        {...sqlSelectResult[name]}//contains extra props from the db or anywhere such as style ...
                                    />
                                </div>
                            </div>)
                        break;
                    }
                    case "sqlSelect":
                    case "jsonSelect":
                    case "csvSelect": {
                        html.push(
                            <div key={`${name}_select_wrapper`} className={`input-groupx input-group-smx flexx ${marginBottom}`}>
                                <span className="input-group-textx">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Select
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        placeholder={`Select ${realName}`}
                                        className='w-full flex-grow-1x'
                                        onChange={v => changeValue(v, key)}
                                        value={value}
                                        options={sqlSelectResult[name]}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                            </div>)
                        break;
                    }
                    case "sqlMultiSelect":
                    case "jsonMultiSelect":
                    case "csvMultiSelect": {
                        html.push(
                            <div key={`${name}_select_wrapper`} className={`input-groupx input-group-smx flex ${marginBottom}`}>
                                <span className="input-group-textx">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Select
                                        disabled={disabled}
                                        key={`${name}_editable`}
                                        mode="multiple"
                                        allowClear
                                        placeholder={`Select ${realName}`}
                                        className='bd-highlight flex-grow-1x w-full'
                                        onChange={v => changeValue(v, key)}
                                        value={value ? value?.toString()?.split(',') : []}
                                        options={sqlSelectResult[name]}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case 'textEditor': {
                        html.push(
                            <div key={`${name}_editable`} className={`${marginBottom}`}>
                                <label className={`font-bold ${marginBottom}`}>Enter {realName}{showValidatorIndicator}</label>
                                {editor.editor()}
                            </div>
                        );
                        break;
                    }
                    case "file": {
                        html.push(
                            <div key={`${name}_editable`}>
                                <label className={`font-bold ${marginBottom}`}>Upload {realName}{showValidatorIndicator}</label>
                                {upload.uploader('files', `${Settings.baseUrl}/file_uploads`, `${name}_editable`, `${name}_editable`)}
                            </div>
                        );
                        break;
                    }
                    case "textArea": {
                        html.push(
                            <div key={`${name}_textarea_wrapper`} className={`${marginBottom} w-full`}>
                                <span className="">{realName}{showValidatorIndicator}</span>
                                <Input.TextArea disabled={disabled} key={`${name}_editable`} className="w-full" placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)} autoSize />
                            </div>
                        );
                        break;
                    }
                    case "otp": {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input.OTP
                                        disabled={disabled}
                                        level
                                        className={``}
                                        key={`${name}_editable`} type={type} placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                        {...sqlSelectResult[name]}
                                    />
                                </div>
                            </div>);
                        break;
                    }
                    case "dynaFormSimple": {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                {dynamicForm.dynaFormSimple(dynamicForm.htmlMarkupModel)}
                            </div>
                        );
                        break;
                    }
                    case "dynaFormNested": {
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                {dynamicForm.dynaformNested(dynamicForm.htmlMarkupModel, dynamicForm.childrenHtmlMarkupModel)}
                            </div>
                        );
                        break;
                    }
                    default:
                        html.push(
                            <div key={`${name}_input_wrapper`} className={`${marginBottom}`}>
                                <span className="">{realName}{showValidatorIndicator}:</span>
                                <div className='mt-1'>
                                    <Input
                                        disabled={disabled}
                                        className={``}
                                        key={`${name}_editable`} type={type} placeholder={`Enter ${realName}`} value={value} onChange={e => changeValue(e.target.value, key)}
                                    />
                                </div>
                            </div>);
                }
            }
            setForm(html);
            // Update the validatorMap state once, after the loop finishes            
            setValidatorMap(tempValidatorMap);
        } catch (err) {
            console.log(err.message, err.stack);
        }
    }

    function changeValue(value, key) {
        if (Array.isArray(value)) {
            value = value.join(',');
        }
        setWhichElementChanged(key);
        setRecord(record => ({ ...record, [key]: value }));
        setTarget(value, key);
    }


    async function setTarget(v, key) {
        const tblMeta = valuesStore.getValuesBy(tblMetaDataName, whereKeyName, tblName);
        let elem = {};
        for (let i = 0; i < tblMeta.length; i++) {
            if (tblMeta[i]?.column_name == key) {
                elem = tblMeta[i];
                break;
            }
        }
        let options = elem.extra_options;
        if (!options) return;
        const j = JSON.parse(options);
        const targets = j?.targets;
        targets.forEach(async p => {
            let sql = p?.sql;
            const key = p?.key;
            const value = p?.value;
            const image = p?.image;
            const target = p?.target;
            const groupBy = p?.groupBy;
            if (sql) {
                sql = sql.replace('this.value', v);
                const res = await utils.requestWithReauth('post', `${Settings.baseUrl}/get_extra_meta_options`, null, { sql });
                if (groupBy) {
                    const grouped = utils.groupBy(res.details, groupBy);
                    let final = [];
                    for (let group in grouped) {
                        final.push({
                            label: group,
                            options: grouped[group]?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }))
                        });
                    }
                    setSqlSelectResult(r => ({ ...r, [target]: final }));
                } else {
                    options = res.details.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                    setSqlSelectResult(r => ({ ...r, [target]: options }));
                }
                // const opt = res.details.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                // setSqlSelectResult(r => ({ ...r, [target]: opt }));
            }
        });
    }


    function addModal(title, handleOk, okText = 'Save', okButtonProps = { style: { background: Settings.secondaryColorHex, border: 'none' } }, width, shouldDrag = true) {
        title = shouldDrag ? <div {...draggable.draggableTitleProps}>{title}</div> : title;
        return <>
            <Modal
                modalRender={(modal) => {
                    return shouldDrag ? draggable.drag(modal) : modal
                }}
                confirmLoading={loading}
                zIndex={9999} title={title} width={width} open={showModal} onOk={handleOk} onCancel={e => setShowModal(false)} okText={okText} okButtonProps={okButtonProps}>

                <div className="grid grid-cols-1 gap-2">
                    <div>
                        {childrenTop}
                    </div>
                    <div>
                        {form}
                    </div>
                    <div>
                        {childrenBottom}
                    </div>
                </div>

            </Modal>
            {upload.preview()}
        </>
    }

    return {
        fields, setFields, whichElementChanged, setWhichElementChanged,
        setSqlPlaceHolders, setRecord, reset,
        addModal, saveCompleted, setSaveCompleted,
        setTblName, tblName, setShowModal, setTblMetaDataName,
        setWhrKeyName, save, saveWithFiles,
        upload, record, editor,
        childrenBottom, setChildrenBottom,
        childrenTop, setChildrenTop, form, addForm, loading, setLoading,
        sqlSelectResult, setSqlSelectResult, extraMetaList, setExtraMetaList,
        resetCompletely, setValidatorMap, validatorMap, validate, dynamicForm, validateShowErrorMessage, recallFiles, recallSingleFile
    };

}
export default useAdd;