import { EventDragProps } from '../types/scheduler-types';
import { CSS_CLASSES } from '../common/constants';
import { getZindexPartial } from '@syncfusion/react-popups';
import { Point } from '../types/internal-interface';
import { MS_PER_MINUTE } from '../services/DateService';

export class CloneBase {
    public static currentActionName: string = '';
    public isActionPerformed: boolean = false;
    public removeDocListenersRef: () => void = undefined;
    public cellWidth: number = 0;
    public scrollInterval: number = null;
    public slotInterval: number = null;
    public isMonthView: boolean = false;
    public isAllDaySource: boolean = false;
    public direction: string = null;
    public cloneRef: HTMLElement = null;
    public minScrollSpeed: number = 10;
    public minScrollThreshold: number = 100;
    public enableScroll: boolean = true;
    public currentCell: HTMLElement = null;

    public performAutoScrolling(e: MouseEvent | TouchEvent, elementEl: HTMLElement): void {
        const { clientX, clientY } = this.getPointerCoordinates(e);
        if (clientX == null || clientY == null) { return; }

        const nearestContentWrap: HTMLElement = elementEl?.closest(
            `.${CSS_CLASSES.CONTENT_WRAP}, .${CSS_CLASSES.CONTENT_TABLE}, .${CSS_CLASSES.WORK_CELLS_CONTAINER}`);
        const mainContainer: HTMLElement = elementEl?.closest(`.${CSS_CLASSES.SCHEDULER}`)?.querySelector(
            `.${CSS_CLASSES.MAIN_SCROLL_CONTAINER}`);
        const candidates: HTMLElement[] = [nearestContentWrap, mainContainer].filter(Boolean);
        if (candidates.length === 0) { return; }

        const verticalArea: HTMLElement | null = candidates.find((el: HTMLElement) => el.scrollHeight > el.clientHeight) || null;
        const horizontalArea: HTMLElement | null = candidates.find((el: HTMLElement) => el.scrollWidth > el.clientWidth) || null;
        if (!verticalArea && !horizontalArea) { return; }

        const scheduleRoot: HTMLElement | null = (verticalArea || horizontalArea)?.closest(`.${CSS_CLASSES.SCHEDULER}`) ||
            elementEl?.closest(`.${CSS_CLASSES.SCHEDULER}`);
        const headerEl: HTMLElement | null = scheduleRoot?.querySelector(
            `.${CSS_CLASSES.STICKY_HEADER}, .${CSS_CLASSES.HEADER_SECTION}, .${CSS_CLASSES.HEADER_ROW}`
        );
        const vRect: DOMRect | null = verticalArea ? verticalArea.getBoundingClientRect() : null;
        const hRect: DOMRect | null = horizontalArea ? horizontalArea.getBoundingClientRect() : null;
        const topThresholdY: number = headerEl?.getBoundingClientRect().bottom ?? (vRect ? vRect.top : (hRect ? hRect.top : 0));

        if (this.scrollInterval != null) {
            cancelAnimationFrame(this.scrollInterval);
            this.scrollInterval = null;
        }

        const getScrollSpeed: (distance: number, threshold?: number) => number =
            (distance: number, threshold: number = this.minScrollThreshold): number => {
                if (distance > threshold || distance < 0) { return 0; }
                const result: number = Math.floor((1 - distance / threshold) * this.minScrollSpeed);
                return isFinite(result) ? result : 0;
            };

        const getVerticalSpeed: () => number = (): number => {
            let verticalSpeed: number = 0;
            if (verticalArea && vRect) {
                const maxScrollTop: number = Math.max(0, verticalArea.scrollHeight - verticalArea.clientHeight);
                const distanceTop: number = Math.max(0, clientY - topThresholdY);
                const scrollbarHeight: number = Math.max(
                    0, (horizontalArea ? (horizontalArea.offsetHeight - horizontalArea.clientHeight) : 0),
                    (verticalArea ? (verticalArea.offsetHeight - verticalArea.clientHeight) : 0)
                );
                const effectiveBottom: number = vRect.bottom - scrollbarHeight;
                const distanceBottom: number = Math.max(0, effectiveBottom - clientY);
                const bottomThreshold: number = this.minScrollThreshold + scrollbarHeight;
                const isAtTop: boolean = verticalArea.scrollTop <= 0;
                const isAtBottom: boolean = Math.ceil(verticalArea.scrollTop) >= maxScrollTop;
                if (distanceTop < this.minScrollThreshold && !isAtTop) {
                    verticalSpeed = -getScrollSpeed(distanceTop);
                } else if (distanceBottom < bottomThreshold && !isAtBottom) {
                    verticalSpeed = getScrollSpeed(distanceBottom, bottomThreshold);
                }
            }
            return verticalSpeed;
        };

        const getHorizontalSpeed: () => number = (): number => {
            let horizontalSpeed: number = 0;
            if (horizontalArea && hRect) {
                const maxScrollLeft: number = Math.max(0, horizontalArea.scrollWidth - horizontalArea.clientWidth);
                const distanceLeft: number = Math.max(0, clientX - hRect.left);
                const distanceRight: number = Math.max(0, hRect.right - clientX);
                const isAtLeft: boolean = horizontalArea.scrollLeft <= 0;
                const isAtRight: boolean = horizontalArea.scrollLeft >= maxScrollLeft;
                if (distanceLeft < this.minScrollThreshold && !isAtLeft) {
                    horizontalSpeed = -getScrollSpeed(distanceLeft);
                } else if (distanceRight < this.minScrollThreshold && !isAtRight) {
                    horizontalSpeed = getScrollSpeed(distanceRight);
                }
            }
            return horizontalSpeed;
        };

        const verticalSpeed: number = getVerticalSpeed();
        const horizontalSpeed: number = getHorizontalSpeed();

        if (verticalSpeed !== 0 || horizontalSpeed !== 0) {
            const tick: () => void = (): void => {
                let canScroll: boolean = false;
                if (!this.currentCell && CloneBase.currentActionName !== 'resize') { return; }
                if (!this.isAllDaySource) {
                    if (verticalArea && verticalSpeed !== 0) {
                        const maxScrollTop: number = Math.max(0, verticalArea.scrollHeight - verticalArea.clientHeight);
                        const nextTop: number = Math.max(0, Math.min(maxScrollTop, verticalArea.scrollTop + verticalSpeed));
                        if (nextTop !== verticalArea.scrollTop) {
                            verticalArea.scrollTop = nextTop;
                            canScroll = true;
                        }
                    }
                    if (horizontalArea && horizontalSpeed !== 0) {
                        const maxScrollLeft: number = Math.max(0, horizontalArea.scrollWidth - horizontalArea.clientWidth);
                        const nextLeft: number = Math.max(0, Math.min(maxScrollLeft, horizontalArea.scrollLeft + horizontalSpeed));
                        if (nextLeft !== horizontalArea.scrollLeft) {
                            horizontalArea.scrollLeft = nextLeft;
                            canScroll = true;
                        }
                    }
                    if (!canScroll) {
                        if (this.scrollInterval != null) {
                            cancelAnimationFrame(this.scrollInterval);
                            this.scrollInterval = null;
                        }
                        return;
                    }
                    this.scrollInterval = requestAnimationFrame(tick);
                }
            };
            this.scrollInterval = requestAnimationFrame(tick);
        }
    }

