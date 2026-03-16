import { FC, JSX, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useProviderContext } from '@syncfusion/react-base';
import { TextBox, FormField, TextArea, ResizeMode, ValidationRules, Form, TextBoxChangeEvent, TextAreaChangeEvent, FormInitialValues, FormValueType } from '@syncfusion/react-inputs';
import { Checkbox, CheckboxChangeEvent } from '@syncfusion/react-buttons';
import { DatePicker, DatePickerChangeEvent, TimePicker, TimePickerChangeEvent } from '@syncfusion/react-calendars';
import { SchedulerEditorField } from '../../types/scheduler-types';
import { useSchedulerLocalization } from '../../common/locale';
import { useSchedulerPropsContext } from '../../context/scheduler-context';
import { CSS_CLASSES } from '../../common/constants';
import { useEditorContext } from '../../context/scheduler-editor-popup-context';
import { DropDownList } from '@syncfusion/react-dropdowns';

/**
 * EditorPopupFields renders the form fields for the scheduler popup.
 * @param fields Optional custom field configuration.
 */
interface EditorPopupFieldsProps {
    fields?: SchedulerEditorField[];
}

const DEFAULT_FIELD_CONFIG: SchedulerEditorField[] = [
    { name: 'subject', visible: true, className: CSS_CLASSES.SUBJECT_CONTAINER },
    { name: 'location', visible: true, className: CSS_CLASSES.LOCATION_CONTAINER },
    { name: 'startDate', visible: true, className: CSS_CLASSES.START_DATE_CONTAINER },
    { name: 'startTime', visible: true, className: CSS_CLASSES.START_TIME_CONTAINER },
    { name: 'endDate', visible: true, className: CSS_CLASSES.END_DATE_CONTAINER },
    { name: 'endTime', visible: true, className: CSS_CLASSES.END_TIME_CONTAINER },
    { name: 'isAllDay', visible: true, className: CSS_CLASSES.ALL_DAY_CONTAINER },
    { name: 'description', visible: true, className: CSS_CLASSES.DESCRIPTION_CONTAINER },
    { name: 'repeatMode', visible: true, className: CSS_CLASSES.REPEAT_MODE}
];

const DEFAULT_ROW_GROUPS: string[][] = [
    ['subject', 'location'],
    ['startDate', 'startTime'],
    ['endDate', 'endTime'],
    ['isAllDay'],
    ['repeatMode'],
    ['description']
];

