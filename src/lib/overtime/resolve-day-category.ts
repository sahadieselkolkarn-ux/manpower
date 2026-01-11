
'use client';

import { getDay } from 'date-fns';
import { DayCategory } from '@/types/timesheet';

export interface WeekendSettings {
    saturday: boolean;
    sunday: boolean;
}

export interface OvertimeSettings {
    weekend: WeekendSettings,
    onshore: { normalHours: number, otDivisor: number },
    offshore: { normalHours: number, otDivisor: number }
}


/**
 * Determines the category of a given day (Workday, Weekend, or Holiday).
 * Holidays have the highest priority.
 *
 * @param dateISO The date to check, in 'YYYY-MM-DD' format.
 * @param weekendCfg The configuration for which days are considered weekends.
 * @param holidayDatesISO An array of holiday dates in 'YYYY-MM-DD' format.
 * @returns The category of the day.
 */
export function resolveDayCategory(
    dateISO: string,
    weekendCfg: WeekendSettings,
    holidayDatesISO: string[]
): DayCategory {
    // 1. Check if it's a contract/public holiday
    if (holidayDatesISO.includes(dateISO)) {
        return 'CONTRACT_HOLIDAY';
    }
    
    // 2. Check if it's a weekend
    const date = new Date(dateISO);
    const dayOfWeek = getDay(date); // Sunday is 0, Saturday is 6
    
    if ((dayOfWeek === 6 && weekendCfg.saturday) || (dayOfWeek === 0 && weekendCfg.sunday)) {
        return 'WEEKLY_HOLIDAY';
    }

    // 3. Otherwise, it's a normal workday
    return 'WORKDAY';
}