    public getPointerCoordinates(nativeEvent: MouseEvent | TouchEvent | undefined): { clientX: number | null; clientY: number | null } {
        if (!nativeEvent) { return { clientX: null, clientY: null }; }
        let clientX: number | null = null;
        let clientY: number | null = null;
        if ((nativeEvent as TouchEvent).touches && (nativeEvent as TouchEvent).touches.length > 0) {
            clientX = (nativeEvent as TouchEvent).touches[0].clientX;
            clientY = (nativeEvent as TouchEvent).touches[0].clientY;
        } else if ((nativeEvent as TouchEvent).changedTouches && (nativeEvent as TouchEvent).changedTouches.length > 0) {
            clientX = (nativeEvent as TouchEvent).changedTouches[0].clientX;
            clientY = (nativeEvent as TouchEvent).changedTouches[0].clientY;
        } else if ((nativeEvent as MouseEvent).clientX != null && (nativeEvent as MouseEvent).clientY != null) {
            clientX = (nativeEvent as MouseEvent).clientX;
            clientY = (nativeEvent as MouseEvent).clientY;
        }
        return { clientX, clientY };
    }

    public getContentWrap(from: HTMLElement | null): HTMLElement | null {
        if (!from) { return null; }
        return from.closest(`.${CSS_CLASSES.CONTENT_WRAP}, .${CSS_CLASSES.CONTENT_TABLE}, .${CSS_CLASSES.WORK_CELLS_CONTAINER}, .${CSS_CLASSES.DATE_HEADER_CONTAINER}`);
    }