export const EditorPopupFields: FC<EditorPopupFieldsProps> = ({ fields }: EditorPopupFieldsProps) => {
    const { locale } = useProviderContext();
    const { getString } = useSchedulerLocalization(locale || 'en-US');
    const { dateFormat, timeFormat, timeScale } = useSchedulerPropsContext();

    const {
        data,
        startDateOnly,
        startTimeOnly,
        endDateOnly,
        endTimeOnly,
        slotDuration,
        repeatData,
        repeatModeValue,
        formState,
        formRef,
        setFormState,
        handleSubjectChange,
        handleLocationChange,
        handleDescriptionChange,
        handleStartDateChange,
        handleStartTimeChange,
        handleEndDateChange,
        handleEndTimeChange,
        handleIsAllDayChange,
        handleRepeatModeChange,
        setSlotDuration,
        action
    } = useEditorContext();

    const validationRules: ValidationRules = useMemo(() => {
        if (!fields) { return {}; }
        return fields.reduce((acc: ValidationRules, field: SchedulerEditorField) => {
            if (field.validationRule) {
                acc[field.name] = field.validationRule;
            }
            return acc;
        }, {} as ValidationRules);
    }, [fields]);

    const initialFormValues: FormInitialValues = useMemo(() => {
        const values: Record<string, FormValueType> = {};

        if (data?.subject) { values.subject = data.subject; }
        if (data?.location) { values.location = data.location; }
        if (data?.description) { values.description = data.description; }
        if (startDateOnly) { values.startDate = startDateOnly; }
        if (startTimeOnly) { values.startTime = startTimeOnly; }
        if (endDateOnly) { values.endDate = endDateOnly; }
        if (endTimeOnly) { values.endTime = endTimeOnly; }
        if (data?.isAllDay !== undefined) { values.isAllDay = data.isAllDay; }

        return values;
    }, [data, startDateOnly, startTimeOnly, endDateOnly, endTimeOnly]);

    const computedSlotDuration: number = useMemo(() => {
        return timeScale?.interval / timeScale?.slotCount || 30;
    }, [timeScale]);

    useEffect(() => {
        setSlotDuration?.(computedSlotDuration);
    }, [computedSlotDuration]);

    const getSubjectField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="subject">
                    <TextBox
                        placeholder={extraProps.placeholder ?? getString('title')}
                        value={extraProps.value ?? (formState?.values.subject as string || data?.subject)}
                        onChange={(args: TextBoxChangeEvent) => {
                            formState?.onChange('subject', { value: args.value || '' });
                            (extraProps.onChange ?? handleSubjectChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('subject')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_SUBJECT} ${formState?.errors.subject ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        {...extraProps}
                    />
                    {formState?.errors?.subject && <div className="sf-form-error">{formState.errors.subject}</div>}
                </FormField>
            );
        }, [formState, data?.subject, handleSubjectChange]);

    const getLocationField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="location">
                    <TextBox
                        placeholder={extraProps.placeholder ?? getString('location')}
                        value={extraProps.value ?? (formState?.values.location as string || data?.location)}
                        onChange={(args: TextBoxChangeEvent) => {
                            formState?.onChange('location', { value: args.value || '' });
                            (extraProps.onChange ?? handleLocationChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('location')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_LOCATION} ${formState?.errors.location ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        {...extraProps}
                    />
                    {formState?.errors?.location && <div className="sf-form-error">{formState.errors.location}</div>}
                </FormField>
            );
        }, [formState, data?.location, handleLocationChange]);

    const getStartDateField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="startDate">
                    <DatePicker
                        placeholder={extraProps.placeholder ?? getString('startDate')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_START_DATE} ${formState?.errors.startDate ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        value={extraProps.value || (formState?.values.startDate as Date || startDateOnly)}
                        format={extraProps.format ?? dateFormat}
                        onChange={(args: DatePickerChangeEvent) => {
                            formState?.onChange('startDate', { value: args.value });
                            (extraProps.onChange ?? handleStartDateChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('startDate')}
                        strictMode={extraProps.strictMode ?? true}
                        {...extraProps}
                    />
                    {formState?.errors?.startDate && <div className="sf-form-error">{formState.errors.startDate}</div>}
                </FormField>
            );
        }, [formState, startDateOnly, handleStartDateChange]);

    const getStartTimeField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="startTime">
                    <TimePicker
                        placeholder={extraProps.placeholder ?? getString('startTime')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_START_TIME} ${formState?.errors.startTime ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        step={extraProps.step ?? slotDuration}
                        value={extraProps.value ?? (formState?.values.startTime as Date || startTimeOnly)}
                        format={extraProps.format ?? timeFormat}
                        onChange={(args: TimePickerChangeEvent) => {
                            formState?.onChange('startTime', { value: args.value });
                            (extraProps.onChange ?? handleStartTimeChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('startTime')}
                        strictMode={extraProps.strictMode ?? true}
                        {...extraProps}
                    />
                    {formState?.errors?.startTime && <div className="sf-form-error">{formState.errors.startTime}</div>}
                </FormField>
            );
        }, [formState, startTimeOnly, handleStartTimeChange]);

    const getEndDateField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="endDate">
                    <DatePicker
                        placeholder={extraProps.placeholder ?? getString('endDate')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_END_DATE} ${formState?.errors.endDate ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        value={extraProps.value ?? (formState?.values.endDate as Date || endDateOnly)}
                        format={extraProps.format ?? dateFormat}
                        onChange={(args: DatePickerChangeEvent) => {
                            formState?.onChange('endDate', { value: args.value });
                            (extraProps.onChange ?? handleEndDateChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('endDate')}
                        strictMode={extraProps.strictMode ?? true}
                        {...extraProps}
                    />
                    {formState?.errors?.endDate && <div className="sf-form-error">{formState.errors.endDate}</div>}
                </FormField>
            );
        }, [formState, endDateOnly, handleEndDateChange]);

    const getEndTimeField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="endTime">
                    <TimePicker
                        placeholder={extraProps.placeholder ?? getString('endTime')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_END_TIME} ${formState?.errors.endTime ? 'sf-error' : ''}`}
                        labelMode={extraProps.labelMode ?? 'Always'}
                        step={extraProps.step ?? slotDuration}
                        value={extraProps.value ?? (formState?.values.endTime as Date || endTimeOnly)}
                        format={extraProps.format ?? timeFormat}
                        onChange={(args: TimePickerChangeEvent) => {
                            formState?.onChange('endTime', { value: args.value });
                            (extraProps.onChange ?? handleEndTimeChange)?.(args);
                        }}
                        onBlur={() => formState?.onBlur('endTime')}
                        strictMode={extraProps.strictMode ?? true}
                        {...extraProps}
                    />
                    {formState?.errors?.endTime && <div className="sf-form-error">{formState.errors.endTime}</div>}
                </FormField>
            );
        }, [formState, endTimeOnly, handleEndTimeChange]);

    const getAllDayField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <FormField name="isAllDay">
                    <Checkbox
                        label={extraProps.label ?? getString('allDay')}
                        className={`${extraProps.className ?? CSS_CLASSES.EVENT_ALLDAY} ${formState?.errors.isAllDay ? 'sf-error' : ''}`}
                        checked={extraProps.checked ?? (formState?.values.isAllDay as boolean ?? data?.isAllDay)}
                        onChange={(args: CheckboxChangeEvent) => {
                            formState?.onChange('isAllDay', { value: args.value });
                            (extraProps.onChange ?? handleIsAllDayChange)?.(args);
                        }}
                        {...extraProps}
                    />
                    {formState?.modified?.isAllDay && formState?.errors?.isAllDay && <div className="sf-form-error">{formState.errors.isAllDay}</div>}
                </FormField>
            );
        }, [formState, data?.isAllDay, handleIsAllDayChange]);

    const getRepeatModeField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element = useCallback((
        overrides: Partial<SchedulerEditorField> = {}) => {
        const extraProps: Record<string, any> = overrides.props ?? {};
        return (
            <FormField name='repeatMode'>
                <DropDownList
                    dataSource={repeatData}
                    fields={{ text: 'text', value: 'value' }}
                    value={extraProps.value ?? repeatModeValue}
                    placeholder={extraProps.placeholder ?? getString('repeat')}
                    labelMode='Always'
                    onChange={extraProps.onChange ?? handleRepeatModeChange}
                    {...extraProps}
                />
            </FormField>
        );
    }, [formState, repeatModeValue, handleRepeatModeChange]);

    const getDescriptionField: (overrides?: Partial<SchedulerEditorField>) => JSX.Element =
        useCallback((overrides: Partial<SchedulerEditorField> = {}) => {
            const extraProps: Record<string, any> = overrides.props ?? {};
            return (
                <div className={CSS_CLASSES.DESCRIPTION_ROW}>
                    <FormField name="description">
                        <TextArea
                            placeholder={extraProps.placeholder ?? getString('description')}
                            className={`${extraProps.className ?? CSS_CLASSES.EVENT_DESCRIPTION} ${formState?.errors.description ? 'sf-error' : ''}`}
                            labelMode={extraProps.labelMode ?? 'Always'}
                            value={extraProps.description ?? (formState?.values.description as string || data?.description)}
                            width={extraProps.width ?? '100%'}
                            resizeMode={extraProps.resizeMode ?? ResizeMode.Vertical}
                            onChange={(args: TextAreaChangeEvent) => {
                                formState?.onChange('description', { value: args.value || '' });
                                (extraProps.onChange ?? handleDescriptionChange)?.(args);
                            }}
                            onBlur={() => formState?.onBlur('description')}
                            {...extraProps}
                        />
                        {formState?.errors?.description && <div className="sf-form-error">{formState.errors.description}</div>}
                    </FormField>
                </div>
            );
        }, [formState, data?.description, handleDescriptionChange]);

    const fieldComponents: Record<string, (o: Partial<SchedulerEditorField>) => ReactNode> = useMemo(() => ({
        subject: getSubjectField,
        location: getLocationField,
        startDate: getStartDateField,
        startTime: getStartTimeField,
        endDate: getEndDateField,
        endTime: getEndTimeField,
        isAllDay: getAllDayField,
        repeatMode: getRepeatModeField,
        description: getDescriptionField
    }), [getSubjectField, getLocationField, getStartDateField, getStartTimeField, getEndDateField,
        getEndTimeField, getAllDayField, getRepeatModeField, getDescriptionField]);

    /**
     * Return the visible fields of default fields.
     */
    const mergedFields: SchedulerEditorField[] = useMemo(() => {
        if (!fields || fields.length === 0) {
            return DEFAULT_FIELD_CONFIG;
        }
        return fields.filter((f: SchedulerEditorField) => f.visible !== false);
    }, [fields]);

    /**
     * Groups fields into rows based on default grouping.
     */
    const fieldRows: SchedulerEditorField[][] = useMemo(() => {
        const rows: SchedulerEditorField[][] = [];
        const fieldMap: Map<string, SchedulerEditorField> = new Map(mergedFields.map((f: SchedulerEditorField) => [f.name, f]));
        DEFAULT_ROW_GROUPS.forEach((group: string[]) => {
            const rowFields: SchedulerEditorField[] = group
                .map((name: string) => fieldMap.get(name))
                .filter((f: SchedulerEditorField) => !!f);
            if (rowFields.length > 0) {
                rows.push(rowFields);
            }
        });

        return rows;
    }, [mergedFields]);

    const getDefaultFieldClass: (fieldName: string) => string | undefined = (fieldName: string): string | undefined => {
        return DEFAULT_FIELD_CONFIG.find((f: SchedulerEditorField) => f.name === fieldName)?.className;
    };

    const renderField: (field: SchedulerEditorField) => ReactNode = useCallback((field: SchedulerEditorField): ReactNode => {
        const containerClass: string = [
            (field.name === 'isAllDay' ? [] : [CSS_CLASSES.EDITOR_FIELD_CONTAINER]),
            getDefaultFieldClass(field.name),
            field.className
        ].filter(Boolean).join(' ');
        if (field.component) {
            return (
                <div key={field.name} className={containerClass}>
                    {field.component}
                </div>
            );
        }
        const getField: (o: Partial<SchedulerEditorField>) => ReactNode = fieldComponents[field.name];
        if (getField) {
            if ((field.name === 'startTime' || field.name === 'endTime') && data?.isAllDay) {
                return null;
            }
            if (field.name === 'repeatMode' && action === 'EditOccurrence') {
                return null;
            }
            return (
                <div key={field.name} className={containerClass}>
                    {getField(field)}
                </div>
            );
        }
        return null;
    }, [data?.isAllDay, getString, fieldComponents, action]);

    const isDefaultMode: boolean = !fields || fields.length === 0;

    if (isDefaultMode) {
        return (
            <Form ref={formRef} rules={validationRules} initialValues={initialFormValues} onFormStateChange={setFormState} validateOnChange={true} autoComplete="off" >
                <div className={`${CSS_CLASSES.DIALOG_CONTENT} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                    <div className={`${CSS_CLASSES.TITLE_LOCATION_ROW} ${CSS_CLASSES.DISPLAY_FLEX} ${CSS_CLASSES.EDITOR_FIELDS_ROW}`}>
                        <div className={`${CSS_CLASSES.SUBJECT_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                            {getSubjectField()}
                        </div>
                        <div className={`${CSS_CLASSES.LOCATION_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                            {getLocationField()}
                        </div>
                    </div>

                    <div className={`${CSS_CLASSES.START_ROW} ${CSS_CLASSES.DISPLAY_FLEX} ${CSS_CLASSES.EDITOR_FIELDS_ROW}`}>
                        <div className={`${CSS_CLASSES.START_DATE_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                            {getStartDateField()}
                        </div>
                        {!data?.isAllDay && (
                            <div className={`${CSS_CLASSES.START_TIME_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                                {getStartTimeField()}
                            </div>
                        )}
                    </div>

                    <div className={`${CSS_CLASSES.END_ROW} ${CSS_CLASSES.DISPLAY_FLEX} ${CSS_CLASSES.EDITOR_FIELDS_ROW}`}>
                        <div className={`${CSS_CLASSES.END_DATE_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                            {getEndDateField()}
                        </div>
                        {!data?.isAllDay && (
                            <div className={`${CSS_CLASSES.END_TIME_CONTAINER} ${CSS_CLASSES.EDITOR_FIELD_CONTAINER}`}>
                                {getEndTimeField()}
                            </div>
                        )}
                    </div>

                    <div className={`${CSS_CLASSES.ALL_DAY_TIMEZONE_ROW} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                        <div className={`${CSS_CLASSES.ALL_DAY_CONTAINER}`}>
                            {getAllDayField()}
                        </div>
                    </div>

                    {action !== 'EditOccurrence' && (
                        <div className={`${CSS_CLASSES.EDITOR_FIELDS_ROW} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            {getRepeatModeField()}
                        </div>
                    )}

                    <div className={CSS_CLASSES.DESCRIPTION_ROW}>
                        <div className={CSS_CLASSES.DESCRIPTION_CONTAINER}>
                            {getDescriptionField()}
                        </div>
                    </div>
                </div>
            </Form>
        );
    }

    return (
        <Form ref={formRef} rules={validationRules} initialValues={initialFormValues} onFormStateChange={setFormState} validateOnChange={true} autoComplete="off">
            <div className={`${CSS_CLASSES.DIALOG_CONTENT} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                {fieldRows.map((row: SchedulerEditorField[], idx: number) => {
                    const rendered: ReactNode[] = row.map(renderField).filter(Boolean);
                    if (!rendered.length) { return null; }

                    return (
                        <div key={`row-${idx}`} className={`${CSS_CLASSES.EDITOR_FIELDS_ROW} ${CSS_CLASSES.DISPLAY_FLEX}`} >
                            {rendered}
                        </div>
                    );
                })}
            </div>
        </Form>
    );
};

export default EditorPopupFields;
