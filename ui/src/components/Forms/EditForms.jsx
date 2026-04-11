
import { Empty } from 'antd'
import dayjs from 'dayjs';


const EditForms = ({ disabled, value, type, html, marginBottom, realName, showValidatorIndicator, recordKey, sqlSelectResult, changeValue }) => {

    if (!type) return <Empty description="No form type specified" />;

    function renderForm(type) {
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
                        <label className={`font-bold ${marginBottom}`}>
                            Enter {realName}{showValidatorIndicator}
                        </label>
                        {editor.editor(value)}
                    </div>
                );
                break;

            case 'file':
                html.push(
                    <div key={`${name}_editable`}>
                        <label className={`font-bold ${marginBottom}`}>
                            Upload {realName}{showValidatorIndicator}
                        </label>
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

    return (
        <div>
            {renderForm()}
        </div>
    )
}

export default EditForms