    public getCurrentTargetDate(target: HTMLElement | null, cell: HTMLElement | null): number | null {
        if (!target && !cell) { return null; }
        let timeStamp: number = null;
        const root: HTMLElement | null = (target || cell)?.closest(`.${CSS_CLASSES.SCHEDULER}`);
        const allDayRow: HTMLElement | null = cell?.closest(`.${CSS_CLASSES.ALL_DAY_ROW}`);
        if (root && allDayRow && cell) {
            const cells: HTMLElement[] = Array.from(allDayRow.querySelectorAll(`.${CSS_CLASSES.ALL_DAY_CELL}`));
            const currentIndex: number = cells.indexOf(cell);
            const firstRow: HTMLElement | null = root.querySelector(`.${CSS_CLASSES.CONTENT_TABLE}, .${CSS_CLASSES.WORK_CELLS_ROW}`);
            const workCells: HTMLElement[] = firstRow ? (Array.from(firstRow.querySelectorAll(`.${CSS_CLASSES.WORK_CELLS}`))) : [];
            const currentDate: string | null | undefined = workCells[currentIndex as number]?.getAttribute('data-date');
            if (currentDate) { timeStamp = Number(currentDate); }
        }
        return timeStamp;
    }

    private getCell(clientX: number, clientY: number, isPointer: boolean): HTMLElement | null {
        const elements: Element[] = document?.elementsFromPoint(clientX, clientY);
        for (const element of elements) {
            const cell: HTMLElement = element.classList.contains(`${CSS_CLASSES.WORK_CELLS}`) ||
                element.classList.contains(`${CSS_CLASSES.ALL_DAY_CELL}`) ? element as HTMLElement : null;
            if (cell && (isPointer || !this?.isAllDaySource || element.classList.contains(CSS_CLASSES.ALL_DAY_CELL))) {
                return cell;
            }
        }
        return null;
    }

    public getCellUnderPointer(nativeEvent: MouseEvent | TouchEvent): HTMLElement | null {
        const { clientX, clientY } = this.getPointerCoordinates(nativeEvent);
        if (clientX == null || clientY == null) { return null; }
        return this.getCell(clientX, clientY, true);
    }

    public getCellUnderClone(elementRef: HTMLElement | null): HTMLElement | null {
        if (!this.cloneRef || !elementRef) { return null; }
        const container: HTMLElement | null = this.getContentWrap(elementRef);
        const containerRect: DOMRect | undefined = container?.getBoundingClientRect();
        if (!container || !containerRect) { return null; }
        const sanitizeFloat: (value: number, fallback?: number) => number =
            (value: number, fallback: number = 0): number => isFinite(value) ? value : fallback;
        const scrollLeft: number = container.scrollLeft || 0;
        let centerClientX: number = 0;
        let centerClientY: number = 0;
        const allDayRow: HTMLElement | null = container.querySelector(`.${CSS_CLASSES.ALL_DAY_ROW}`);
        if (!allDayRow) { return null; }
        const cells: HTMLElement[] = Array.from(allDayRow.querySelectorAll(`.${CSS_CLASSES.ALL_DAY_CELL}`));
        if (cells.length === 0) { return null; }
        const firstCell: HTMLElement = cells[0];
        const cellDimension: number = Math.max(1, firstCell.offsetWidth || this.cellWidth || 1);
        const offset: number = sanitizeFloat(parseFloat(this.direction === 'rtl' ? this.cloneRef.style.right : this.cloneRef.style.left || '0'), 0);
        const widthFactor: number = Math.max(1, Math.ceil(this.cloneRef.offsetWidth / cellDimension));
        centerClientX = this.direction === 'rtl'
            ? containerRect.right - offset - (this.cloneRef.offsetWidth / widthFactor) + scrollLeft
            : containerRect.left + offset + (this.cloneRef.offsetWidth / widthFactor) - scrollLeft;
        const cellHeight: number = Math.max(0, firstCell.offsetHeight);
        centerClientY = containerRect.top + allDayRow.offsetTop + (cellHeight / 2);
        return this.getCell(centerClientX, centerClientY, false);
    }

    public cloneFromSource(source: HTMLElement, eventDrag?: EventDragProps): HTMLElement {
        const clone: HTMLElement = source.cloneNode(true) as HTMLElement;
        clone.classList.add(
            CSS_CLASSES.DRAG_CLONE,
            CSS_CLASSES.NO_POINTER,
            CSS_CLASSES.POSITION_ABSOLUTE
        );
        if (eventDrag?.externalDragAndDrop) {
            clone.classList.add(CSS_CLASSES.EXTERNAL_DRAG_CLONE, CSS_CLASSES.CONTROL);
            clone.style.zIndex = getZindexPartial(clone).toString();
        }
        return clone;
    }

    public suppressEvent(e: Event): void {
        if (this.isActionPerformed || CloneBase.currentActionName === 'resize') {
            CloneBase.currentActionName = '';
            e?.preventDefault?.();
            e?.stopPropagation?.();
        }
    }

