import { MinusCircleOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, Modal, Select, Image, Radio, Checkbox, Card } from 'antd';
import { useState, useMemo, useRef } from 'react';
import useDraggable from './useDraggable';
import Settings from "../utils/Settings"
import utils from '../utils/function_utils';

const useDynamicForm = (formName, itemToCreate, submitBtnDetails, onFinish, showFormAddBtn = true, type = 'default') => {
    const draggable = useDraggable();
    const [formJSX, setFormJSX] = useState();
    const [childrenBottom, setChildrenBottom] = useState(undefined);
    const [childrenTop, setChildrenTop] = useState(undefined);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState(formName);
    const [formFieldsToCreate, setFormFieldsToCreate] = useState(itemToCreate);
    const [addBtnDetails, setAddBtnDetails] = useState(submitBtnDetails);
    const [modalTitle, setModalTitle] = useState();
    const [data, setData] = useState();
    const [formChildren, setFormChildren] = useState();
    const formRef = useRef({}); // Create a ref to hold the form instance
    const [form] = Form.useForm();
    formRef.current['default'] = form;
    const [dynamicFormSimple] = Form.useForm();
    formRef.current['simple'] = dynamicFormSimple;
    const [dynamicFormNested] = Form.useForm();
    formRef.current['nested'] = dynamicFormNested;
    const [formSubmit, setFormSubmit] = useState(undefined);
    const [formAddBtn, setFormAddBtn] = useState(showFormAddBtn);
    const [width, setWidth] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [currentChangedValue, setCurrentChangedValue] = useState();
    const [allValues, setAllValues] = useState();
    const [addFieldPosition, setAddFieldPosition] = useState('both');//top,buttom,both
    const [meta, setMeta] = useState();
    const [formType, setFormType] = useState('default');
    const [sqlPlaceHolders, setSqlPlaceHolders] = useState({});
    const [extraMetaList, setExtraMetaList] = useState([]);
    const [sqlSelectResult, setSqlSelectResult] = useState({});
    const [htmlMarkupModel, setHtmlMarkupModel] = useState([]);
    const [childrenHtmlMarkupModel, setChildrenHtmlMarkupModel] = useState([]);
    useMemo(() => {
        load();
        console.log('looping')
    }, [formChildren, formSubmit, data, form, formFieldsToCreate, childrenTop, childrenBottom, meta, htmlMarkupModel, childrenHtmlMarkupModel]);

    async function load() {
        switch (formType || type) {
            case "simple": {
                const r = await parseDynaForm(meta);
                if (htmlMarkupModel?.length <= 0) {
                    setHtmlMarkupModel(r);
                }
                break;
            }
            case "nested": {
                const parent = await parseDynaForm(meta?.['parent']);
                const children = await parseDynaForm(meta?.['children']);
                if (htmlMarkupModel?.length <= 0) {
                    setHtmlMarkupModel(parent);
                }
                if (childrenHtmlMarkupModel?.length <= 0) {
                    setChildrenHtmlMarkupModel(children);
                }
            }
                break;
            default:
                dynForm();
        }
    }

    function selectOptionLabelRender(image, key, value, row) {
        const vl = value?.split(',').map(val => row[val]).join(' - ');
        return image ?
            <div key={`${row[key]}_select_options_dyna`} className={`d-flex`}>
                <Image
                    className=''
                    width={18}
                    src={`${Settings.baseUrl}/${row[image]}`}
                />
                <span className="flex-grow-1">{vl}</span>
            </div> : vl;
    }


    async function parseDynaForm(meta) {
        let htmlModel = [];
        for (let component in meta) {
            const type = meta[component]?.type;
            const markup = meta[component]?.markup;
            const validationType = meta[component]?.validationType;
            switch (type) {
                case 'text':
                case 'number':
                case 'textArea': {
                    htmlModel.push({ name: component, type, validationType, ...markup });
                    break;
                }
                case 'jsonRadio':
                case 'jsonCheck':
                case 'jsonSelect':
                case 'jsonMultiSelect': {
                    let options = undefined;
                    if (!sqlSelectResult[component]) {
                        const p = meta[component]?.options;
                        const a = Object.entries(p);
                        options = a?.map(v => ({ value: v[0], label: v[1] }));
                        setSqlSelectResult(r => ({ ...r, [component]: options }));
                    } else {
                        options = sqlSelectResult[component];
                    }
                    htmlModel.push({ name: component, type, validationType, ...markup, options });
                    break;
                }
                case 'csvRadio':
                case 'csvCheck':
                case 'csvSelect':
                case 'csvMultiSelect': {
                    let options = undefined;
                    if (!sqlSelectResult[component]) {
                        options = meta[component]?.options ? meta[component]?.options?.split(',').map(v => ({ value: v, label: v })) : [];
                        setSqlSelectResult(r => ({ ...r, [component]: options }));
                    } else {
                        options = sqlSelectResult[component];
                    }
                    htmlModel.push({ name: component, type, validationType, ...markup, options });
                    break;
                }
                case 'sqlRadio':
                case 'sqlCheck':
                case 'sqlSelect':
                case 'sqlMultiSelect': {
                    const p = meta[component]?.options;
                    let sql = p?.sql;
                    const key = p?.key;
                    const value = p?.value;
                    const image = p?.image;
                    const groupBy = p?.groupBy;
                    const endpoint = p?.endpoint;
                    const endpointResKey = p?.endpoint_result_key;
                    const requestTo = endpoint ? endpoint : 'get_extra_meta_options';
                    let options = undefined;
                    for (let placeholder in sqlPlaceHolders) {
                        sql = sql.replace(placeholder, sqlPlaceHolders[placeholder]);
                    }

                    if (sql) {

                        if (sqlSelectResult[component]) {//to prevent multiple request
                            options = sqlSelectResult[component];
                        } else {

                            if (!extraMetaList.includes(component)) {//for optimization
                                setExtraMetaList(r => [...r, component]);
                                const res = await utils.requestWithReauth('post', `${Settings.baseUrl}/${requestTo}`, null, { sql });
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
                                    setSqlSelectResult(r => ({ ...r, [component]: options }));
                                } else {
                                    if (res.details) {
                                        options = res?.details?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                                    } else {
                                        options = res[endpointResKey]?.map(v => ({ value: v[key], label: selectOptionLabelRender(image, key, value, v) }));
                                    }
                                    setSqlSelectResult(r => ({ ...r, [component]: options }));
                                }
                            }
                        }
                    }
                    htmlModel.push({ name: component, type, validationType, ...markup, options });
                    break;
                }
                default:
                    htmlModel.push({ name: component, type, validationType, ...markup });
            }
        }

        return htmlModel;
    }

    function dynaFormSimple(model) {
        const theForm = <Form
            key={'dynamic_form_simple'}
            // form={dynamicFormSimple}
            form={formRef?.current?.dynamicFormSimple}
            name="dynamic_form_simple"
            onFinish={values => {
                formSubmit && formSubmit.onFormSubmit(values);//get value via state of this hook that expects the onFormSubmit function
                setData(values);
                onFinish && onFinish(values);//external callback
            }}
            onValuesChange={(changedValues, allValues) => {
                setCurrentChangedValue(changedValues);
                setAllValues(allValues);
            }}
            style={{
                maxWidth: 600,
            }}
            autoComplete="off"
        >
            {formChildren}
            <Form.List name={name}>
                {(fields, { add, remove }, { errors }) => {
                    return <>
                        {(formAddBtn && (addFieldPosition == 'top' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                        {fields.map(({ key, name, ...restField }) => {
                            return <Space
                                key={key}
                                style={{
                                    display: 'flex',
                                    marginBottom: 8,
                                }}
                                align="baseline"
                            // wrap
                            >
                                {model?.map((v, i) => {
                                    return formRenderer(v, i, name, restField);
                                })}
                                <MinusCircleOutlined onClick={() => remove(name)} />
                            </Space>
                        })}

                        {(formAddBtn && (addFieldPosition == 'bottom' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                    </>
                }}
            </Form.List>

            <Form.Item>
                {addBtnDetails && <Button style={addBtnDetails?.style} className={addBtnDetails?.classes} type={addBtnDetails?.type} htmlType='submit'>
                    {addBtnDetails?.text}
                </Button>}
            </Form.Item>
        </Form>
        setFormJSX(theForm);
        return theForm;
    }

    function formRenderer(v, i, name, restField) {
        switch (v?.type) {
            case 'number':
            case 'text': {
                return <Form.Item
                    key={`dyna_elem_${i}`}
                    {...restField}
                    label={v.name}
                    name={[name, v?.name]}
                    rules={[
                        {
                            required: v?.isRequired,
                            message: v?.errorMsg,
                            type: v.validationType || 'string'
                        },
                    ]}
                >
                    <Input {...v?.inputParams} />
                </Form.Item>
            }
            case "textArea": {
                return <Form.Item
                    key={`dyna_elem_${i}`}
                    {...restField}
                    label={v.name}
                    name={[name, v?.name]}
                    rules={[
                        {
                            required: v?.isRequired,
                            message: v?.errorMsg,
                            type: v.validationType || 'string'
                        },
                    ]}
                >
                    <Input.TextArea {...v?.inputParams} />
                </Form.Item>

            }
            case "jsonCheck":
            case "csvCheck":
            case "sqlCheck": {
                return <Form.Item
                    key={`dyna_elem_${i}`}
                    {...restField}
                    label={v.name}
                    name={[name, v?.name]}
                    rules={[
                        {
                            required: v?.isRequired,
                            message: v?.errorMsg,
                            type: v.validationType || 'string'
                        },
                    ]}
                >
                    <Checkbox.Group options={v?.options} {...v?.inputParams} />
                </Form.Item>

            }
            case "jsonRadio":
            case "csvRadio":
            case "sqlRadio": {
                return <Form.Item
                    key={`dyna_elem_${i}`}
                    {...restField}
                    label={v.name}
                    name={[name, v?.name]}
                    rules={[
                        {
                            required: v?.isRequired,
                            message: v?.errorMsg,
                            type: v.validationType || 'string'
                        },
                    ]}
                >
                    <Radio.Group options={v?.options} {...v?.inputParams} />
                </Form.Item>
                break;
            }
            case "sqlSelect":
            case "jsonSelect":
            case "csvSelect": {
                return <Form.Item
                    key={`dyna_elem_${i}`}
                    {...restField}
                    label={v.name}
                    name={[name, v?.name]}
                    rules={[
                        {
                            required: v?.isRequired,
                            message: v?.errorMsg,
                            type: v.validationType || 'string'
                        },
                    ]}
                >
                    <Select
                        options={v?.options}
                        showSearch
                        allowClear
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        {...v?.inputParams}
                    />
                </Form.Item>

            }
        }
    }

    function dynaformNested(parentModel, childrenModel) {
        const theForm = <Form
            key={'dynamic_form_nested'}
            // form={dynamicFormNested}
            form={formRef?.current?.dynamicFormNested}
            name="dynamic_form_nested"
            onFinish={values => {
                formSubmit && formSubmit.onFormSubmit(values);//get value via state of this hook that expects the onFormSubmit function
                setData(values);
                onFinish && onFinish(values);//external callback
            }}
            onValuesChange={(changedValues, allValues) => {
                setCurrentChangedValue(changedValues);
                setAllValues(allValues);
            }}
            style={{
                maxWidth: 600,
            }}
            autoComplete="off"
        >
            {/* {console.log(model)} */}
            {formChildren}
            <Form.List name={name}>
                {(fields, { add, remove }, { errors }) => {
                    return <>
                        {(formAddBtn && (addFieldPosition == 'top' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                        {fields.map(({ key, name, ...restField }) => {
                            return <Card
                                size="small"
                                title={`Item ${name + 1}`}
                                key={key}
                                extra={
                                    <CloseOutlined
                                        onClick={() => {
                                            remove(name);
                                        }}
                                    />
                                }
                            >
                                {
                                    parentModel?.map((v, i) => {
                                        return formRenderer(v, i, name, restField);
                                    })
                                }

                                {/* NESTING HERE */}
                                <Form.Item label="">
                                    <Form.List name={[name, 'list']}>
                                        {(subFields, subOpt) => (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    rowGap: 16,
                                                }}
                                            >
                                                {
                                                    subFields.map((subField) => {
                                                        {
                                                            return <Space key={`${subField.key}_subfields`}>
                                                                {
                                                                    childrenModel?.map((v, i) => {
                                                                        return formRenderer(v, i, subField.name, {});
                                                                    })
                                                                }
                                                                <MinusCircleOutlined onClick={() => { subOpt.remove(subField.name) }} />
                                                            </Space>
                                                        }
                                                    })
                                                }
                                                <Button type="dashed" onClick={() => subOpt.add()} block>
                                                    + Add Sub Item
                                                </Button>
                                            </div>
                                        )}
                                    </Form.List>
                                </Form.Item>
                            </Card>
                        })}

                        {(formAddBtn && (addFieldPosition == 'bottom' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                    </>
                }}
            </Form.List>

            <Form.Item>
                {addBtnDetails && <Button style={addBtnDetails?.style} className={addBtnDetails?.classes} type={addBtnDetails?.type} htmlType='submit'>
                    {addBtnDetails?.text}
                </Button>}
            </Form.Item>
        </Form>
        setFormJSX(theForm);
        return theForm;
    }

    function dynForm() {
        const theForm = <Form
            // form={form}
            form={formRef?.current?.default}
            name="dynamic_form_nest_item"
            onFinish={values => {
                formSubmit && formSubmit.onFormSubmit(values);//get value via state of this hook that expects the onFormSubmit function
                setData(values);
                onFinish && onFinish(values);//external callback
            }}
            onValuesChange={(changedValues, allValues) => {
                setCurrentChangedValue(changedValues);
                setAllValues(allValues);
            }}
            style={{
                maxWidth: 600,
            }}
            autoComplete="off"
        >
            {formChildren}

            <Form.List name={name}>
                {(fields, { add, remove }) => {
                    return <>
                        {(formAddBtn && (addFieldPosition == 'top' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                        {fields.map(({ key, name, ...restField }) => (
                            <Space
                                key={key}
                                style={{
                                    display: 'flex',
                                    marginBottom: 8,
                                }}
                                align="baseline"
                            // wrap
                            >
                                {formFieldsToCreate?.map((v, i) => {
                                    return <Form.Item
                                        key={i}
                                        {...restField}
                                        label={v.name}
                                        name={[name, v.name]}
                                        rules={[
                                            {
                                                required: v.isRequired,
                                                message: v.errorMsg,
                                                type: v.type || 'string'
                                            },
                                        ]}
                                    >
                                        {['text', 'number'].includes(v.inputType) ? <Input style={{ width: v.width }} placeholder={v.placeholder} type={v.inputType} /> :
                                            ['select'].includes(v.inputType) ? <Select style={{ width: v.width }} placeholder={v.placeholder}
                                                options={v.options}
                                            /> : ['largeText'].includes(v.inputType) && <Input.TextArea style={{ width: v.width }} placeholder={v.placeholder} autoSize />}
                                    </Form.Item>
                                })}

                                <MinusCircleOutlined onClick={() => remove(name)} />
                            </Space>
                        ))}

                        {(formAddBtn && (addFieldPosition == 'bottom' || addFieldPosition == 'both')) && <Form.Item>
                            <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}> {'Add Field'}</Button>
                        </Form.Item>}
                    </>
                }}
            </Form.List>


            <Form.Item>
                {addBtnDetails && <Button style={addBtnDetails?.style} className={addBtnDetails?.classes} type={addBtnDetails?.type} htmlType='submit'>
                    {addBtnDetails?.text}
                </Button>}
            </Form.Item>
        </Form>
        setFormJSX(theForm);
    }

    function formModal(title, handleOk, okText = 'Save', okButtonProps = { style: { background: Settings.secondaryColorHex, border: 'none' } }, localWidth, shouldDrag = true, footer = null) {
        if (!title) title = modalTitle;
        title = shouldDrag ? <div {...draggable.draggableTitleProps}>{title}</div> : title;
        return <>
            <Modal
                modalRender={(modal) => {
                    return shouldDrag ? draggable.drag(modal) : modal
                }}
                confirmLoading={loading}
                // loading={loading}
                zIndex={1002} title={title} width={localWidth || width} open={showModal} onOk={handleOk} onCancel={e => setShowModal(false)} okText={okText} okButtonProps={okButtonProps} footer={footer}>

                <div className='row'>
                    <Space className='col-12' direction='vertical'>
                        <div className='col-12 '>
                            {childrenTop}
                        </div>
                        <div className='col-12'>
                            {formJSX}
                        </div>
                        <div className='col-12'>
                            {childrenBottom}
                        </div>
                    </Space>
                </div>
            </Modal>
        </>
    }

    return {
        formJSX, setFormJSX, formModal,
        formRef, form: formRef?.current?.default,
        dynamicFormNested: formRef?.current?.dynamicFormNested,
        dynamicFormSimple: formRef?.current?.dynamicFormSimple,
        childrenBottom, setChildrenBottom,
        childrenTop, setChildrenTop,
        showModal, setShowModal,
        name, setName, addBtnDetails, setAddBtnDetails,
        formFieldsToCreate, setFormFieldsToCreate,
        data, setData, setFormChildren, formChildren,
        modalTitle, setModalTitle, formSubmit, setFormSubmit,
        setWidth, width, formAddBtn, setFormAddBtn, loading, setLoading,
        currentChangedValue, setCurrentChangedValue, allValues, setAllValues,
        meta, setMeta, formType, setFormType, sqlPlaceHolders, setSqlPlaceHolders,
        extraMetaList, setExtraMetaList, sqlSelectResult, setSqlSelectResult,
        htmlMarkupModel, setHtmlMarkupModel, dynaFormSimple, childrenHtmlMarkupModel,
        setChildrenHtmlMarkupModel, dynaformNested,
        addFieldPosition, setAddFieldPosition
    };
}
export default useDynamicForm;