import { useCallback, useEffect, useMemo, useState } from 'react';
import { Query, DataManager, ReturnType } from '@syncfusion/react-data';
import { extend } from '@syncfusion/react-base';
import { EventModel, SchedulerDataChangeEvent, SchedulerDataRequestEvent  } from '../types/scheduler-types';
import { DateService } from '../services/DateService';
import { EventService } from '../services/EventService';
import { ActiveViewProps } from '../types/internal-interface';
import { expandRecurringEvents, getRecurrenceMaxId, updateParentRecurrenceEvent } from '../utils/event-base';
import { CrudAction } from '../types/enums';
import { getRecurrenceStringFromDate } from '../../recurrence-editor';
import { ConfirmationDialogState } from './useConfirmationDialog';

interface CrudArgs extends SchedulerDataChangeEvent {
    promise?: Promise<any>;
    editParams?: SaveChanges;
}

interface SaveChanges {
    addedRecords: Record<string, any>[];
    changedRecords: Record<string, any>[];
    deletedRecords: Record<string, any>[];
}

interface UseDataProps {
    activeViewProps: ActiveViewProps;
    renderDates: Date[];
    confirmationDialog?: {
        show: (config: Omit<ConfirmationDialogState, 'visible'>) => void;
        hide: () => void;
        setStateUpdater: (callback: (state: ConfirmationDialogState) => void) => void;
    };
}

/** @private */
interface UseDataResult {

    /**
     * Scheduler component events data.
     */
    eventsData: EventModel[];

    /**
     * Processed events data before expansion.
     */
    eventsProcessed: EventModel[];

    /**
     * Adds the newly created event into the Scheduler dataSource.
     */
    addEvent: (data: Record<string, any> | Record<string, any>[]) => void;

    /**
     * Deletes the events based on the provided ID or event collection in the argument list.
     */
    deleteEvent?: (id: string | number | Record<string, any> | Record<string, any>[], action?: CrudAction) => void;

    /**
     * Updates the changes made in the event object by passing it as an parameter into the dataSource.
     */
    saveEvent?: (data: Record<string, any> | Record<string, any>[], action?: CrudAction) => void;
}

/**
 * Custom hook to manage data operations for the scheduler
 *
 * @param {UseDataProps} props Scheduler useData hook props.
 * @returns {UseDataResult} Object containing APIs for data operations
 * @private
 */
