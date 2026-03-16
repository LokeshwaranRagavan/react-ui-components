import {
    forwardRef, useImperativeHandle, useRef, useState, useCallback, ReactElement,
    ForwardRefExoticComponent, RefAttributes, SetStateAction, RefObject, Dispatch, ReactNode, FC, ForwardedRef,
    useEffect, JSX,
    useMemo
} from 'react';
import { TimelineDayIcon, CloseIcon, LocationIcon, PageColumnsIcon, RepeatIcon } from '@syncfusion/react-icons';
import { Button, Color, IButton, Variant } from '@syncfusion/react-buttons';
import { TextBoxChangeEvent, TextBox, ITextBox } from '@syncfusion/react-inputs';
import { Popup, CollisionType, ActionOnScrollType } from '@syncfusion/react-popups';
import { CSS_CLASSES } from '../../common/constants';
import { DateService } from '../../services/DateService';
import { SchedulerCellClickEvent, EventModel, SchedulerCellDetails } from '../../types/scheduler-types';
import { Browser, IL10n, Size, useProviderContext } from '@syncfusion/react-base';
import { usePopup } from '../../hooks/useQuickInfoPopup';
import { useSchedulerLocalization } from '../../common/locale';
import { useOutsideClick } from '../../hooks/useScheduler';
import { EventService } from '../../services/EventService';
import { useSchedulerPropsContext } from '../../context/scheduler-context';
import { createPortal } from 'react-dom';
import { clearAndSelectAppointment } from '../../utils/actions';
import { CrudAction, AlertAction } from '../../types/enums';
import { getRecurrenceSummary } from '../../../recurrence-editor';
import { useRecurrenceEditorLocalization } from '../../../recurrence-editor/locale';

/**
 * Shared utility function to render close button for popups
 *
 * @param {Function} onClose The close handler function
 * @param {string} ariaLabel The aria-label for accessibility (default: 'Close')
 * @returns {ReactElement} The close button element
 */
export const renderPopupCloseButton: (onClose: () => void, ariaLabel?: string) => ReactElement = (
    onClose: () => void,
    ariaLabel: string = 'Close'
): ReactElement => {
    return (
        <Button
            className={`${CSS_CLASSES.POPUP_CLOSE} ${CSS_CLASSES.ROUND}`}
            onClick={onClose}
            aria-label={ariaLabel}
            key='close-btn'
            icon={<CloseIcon />}
            color={Color.Secondary}
            variant={Variant.Standard}
        />
    );
};

/**
 * Props interface for PopupWrapper component
 *
 * @private
 */
export interface PopupWrapperProps {
    visible: boolean;
    target: HTMLElement | null;
    popupPosition?: { X: string; Y: string };
    schedulerElement: RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onOpen?: () => void;
    children: ReactNode;
    adaptive: boolean
}

/**
 * Shared popup wrapper component
 *
 * @param {PopupWrapperProps} props - The component props
 * @returns {ReactElement | null} The popup wrapper
 */
export const PopupWrapper: FC<PopupWrapperProps> = (
    { visible, target, schedulerElement, popupPosition, onClose, onOpen, children, adaptive }: PopupWrapperProps
) => {
    if (!visible || !target) {
        return null;
    }
    const { dir } = useProviderContext();

    if (Browser.isDevice && adaptive) {
        return createPortal(
            <div className={`${CSS_CLASSES.CONTROL} ${CSS_CLASSES.POPUP_WRAPPER} ${CSS_CLASSES.MOBILE_POPUP}
                ${dir === 'rtl' ? CSS_CLASSES.RTL : ''}`}>
                {children}
            </div>,
            document?.body
        );
    }

    return (
        <Popup
            open={visible}
            relateTo={target}
            position={popupPosition}
            collision={{
                X: CollisionType.Flip,
                Y: CollisionType.Flip
            }}
            actionOnScroll={ActionOnScrollType.None}
            autoReposition={true}
            onOpen={onOpen}
            onClose={onClose}
            className={`${CSS_CLASSES.POPUP_WRAPPER}`}
            viewPortElementRef={schedulerElement}
            zIndex={1003}
        >
            {children}
        </Popup>
    );
};

/**
 * Shared popup utility function type for creating base imperative handle methods
 *
 * @private
 */
