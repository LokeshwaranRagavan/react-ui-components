import { isNullOrUndefined } from '@syncfusion/react-base';

/**
 * Calendar functionalities
 */


/** @private */
export interface CalendarUtil {
    firstDateOfMonth(date: Date): Date;
    lastDateOfMonth(date: Date): Date;
    isMonthStart(date: Date): boolean;
    getLeapYearDaysCount(): number;
    getYearDaysCount(date: Date, interval: number): number;
    getMonthDaysCount(date: Date): number;
    getDate(date: Date): number;
    getMonth(date: Date): number;
    getFullYear(date: Date): number;
    getYearLastDate(date: Date, interval: number): Date;
    getMonthStartDate(date: Date): Date;
    getMonthEndDate(date: Date): Date;
    getExpectedDays(date: Date, days: number[]): number[];
    setDate(dateObj: Date, date: number): void;
    setValidDate(date1: Date, interval: number, startDate: number, month?: number, date2?: Date): void;
    setMonth(date: Date, interval: number, startDate: number): void;
    addYears(date: Date, interval: number, month: number): void;
    isSameMonth(date1: Date, date2: Date): boolean;
    checkMonth(date: Date, months: number[]): boolean;
    compareMonth(date1: Date, date2: Date): boolean;
    isSameYear(date1: Date, date2: Date): boolean;
    isLastMonth(date: Date): boolean;
    isLeapYear(year: number, interval: number): boolean;
}

/** @private */
export class Gregorian implements CalendarUtil {
    public firstDateOfMonth(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth());
    }
    public lastDateOfMonth(dt: Date): Date {
        return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    }
    public isMonthStart(date: Date): boolean {
        return (date.getDate() === 1);
    }
    public getLeapYearDaysCount(): number {
        return 366;
    }
    public getYearDaysCount(date: Date, interval: number): number {
        return ((date.getFullYear() + interval) % 4 === 0) ? 366 : 365;
    }
    public getDate(date: Date): number {
        return date.getDate();
    }
    public getMonth(date: Date): number {
        return (date.getMonth() + 1);
    }
    public getFullYear(date: Date): number {
        return date.getFullYear();
    }
    public getYearLastDate(date: Date, interval: number): Date {
        return new Date(date.getFullYear() + interval, 0, 0);
    }
    public getMonthDaysCount(date: Date): number {
        return this.lastDateOfMonth(date).getDate();
    }
    public getMonthStartDate(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), 1, date.getHours(), date.getMinutes());
    }
    public getMonthEndDate(date: Date): Date {
        date.setDate(1);
        return new Date(date.setMonth(date.getMonth() + 1));
    }
    public getExpectedDays(_date: Date, days: number[]): number[] {
        return days;
    }
    public setDate(dateObj: Date, date: number): void {
        dateObj.setDate(date);
    }
    public setValidDate(date: Date, interval: number, startDate: number, monthValue?: number, beginDate?: Date): void {
        if (!isNullOrUndefined(beginDate)) {
            date.setMonth(monthValue + interval);
        } else {
            date.setMonth(date.getMonth() + interval, startDate);
        }
    }
    public setMonth(date: Date, interval: number, startDate: number): void {
        date.setDate(1);
        date.setFullYear(date.getFullYear());
        date.setMonth(interval - 1);
        const maxDay: number = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(startDate, maxDay));
    }
    public addYears(date: Date, interval: number): void {
        date.setFullYear(date.getFullYear() + interval);
    }
    public isSameMonth(date1: Date, date2: Date): boolean {
        return (date1.getMonth() === date2.getMonth());
    }
    public checkMonth(date: Date, months: number[]): boolean {
        return (months.indexOf(date.getMonth() + 1) === -1);
    }
    public compareMonth(date1: Date, date2: Date): boolean {
        return (date1.getMonth() > date2.getMonth());
    }
    public isSameYear(date1: Date, date2: Date): boolean {
        return (date1.getFullYear() === date2.getFullYear());
    }
    public isLastMonth(date: Date): boolean {
        return (date.getMonth() === 11);
    }
    public isLeapYear(year: number, interval: number): boolean {
        return ((year + interval) % 4 === 0);
    }
}
