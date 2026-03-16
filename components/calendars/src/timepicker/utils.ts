export const getTimeValue: (time: Date | null) => number = (time: Date | null): number => {
    if (!time) {
        return -1;
    }
    return time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds();
};

export const isSameCalendarDay: Function = (a: Date, b: Date): boolean => {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
};

export const isTimeWithinRange: (time: Date, minTime: Date | null | undefined, maxTime: Date | null | undefined) => boolean =
    (time: Date, minTime: Date | null | undefined, maxTime: Date | null | undefined): boolean => {
        if (!minTime && !maxTime) {
            return true;
        }
        const t: number = getTimeValue(time);
        const hasMin: boolean = !!minTime;
        const hasMax: boolean = !!maxTime;
        const min: number = hasMin ? getTimeValue(minTime as Date) : -1;
        const max: number = hasMax ? getTimeValue(maxTime as Date) : -1;
        if (hasMin && hasMax) {
            const sameDay: boolean = isSameCalendarDay(minTime as Date, maxTime as Date);
            if (sameDay) {
                if (min === max) {
                    return t === min;
                }
                if (min > max) {
                    return false;
                }
                return t >= min && t <= max;
            }
            if (min === max) {
                return t === min;
            }
            if (min > max) {
                return t >= min || t <= max;
            }
            return t >= min && t <= max;
        }

        if (hasMin) {
            return t >= min;
        }
        if (hasMax) {
            return t <= max;
        }

        return true;
    };



export const filterTimesByRange: (
    times: Date[],
    minTime?: Date | null,
    maxTime?: Date | null
) => Date[] = (times: Date[], minTime: Date | null | undefined, maxTime: Date | null | undefined) => {
    if (!minTime && !maxTime) {
        return times;
    }
    return times.filter((t: Date) => isTimeWithinRange(t, minTime ?? null, maxTime ?? null));
};


export const clampTimeToRange: (
    time: Date,
    minTime?: Date | null,
    maxTime?: Date | null
) => Date | null = (
    time: Date,
    minTime?: Date | null,
    maxTime?: Date | null
) => {
    const hasMin: boolean = !!minTime;
    const hasMax: boolean = !!maxTime;
    if (!hasMin && !hasMax) {
        return time;
    }

    const t: number = getTimeValue(time);
    const min: number = hasMin ? getTimeValue(minTime as Date) : -1;
    const max: number = hasMax ? getTimeValue(maxTime as Date) : Number.MAX_SAFE_INTEGER;
    if (hasMin && hasMax && isSameCalendarDay(minTime as Date, maxTime as Date) && min > max) {
        return null;
    }
    if (hasMin && t < min) {
        const mt: Date = minTime as Date;
        const clamped: Date = new Date(time);
        clamped.setHours(mt.getHours(), mt.getMinutes(), mt.getSeconds(), 0);
        return clamped;
    }
    if (hasMax && t > max) {
        const mt: Date = maxTime as Date;
        const clamped: Date = new Date(time);
        clamped.setHours(mt.getHours(), mt.getMinutes(), mt.getSeconds(), 0);
        return clamped;
    }
    if (hasMin && hasMax && min > max && t > max && t < min) {
        const toMin: number = min - t;
        const toMax: number = t - max;
        const boundary: Date = toMin <= toMax ? (minTime as Date) : (maxTime as Date);
        const clamped: Date = new Date(time);
        clamped.setHours(boundary.getHours(), boundary.getMinutes(), boundary.getSeconds(), 0);
        return clamped;
    }
    return time;
};