export const useData: (props: UseDataProps) => UseDataResult = (props: UseDataProps): UseDataResult => {
    const { activeViewProps, renderDates } = props;
    const { eventSettings, readOnly, onDataChangeStart, onDataChangeComplete, onError,
        onDataRequest } = activeViewProps;
    const [eventsData, setEventsData] = useState<EventModel[]>();
    const [eventsProcessed, setEventsProcessed] = useState<EventModel[]>();

    const dataManager: DataManager = useMemo(() => {
        if (eventSettings?.dataSource instanceof DataManager) {
            return eventSettings.dataSource;
        }
        else if (Array.isArray(eventSettings?.dataSource)) {
            return new DataManager(eventSettings.dataSource);
        }
        return new DataManager([]);
    }, [eventSettings?.dataSource]);

    const query: Query = useMemo(() => {
        if (eventSettings?.query instanceof Query) {
            return eventSettings?.query;
        } else {
            return new Query();
        }
    }, [eventSettings?.query]);

    /**
     * The function is used to generate updated Query.
     *
     * @param {Date} startDate Accepts the start date
     * @param {Date} endDate Accepts the end date
     * @returns {Query} returns the Query
     */
    const generateQuery: (startDate?: Date, endDate?: Date) => Query = (startDate?: Date, endDate?: Date): Query => {
        const newQuery: Query = query.clone();
        if (startDate && endDate) {
            newQuery.addParams('StartDate', startDate.toISOString());
            newQuery.addParams('EndDate', endDate.toISOString());
        }
        return newQuery;
    };

    const getData: (query: Query) => Object[] | Promise<Response> = (query: Query): Object[] | Promise<Response> => {
        return dataManager.executeQuery(query);
    };

    const getTable: () => string = (): string =>  {
        if (eventSettings.query) {
            const query: Query = eventSettings.query.clone();
            return query.fromTable;
        }
        return null;
    };

    const dataManagerSuccess: (e: ReturnType) => void = (e: ReturnType): void => {
        const event: SchedulerDataRequestEvent = {
            result: e.result,
            count: e.count
        };
        if (onDataRequest) {
            onDataRequest(event);
        }
        const originalData: Record<string, any>[] = event.result;
        const mappedEvents: EventModel[] = EventService.mapEventData(originalData, eventSettings.fields);
        const expandedEvents: EventModel[] = expandRecurringEvents(mappedEvents, renderDates, activeViewProps.firstDayOfWeek);
        setEventsProcessed(mappedEvents);
        setEventsData(expandedEvents);
    };

    const dataManagerFailure: (error: Error) => void = (error: Error): void => {
        if (onError) {
            onError(error);
        }
    };

    const refreshDataManager: () => void = useCallback((): void => {
        if (!renderDates || renderDates.length === 0) { return; }
        const dmQuery: Query = generateQuery(renderDates[0], renderDates[renderDates.length - 1]);
        const dmResult: Object[] | Promise<Response> = getData(dmQuery);
        (dmResult as any).then(
            (e: ReturnType) => dataManagerSuccess(e)
        ).catch(
            (e: Error) => dataManagerFailure(e)
        );
    }, [renderDates, getData, generateQuery]);

    const updateEventDateTime: (eventData: Record<string, any>) => Record<string, any> =
    (eventData: Record<string, any>): Record<string, any> => {
        if (typeof eventData[eventSettings.fields.startTime] === 'string') {
            eventData[eventSettings.fields.startTime] = DateService.getDateFromString(eventData[eventSettings.fields.startTime]);
        }
        if (typeof eventData[eventSettings.fields.endTime] === 'string') {
            eventData[eventSettings.fields.endTime] = DateService.getDateFromString(eventData[eventSettings.fields.endTime]);
        }
        return eventData;
    };

    const refreshData: (args: CrudArgs) => void = useCallback((args: CrudArgs): void => {
        const actionArgs: SchedulerDataChangeEvent = {
            cancel: false,
            addedRecords: args.editParams.addedRecords,
            changedRecords: args.editParams.changedRecords,
            deletedRecords: args.editParams.deletedRecords
        };
        if (dataManager.dataSource?.offline) {
            if (onDataChangeComplete) {
                onDataChangeComplete(actionArgs);
            }
            refreshDataManager();
        } else {
            args.promise.then(() => {
                if (onDataChangeComplete) {
                    onDataChangeComplete(actionArgs);
                }
                refreshDataManager();
            }).catch((error: Error) => {
                if (onError) {
                    onError(error);
                }
            });
        }
    }, [onDataChangeComplete, onError, refreshDataManager, dataManager]);

    const processAddEvent: (addArgs: SchedulerDataChangeEvent) => void = useCallback((addArgs: SchedulerDataChangeEvent): void => {
        const editParams: SaveChanges = { addedRecords: [], changedRecords: [], deletedRecords: [] };
        let promise: Promise<EventModel>;
        if (addArgs.addedRecords instanceof Array) {
            for (let event of addArgs.addedRecords) {
                event = updateEventDateTime(event);
                if (event[eventSettings.fields.recurrenceRule]) {
                    event[eventSettings.fields.id] = getRecurrenceMaxId(eventsData, eventSettings.fields) + 1;
                }
                const eventData: Record<string, EventModel> = <Record<string, EventModel>>extend({}, event, null, true);
                editParams.addedRecords.push(eventData);
            }
            promise = dataManager.saveChanges(editParams, eventSettings.fields.id, getTable(), generateQuery()) as Promise<EventModel>;
        }
        const crudArgs: CrudArgs = {
            cancel: false,
            promise: promise,
            editParams: editParams
        };
        refreshData(crudArgs);
    }, [dataManager, eventSettings, getTable, generateQuery, refreshData, eventsData]);

    const processDeleteEvent: (deleteArgs: SchedulerDataChangeEvent, action?: CrudAction) => SaveChanges =
        useCallback((deleteArgs: SchedulerDataChangeEvent, action?: CrudAction): SaveChanges => {
            const editParams: SaveChanges = { addedRecords: [], changedRecords: [], deletedRecords: [] };
            if (action === 'DeleteOccurrence' || action === 'DeleteSeries') {
                for (const event of deleteArgs.deletedRecords) {
                    let clonedEvent: Record<string, any> = <Record<string, any>>extend({}, event, null, true);
                    if (clonedEvent.recurrenceID || clonedEvent[eventSettings.fields.recurrenceID]) {
                        if (action === 'DeleteOccurrence') {
                            if (clonedEvent.recurrenceID !== clonedEvent.id ||
                                clonedEvent[eventSettings.fields.recurrenceID] !== clonedEvent[eventSettings.fields.id]) {
                                editParams.deletedRecords.push(clonedEvent);
                            } else {
                                if (clonedEvent.startTime) {
                                    clonedEvent.recurrenceException = getRecurrenceStringFromDate(clonedEvent.startTime);
                                } else {
                                    clonedEvent[eventSettings.fields.recurrenceException] =
                                        getRecurrenceStringFromDate(clonedEvent[eventSettings.fields.startTime]);
                                }
                                clonedEvent = updateParentRecurrenceEvent(clonedEvent, eventSettings.fields, eventsProcessed);
                                editParams.changedRecords.push(clonedEvent);
                            }
                        } else if (action === 'DeleteSeries') {
                            const deleteEvents: EventModel[] = (eventsProcessed || []).filter((e: EventModel) =>
                                (e.recurrenceID || e.id) === (clonedEvent.recurrenceID || clonedEvent[eventSettings.fields.recurrenceID]));
                            editParams.deletedRecords.push(...deleteEvents);
                        }
                    } else {
                        editParams.deletedRecords.push(clonedEvent);
                    }
                }
            } else {
                editParams.deletedRecords = editParams.deletedRecords.concat(deleteArgs.deletedRecords);
            }
            return editParams;
        }, [eventSettings, eventsProcessed]);

    const performDeleteEvent: (editParams: SaveChanges) => void =
        useCallback((editParams: SaveChanges): void => {
            let promise: Promise<any>;
            if (editParams.deletedRecords.length > 1 || editParams.changedRecords.length > 0) {
                promise = dataManager.saveChanges(editParams, eventSettings.fields.id, getTable(), generateQuery()) as Promise<any>;
            } else if (editParams.deletedRecords.length === 1) {
                promise = dataManager.remove(eventSettings.fields.id, editParams.deletedRecords[0],
                                             getTable(), generateQuery()) as Promise<any>;
            } else {
                promise = Promise.resolve();
            }
            const crudArgs: CrudArgs = {
                cancel: false,
                promise: promise,
                editParams: editParams
            };
            refreshData(crudArgs);
        }, [dataManager, eventSettings, getTable, generateQuery, refreshData]);

    const handleEditOccurrence: (records: Record<string, any>[], editParams: SaveChanges) => void =
    (records: Record<string, any>[], editParams: SaveChanges): void => {
        for (const event of records) {
            let clonedEvent: Record<string, any> = <Record<string, any>>extend({}, event, null, true);
            if (!clonedEvent[eventSettings.fields.recurrenceID]) { continue; }
            const isOccurrence: boolean = clonedEvent[eventSettings.fields.id] !== clonedEvent[eventSettings.fields.recurrenceID];
            if (isOccurrence && !clonedEvent[eventSettings.fields.recurrenceRule]) {
                clonedEvent = updateEventDateTime(clonedEvent);
                editParams.changedRecords.push(clonedEvent);
                continue;
            }
            clonedEvent = updateEventDateTime(clonedEvent);
            if (!isOccurrence) {
                const parentEvent: EventModel = updateParentRecurrenceEvent(clonedEvent, eventSettings.fields, eventsProcessed);
                editParams.changedRecords.push(parentEvent);
                clonedEvent[eventSettings.fields.id] = getRecurrenceMaxId(eventsData, eventSettings.fields) + 1;
                editParams.addedRecords.push(updateEventDateTime(clonedEvent));
            } else {
                editParams.changedRecords.push(clonedEvent);
            }
        }
    };

    const handleEditSeries: (records: Record<string, any>[], editParams: SaveChanges, action: string) => void =
    (records: Record<string, any>[], editParams: SaveChanges, action: string): void => {
        for (const event of records) {
            let clonedEvent: Record<string, any> = <Record<string, any>>extend({}, event, null, true);
            if (clonedEvent[eventSettings.fields.recurrenceID]) {
                let parentEvent: EventModel = {};
                let isSeriesEventChanged: boolean = false;
                const filteredEvents: EventModel[] = (eventsProcessed || [])?.filter((e: EventModel) => {
                    if ((e.recurrenceID && e.recurrenceID === clonedEvent[eventSettings.fields.recurrenceID] &&
                        e.id !== clonedEvent[eventSettings.fields.recurrenceID]) || (!e.recurrenceID && e.recurrenceRule &&
                            e.id === clonedEvent[eventSettings.fields.recurrenceID] && e.recurrenceException)) {
                        isSeriesEventChanged = true;
                    }
                    if (e.id === clonedEvent[eventSettings.fields.recurrenceID]) {
                        parentEvent = e;
                    }
                    return (e.recurrenceID || e.id) === clonedEvent[eventSettings.fields.recurrenceID];
                });

                clonedEvent[eventSettings.fields.id] = parentEvent.id;
                if (!clonedEvent[eventSettings.fields.recurrenceRule] || action === 'EditCurrentSeries') {
                    clonedEvent[eventSettings.fields.recurrenceRule] = parentEvent.recurrenceRule;
                }
                delete clonedEvent[eventSettings.fields.recurrenceID];

                if (isSeriesEventChanged) {
                    if (action === 'EditSeries') {
                        delete clonedEvent[eventSettings.fields.recurrenceException];
                        const deleteEvents: EventModel[] = filteredEvents;
                        editParams.deletedRecords.push(...deleteEvents);
                        editParams.addedRecords.push(updateEventDateTime(clonedEvent));
                    } else if (action === 'EditCurrentSeries') {
                        editParams.changedRecords.push(updateEventDateTime(clonedEvent));
                    }
                } else {
                    clonedEvent = updateEventDateTime(clonedEvent);
                    editParams.changedRecords.push(clonedEvent);
                }
            }
        }
    };

    const handleDefaultEdit: (records: Record<string, EventModel>[] | Record<string, EventModel>, editParams: SaveChanges) => void =
    (records: Record<string, EventModel>[] | Record<string, EventModel>, editParams: SaveChanges): void => {
        if (records instanceof Array) {
            for (let event of records) {
                event = updateEventDateTime(event);
                editParams.changedRecords.push(<Record<string, EventModel>>extend({}, event, null, true));
            }
        } else {
            const event: Record<string, EventModel> = records;
            editParams.changedRecords.push(event);
        }
    };

    const processSaveEvent: (saveArgs: SchedulerDataChangeEvent, action?: CrudAction) => SaveChanges =
        useCallback((saveArgs: SchedulerDataChangeEvent, action?: CrudAction): SaveChanges => {
            const editParams: SaveChanges = { addedRecords: [], changedRecords: [], deletedRecords: [] };
            switch (action) {
            case 'EditOccurrence':
                if (saveArgs.changedRecords instanceof Array && saveArgs.changedRecords.length > 0) {
                    handleEditOccurrence(saveArgs.changedRecords, editParams);
                }
                break;

            case 'EditCurrentSeries':
            case 'EditSeries':
                if (saveArgs.changedRecords instanceof Array && saveArgs.changedRecords.length > 0) {
                    handleEditSeries(saveArgs.changedRecords, editParams, action);
                }
                break;

            default:
                handleDefaultEdit(saveArgs.changedRecords, editParams);
                break;
            }
            return editParams;
        }, [eventSettings, eventsData, eventsProcessed, updateEventDateTime]);

    const performSaveEvent: (editParams: SaveChanges) => void =
        useCallback((editParams: SaveChanges): void => {
            let promise: Promise<any>;
            if (editParams.changedRecords.length > 1 || editParams.addedRecords.length > 0 || editParams.deletedRecords.length > 0) {
                promise = dataManager.saveChanges(editParams, eventSettings.fields.id, getTable(), generateQuery()) as Promise<any>;
            } else if (editParams.changedRecords.length === 1) {
                promise =
                    dataManager.update(eventSettings.fields.id, editParams.changedRecords[0], getTable(), generateQuery()) as Promise<any>;
            } else {
                promise = Promise.resolve();
            }
            const crudArgs: CrudArgs = {
                cancel: false,
                promise: promise,
                editParams: editParams
            };
            refreshData(crudArgs);
        }, [dataManager, eventSettings, getTable, generateQuery, refreshData]);

    const addEvent: (eventData: Record<string, any> | Record<string, any>[]) => void =
    useCallback(async (eventData: Record<string, any> | Record<string, any>[]) => {
        if (eventSettings.allowAdding && !readOnly) {
            const addEvents: Record<string, any>[] = (eventData instanceof Array) ? eventData : [eventData];
            if (addEvents.length === 0) {
                return;
            }
            const addArgs: SchedulerDataChangeEvent = {
                cancel: false,
                addedRecords: addEvents,
                changedRecords: [],
                deletedRecords: []
            };
            if (onDataChangeStart) {
                onDataChangeStart(addArgs);
            }
            if (addArgs.cancel) {
                return;
            }
            if (addArgs.promise) {
                addArgs.promise.then((hasContinue: boolean) => {
                    if (hasContinue) {
                        processAddEvent(addArgs);
                    }
                }).catch((error: Error) => {
                    if (onError) {
                        onError(error);
                    }
                });
            } else {
                processAddEvent(addArgs);
            }
        }
    }, [eventSettings, readOnly, onDataChangeStart, onError, processAddEvent]);

    const deleteEvent: (id: string | number | Record<string, any> | Record<string, any>[], action?: CrudAction) => void =
    useCallback(async (id: string | number | Record<string, any> | Record<string, any>[], action?: CrudAction) => {
        if (eventSettings.allowDeleting && !readOnly) {
            const deleteEvents: Record<string, any>[] = (id instanceof Array ? id : [id]) as Record<string, EventModel>[];
            if (deleteEvents.length === 0) {
                return;
            }
            const deleteArgs: SchedulerDataChangeEvent = {
                cancel: false,
                addedRecords: [], changedRecords: [], deletedRecords: deleteEvents
            };
            const editParams: SaveChanges = processDeleteEvent(deleteArgs, action);
            deleteArgs.addedRecords = editParams.addedRecords;
            deleteArgs.changedRecords = editParams.changedRecords;
            deleteArgs.deletedRecords = editParams.deletedRecords;
            if (onDataChangeStart) {
                onDataChangeStart(deleteArgs);
            }
            if (deleteArgs.cancel) {
                return;
            }
            if (deleteArgs.promise) {
                deleteArgs.promise.then((hasContinue: boolean) => {
                    if (hasContinue) {
                        performDeleteEvent(editParams);
                    }
                }).catch((error: Error) => {
                    if (onError) {
                        onError(error);
                    }
                });
            } else {
                performDeleteEvent(editParams);
            }
        }
    }, [eventSettings, readOnly, onDataChangeStart, onError, processDeleteEvent]);

    const saveEvent: (data: Record<string, any> | Record<string, any>[], action?: CrudAction) => void =
    useCallback(async (data: Record<string, any> | Record<string, any>[], action?: CrudAction) => {
        if (eventSettings.allowEditing && !readOnly) {
            const updateEvents: Record<string, any>[] = (data instanceof Array) ? data : [data];
            if (updateEvents.length === 0) {
                return;
            }
            const saveArgs: SchedulerDataChangeEvent = {
                cancel: false,
                addedRecords: [], changedRecords: updateEvents, deletedRecords: []
            };
            const editParams: SaveChanges = processSaveEvent(saveArgs, action);
            saveArgs.addedRecords = editParams.addedRecords;
            saveArgs.changedRecords = editParams.changedRecords;
            saveArgs.deletedRecords = editParams.deletedRecords;
            if (onDataChangeStart) {
                onDataChangeStart(saveArgs);
            }
            if (saveArgs.cancel) {
                return;
            }
            if (saveArgs.promise) {
                saveArgs.promise.then((hasContinue: boolean) => {
                    if (hasContinue) {
                        performSaveEvent(editParams);
                    }
                }).catch((error: Error) => {
                    if (onError) {
                        onError(error);
                    }
                });
            } else {
                performSaveEvent(editParams);
            }
        }
    }, [eventSettings, readOnly, onDataChangeStart, onError, processSaveEvent]);

    useEffect(() => {
        refreshDataManager();
    }, [dataManager, query, renderDates]);

    return {
        eventsData,
        eventsProcessed,
        addEvent,
        deleteEvent,
        saveEvent
    };
};