export interface BaseImperativeHandleMethods {
    show: () => void;
    hide: () => void;
    element: HTMLDivElement | null;
}

/**
 * Shared utility function to create base imperative handle methods
 *
 * @param {Function} setVisible The setVisible function
 * @param {Object} popupElement The popup element ref
 * @returns {BaseImperativeHandleMethods} The base imperative handle methods
 */
export const createBaseImperativeHandle: (
    setVisible: Dispatch<SetStateAction<boolean>>,
    popupElement: RefObject<HTMLDivElement>
) => BaseImperativeHandleMethods = (
    setVisible: Dispatch<SetStateAction<boolean>>,
    popupElement: RefObject<HTMLDivElement>
): BaseImperativeHandleMethods => ({
    show: () => setVisible(true),
    hide: () => setVisible(false),
    element: popupElement.current
});

/**
 * Base interface for scheduler popup components
 *
 * @private
 */
export interface ISchedulerPopupBase {
    /**
     * Show the popup
     */
    show: () => void;

    /**
     * Hide the popup
     */
    hide: () => void;

    /**
     * Focus the popup (optional - only needed for components with focusable elements)
     */
    focus?: () => void;

    /**
     * The popup DOM element
     */
    element: HTMLDivElement | null;
}

/**
 * Interface for the QuickInfoPopup component
 *
 * @private
 */
export interface IQuickInfoPopup extends ISchedulerPopupBase {
    /**
     * Handle cell click to show popup
     */
    handleCellClick: (data: SchedulerCellClickEvent, element: HTMLElement) => void;

    /**
     * Handle event click to show popup
     */
    handleEventClick: (data: EventModel, element: HTMLElement) => void;

    /**
     * Trigger the popup's delete action (imperative)
     */
    handleDelete: () => void;
}

/**
 * Props for the QuickInfoPopup component
 *
 * @private
 */
export interface QuickInfoPopupProps {
    onClose?: () => void;
    onEditEvent: (eventData: EventModel) => void;
    onMoreDetails: (cellData: SchedulerCellClickEvent) => void;
}

/**
 * Combined QuickInfoPopup component that handles both cell and event popups
 */