    public addDocSuppressors(): void {
        const events: string[] = ['click'];
        const handler: (e: Event) => void = (e: Event) => this.suppressEvent(e);
        events.forEach((eventType: string) =>
            document?.addEventListener(eventType, handler, true)
        );
        this.removeDocListenersRef = () => {
            if (this.removeDocListenersRef) {
                events.forEach((eventType: string) =>
                    document?.removeEventListener(eventType, handler, true)
                );
                this.removeDocListenersRef = undefined;
            }
        };
    }

    public setCursorClass(cursorType: 'move' | 'notAllowed' | 'default') : void {
        if (!document?.body) { return; }
        document.body.classList.remove(CSS_CLASSES.SCHEDULER_CURSOR_MOVE,
                                       CSS_CLASSES.SCHEDULER_CURSOR_NOT_ALLOWED, CSS_CLASSES.SCHEDULER_CURSOR_DEFAULT);
        if (cursorType === 'move') {
            document.body.classList.add(CSS_CLASSES.SCHEDULER_CURSOR_MOVE);
        } else if (cursorType === 'notAllowed') {
            document.body.classList.add(CSS_CLASSES.SCHEDULER_CURSOR_NOT_ALLOWED);
        } else {
            document.body.classList.add(CSS_CLASSES.SCHEDULER_CURSOR_DEFAULT);
        }
    }

    public getCurrentTargetCell(target: HTMLElement | null) : HTMLElement | null {
        if (!target) { return null; }
        const dateHeaderContainer: HTMLElement | null = target.closest(`.${CSS_CLASSES.DATE_HEADER_CONTAINER}`);
        if (dateHeaderContainer) {
            const headerCell: HTMLElement | null = target.closest(`.${CSS_CLASSES.HEADER_CELLS}`);
            const headerRow: HTMLElement | null = dateHeaderContainer.querySelector(`.${CSS_CLASSES.HEADER_ROW}`);
            const allDayRow: HTMLElement | null = dateHeaderContainer.querySelector(`.${CSS_CLASSES.ALL_DAY_ROW}`);
            if (headerRow && allDayRow) {
                const headerCells: HTMLElement[] = Array.from(headerRow.querySelectorAll(`.${CSS_CLASSES.HEADER_CELLS}`));
                const allDayCells: HTMLElement[] = Array.from(allDayRow.querySelectorAll(`.${CSS_CLASSES.ALL_DAY_CELL}`));
                let index: number = -1;
                if (headerCell) {
                    index = headerCells.indexOf(headerCell);
                } else {
                    for (let i: number = 0; i < headerCells.length; i++) {
                        if (headerCells[i as number].contains(target)) { index = i; break; }
                    }
                }
                if (index >= 0 && allDayCells[index as number]) {
                    return allDayCells[index as number];
                }
                if (allDayCells.length) { return allDayCells[0]; }
            }
        }
        return target.closest(`.${CSS_CLASSES.WORK_CELLS}, .${CSS_CLASSES.DAY_WRAPPER}, .${CSS_CLASSES.ALL_DAY_CELL}`);
    }

    public getSteppedCellDate(startMinutes: number, lastDragEvent: MouseEvent | TouchEvent, durationRef: number, minutesPerPixel: number,
                              cellDateAttr: number, containerEl: HTMLElement): Date {
        const lastEvt: MouseEvent | TouchEvent | undefined = lastDragEvent;
        const coordinates: Point = lastEvt ? this.getPointerCoordinates(lastEvt) : { clientY: null, clientX: null };
        const containerRectSnap: DOMRect | undefined = containerEl?.getBoundingClientRect();
        let computedMinutes: number = cellDateAttr;
        if (containerRectSnap && coordinates.clientY != null && minutesPerPixel > 0) {
            let minutesFromTop: number = Math.max(0, Math.round(((coordinates.clientY - containerRectSnap.top) +
                containerEl.scrollTop) * minutesPerPixel));
            const activeInterval: number = Math.max(0, this.slotInterval || 0);
            if (activeInterval > 0) {
                minutesFromTop = Math.floor(minutesFromTop / activeInterval) * activeInterval;
            }
            const dayStart: Date = new Date(cellDateAttr);
            dayStart.setHours(0, 0, 0, 0);
            computedMinutes = dayStart.getTime() + (startMinutes + minutesFromTop) * MS_PER_MINUTE;
            computedMinutes = computedMinutes - durationRef;
        } else {
            computedMinutes = (cellDateAttr - durationRef);
        }
        return new Date(computedMinutes);
    }
}