export const QuickInfoPopup: ForwardRefExoticComponent<QuickInfoPopupProps & RefAttributes<IQuickInfoPopup>> =
forwardRef<IQuickInfoPopup, QuickInfoPopupProps>((props: QuickInfoPopupProps,  ref: ForwardedRef<IQuickInfoPopup>) => {

    const { onClose, onEditEvent, onMoreDetails } = props;

    const { schedulerRef, eventSettings, showQuickInfoPopup, showDeleteAlert, showRecurrenceAlert, view, readOnly,
        timeFormat, quickInfo } = useSchedulerPropsContext();
    const [cellData, setCellData] = useState<SchedulerCellClickEvent>({} as SchedulerCellClickEvent);
    const [eventData, setEventData] = useState<EventModel>({} as EventModel);
    const [formData, setFormData] = useState<EventModel>({} as EventModel);
    const [popupType, setPopupType] = useState<'cell' | 'event' | null>(null);
    const [popupPosition, setPopupPosition] = useState({ X: 'right', Y: 'top' });
    const [shouldFocus, setShouldFocus] = useState(false);

    const textBoxRef: RefObject<ITextBox> = useRef<ITextBox>(null);
    const editRef: RefObject<IButton> = useRef<IButton>(null);

    const {
        visible,
        setVisible,
        target,
        setTarget,
        popupElement,
        schedulerElement,
        handleClose,
        closeAllPopups,
        handleRef
    } = usePopup(onClose);

    const { locale } = useProviderContext();
    useOutsideClick(popupElement, visible, handleClose);
    const { getString: getSchedulerString } = useSchedulerLocalization(locale || 'en-US');
    const { getString: getRecurrenceString } = useRecurrenceEditorLocalization(locale || 'en-US');
    const localeObj: IL10n = useMemo(() => ({ getConstant: (key: string) => getRecurrenceString(key) } as IL10n), [getRecurrenceString]);

    useEffect(() => {
        if (shouldFocus) {
            requestAnimationFrame(() => {
                focusTextBox();
            });
            setShouldFocus(false);
        }
    }, [shouldFocus]);

    useImperativeHandle(ref, () => ({
        ...createBaseImperativeHandle(setVisible, popupElement),
        handleCellClick: (cellData: SchedulerCellClickEvent, element: HTMLElement) => {
            if (!showQuickInfoPopup) {
                return;
            }
            setCellData(cellData);
            setTarget(element);
            setPopupType('cell');
            setFormData({
                [eventSettings.fields.startTime]: cellData.startTime,
                [eventSettings.fields.endTime]: cellData.endTime,
                [eventSettings.fields.isAllDay]: cellData.isAllDay
            });
            cellPopupClick();
            setVisible(true);
        },
        handleEventClick: (eventData: EventModel, element: HTMLElement) => {
            if (!showQuickInfoPopup) {
                return;
            }
            setEventData(eventData);
            setTarget(element);
            setPopupType('event');
            cellPopupClick();
            setVisible(true);
            clearAndSelectAppointment(element);
        },
        handleDelete: openDeleteConfirmation
    }));

    const onOpen: () => void = (): void => {
        setPopupPosition(
            view?.toLowerCase() === 'day'
                ? { X: 'center', Y: 'center' }
                : { X: 'right', Y: 'top' }
        );
        setShouldFocus(true);
    };

    const cellPopupClick: () => void = (): void => {
        if (textBoxRef || editRef) {
            handleClose();
        }
        requestAnimationFrame(() => {
            focusTextBox();
        });
    };

    /**
     * Utility function to focus the text box
     *
     * @returns {void}
     */
    const focusTextBox: () => void = (): void => {
        if (popupType === 'cell') {
            if (textBoxRef.current && textBoxRef.current.element) {
                const element: HTMLInputElement = textBoxRef.current.element as HTMLInputElement;
                element.focus();
            }
        }
        else if (popupType === 'event') {
            if (editRef.current && editRef.current.element) {
                const element: HTMLInputElement = editRef.current.element as HTMLInputElement;
                element.focus();
            }
        }
    };

    /**
     * Handles the subject text change event
     *
     * @param {TextBoxChangeEvent} args - The event arguments
     * @returns {void}
     */
    const handleSubjectChange: (args: TextBoxChangeEvent) => void = useCallback((args: TextBoxChangeEvent): void => {
        const value: string = args.value;
        const event: EventModel = {
            ...formData,
            [eventSettings.fields.subject]: value
        };
        setFormData(event);
    }, [formData]);

    /**
     * Handles the save action for cell popups
     *
     * @returns {void}
     */
    const handleSave: () => void = useCallback((): void => {
        const updatedData: EventModel = {
            ...formData,
            [eventSettings.fields.id]: EventService.generateEventGuid(),
            [eventSettings.fields.subject]: formData[eventSettings.fields.subject] || getSchedulerString('newEvent')
        };
        schedulerRef?.current?.addEvent?.(updatedData);
        handleClose();
        closeAllPopups();
    }, [formData, handleClose]);

    /**
     * Handles the edit action for event popups
     *
     * @returns {void}
     */
    const handleEdit: () => void = useCallback((): void => {
        onEditEvent(eventData);
        handleClose();
    }, [eventData, handleClose, onEditEvent]);

    const handleMoreDetails: () => void = useCallback((): void => {
        const updatedCellData: SchedulerCellClickEvent = {
            ...cellData,
            [eventSettings.fields.subject]: textBoxRef?.current?.value
        };
        onMoreDetails(updatedCellData);
        handleClose();
    }, [cellData, handleClose, onMoreDetails]);

    /**
     * Handles the delete action for event popups
     *
     * @returns {void}
     */
    const openDeleteConfirmation: () => void = useCallback((): void => {
        const handleRecurrenceDelete: (selectOption: string) => void = (selectOption: string): void => {
            if (popupType === 'event' && eventData) {
                const action: CrudAction = selectOption === 'EditOccurrence' ?
                    'DeleteOccurrence' : 'DeleteSeries';
                schedulerRef?.current?.deleteEvent?.(eventData, action);
            }
            handleClose();
            closeAllPopups();
        };
        const performDelete: () => void = (): void => {
            if (popupType === 'event' && eventData) {
                schedulerRef?.current?.deleteEvent?.(eventData);
            }
            handleClose();
            closeAllPopups();
        };
        if (popupType === 'event' && eventData && eventData.recurrenceID) {
            showRecurrenceAlert?.(AlertAction.RecurrenceDelete, handleRecurrenceDelete);
        } else {
            showDeleteAlert?.(performDelete);
        }
        setVisible(false);
    }, [popupType, eventData, handleClose, closeAllPopups, schedulerRef, showDeleteAlert, showRecurrenceAlert, eventSettings]);

    /**
     * Handles key down events for button actions (Enter or Space)
     *
     * @param {Function} callback - The callback function to execute
     * @returns {Function} The key down handler
     */
    const createKeyDownHandler: (callback: () => void) => (e: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>) => void =
        (callback: () => void) => (e: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>): void => {
            if (e.key === 'Enter' || (e.key === ' ' && (e.target as HTMLButtonElement).type === 'button')) {
                e.preventDefault();
                callback();
            }
        };

    const cellDataProps: SchedulerCellDetails = {
        startTime: cellData.startTime,
        endTime: cellData.endTime,
        isAllDay: cellData.isAllDay,
        element: cellData.element
    };

    const addHeaderElement: JSX.Element = (
        <>
            {quickInfo?.addHeader ? (
                quickInfo?.addHeader({ cellData: cellDataProps })
            ) : (
                <div className={CSS_CLASSES.POPUP_HEADER}>
                    <div className={`${CSS_CLASSES.POPUP_HEADER_WRAP} ${CSS_CLASSES.CONTENT_RIGHT}`}>
                        {renderPopupCloseButton(handleClose, getSchedulerString('close'))}
                    </div>
                </div>
            )}
        </>
    );

    const addContentElement: JSX.Element = (
        <>
            {quickInfo?.addContent ? (
                quickInfo?.addContent({ cellData: cellDataProps })
            ) : (
                <div className={`${CSS_CLASSES.POPUP_CONTENT}`}>
                    <div className={CSS_CLASSES.POPUP_INPUT_WRAP}>
                        <TextBox
                            ref={textBoxRef}
                            className={CSS_CLASSES.POPUP_CELL_SUBJECT}
                            placeholder={getSchedulerString('addTitle')}
                            onKeyDown={createKeyDownHandler(handleSave)}
                            onChange={handleSubjectChange}
                            value={(formData[eventSettings?.fields?.subject] as string) || ''}
                            size={Size.Large}
                        />
                    </div>
                    {cellData.startTime && cellData.endTime && (
                        <div className={`${CSS_CLASSES.CELL_TIME} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            <TimelineDayIcon />
                            <span className={CSS_CLASSES.POPUP_TIME_TEXT}>
                                {DateService.formatCellDateRange(
                                    new Date(cellData.startTime),
                                    new Date(cellData.endTime),
                                    locale,
                                    timeFormat)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const addFooterElement: JSX.Element = (
        <>
            {quickInfo?.addFooter ? (
                quickInfo?.addFooter({ cellData: cellDataProps })
            ) : (
                <div className={`${CSS_CLASSES.POPUP_FOOTER} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                    <Button
                        className={CSS_CLASSES.POPUP_MORE_DETAILS}
                        onClick={handleMoreDetails}
                        color={Color.Primary}
                        variant={Variant.Standard}
                    >
                        {getSchedulerString('moreDetails')}
                    </Button>
                    <Button
                        className={CSS_CLASSES.SAVE_EVENT}
                        onClick={handleSave}
                        onKeyDown={createKeyDownHandler(handleSave)}
                        color={Color.Primary}
                        variant={Variant.Standard}
                    >
                        {getSchedulerString('save')}
                    </Button>
                </div>
            )}
        </>
    );

    const editHeaderElement: JSX.Element = (
        <>
            {quickInfo?.editHeader ? (
                quickInfo?.editHeader({ eventData })
            ) : (
                <div className={`${CSS_CLASSES.POPUP_HEADER} ${CSS_CLASSES.POPUP_CELL_HEADER} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                    <div className={`${CSS_CLASSES.POPUP_EVENT_SUBJECT} ${CSS_CLASSES.ELLIPSIS}`} title={eventData?.subject || getSchedulerString('addTitle')}>
                        {eventData.subject || getSchedulerString('addTitle')}
                    </div>
                    <div className={`${CSS_CLASSES.POPUP_HEADER_WRAP}`}>
                        {renderPopupCloseButton(handleClose, getSchedulerString('close'))}
                    </div>
                </div>
            )}
        </>
    );

    const editContentElement: JSX.Element = (
        <>
            {quickInfo?.editContent ? (
                quickInfo?.editContent({ eventData })
            ) : (
                <div className={`${CSS_CLASSES.POPUP_CONTENT}`}>
                    {eventData.startTime && eventData.endTime && (
                        <div className={`${CSS_CLASSES.CELL_TIME} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            <TimelineDayIcon />
                            <span className={CSS_CLASSES.POPUP_TIME_TEXT}>
                                {DateService.formatPopupDateRange(eventData, locale, timeFormat)}
                            </span>
                        </div>
                    )}

                    {eventData.recurrenceRule && (
                        <div className={`${CSS_CLASSES.RULE_SUMMARY} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            <RepeatIcon />
                            <span className={CSS_CLASSES.RULE_SUMMARY_TEXT}>{
                                getRecurrenceSummary(eventData.recurrenceRule, locale, localeObj)}</span>
                        </div>
                    )}

                    {eventData.location && (
                        <div className={`${CSS_CLASSES.LOCATION} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            <LocationIcon />
                            <span className={CSS_CLASSES.POPUP_LOCATION_TEXT}>{eventData.location}</span>
                        </div>
                    )}

                    {eventData.description && (
                        <div className={`${CSS_CLASSES.DESCRIPTION} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                            <PageColumnsIcon />
                            <span className={CSS_CLASSES.POPUP_DESCRIPTION_TEXT}>{eventData.description}</span>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const editFooterElement: JSX.Element = (
        <>
            {quickInfo?.editFooter ? (
                quickInfo?.editFooter({ eventData })
            ) : (
                <div className={`${CSS_CLASSES.POPUP_FOOTER} ${CSS_CLASSES.DISPLAY_FLEX}`}>
                    <Button
                        ref={editRef}
                        className={CSS_CLASSES.EDIT_EVENT}
                        disabled={!!eventData?.isReadonly || readOnly}
                        onClick={handleEdit}
                        onKeyDown={createKeyDownHandler(handleEdit)}
                        color={Color.Primary}
                        variant={Variant.Standard}
                    >
                        {getSchedulerString('edit')}
                    </Button>
                    <Button
                        className={CSS_CLASSES.DELETE_EVENT}
                        disabled={!!eventData?.isReadonly || readOnly}
                        onClick={openDeleteConfirmation}
                        onKeyDown={createKeyDownHandler(openDeleteConfirmation)}
                        color={Color.Primary}
                        variant={Variant.Standard}
                    >
                        {getSchedulerString('delete')}
                    </Button>
                </div>
            )}
        </>
    );

    /**
     * Render the cell popup content
     *
     * @returns {ReactElement} The cell popup content
     */
    const renderCellPopupContent: () => ReactElement = (): ReactElement => (
        <div
            ref={handleRef}
            className={`${CSS_CLASSES.QUICK_INFO_WRAPPER} ${CSS_CLASSES.CELL_POPUP}`}
        >
            {addHeaderElement}
            {addContentElement}
            {addFooterElement}
        </div>
    );

    /**
     * Render the event popup content
     *
     * @returns {ReactElement} The event popup content
     */
    const renderEventPopupContent: () => ReactElement = (): ReactElement => (
        <div
            ref={handleRef}
            className={`${CSS_CLASSES.QUICK_INFO_WRAPPER} ${CSS_CLASSES.EVENT_POPUP}`}
        >
            {editHeaderElement}
            {editContentElement}
            {editFooterElement}
        </div>
    );

    return (
        <PopupWrapper
            visible={visible}
            target={target}
            popupPosition={popupPosition}
            schedulerElement={schedulerElement}
            onClose={handleClose}
            onOpen={onOpen}
            adaptive={quickInfo?.adaptive ?? true}
        >
            {popupType === 'cell' ? renderCellPopupContent() : renderEventPopupContent()}
        </PopupWrapper>
    );
});

QuickInfoPopup.displayName = 'QuickInfoPopup';

export default QuickInfoPopup;
