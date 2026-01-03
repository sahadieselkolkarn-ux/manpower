
import { type Timestamp } from 'firebase/firestore';

export interface Holiday {
  date: Timestamp;
  name: string;
  type: "PUBLIC" | "COMPANY";
  isSubstitution?: boolean;
}

export interface HolidayCalendar {
  id: string; // e.g. "TH-2024"
  calendarId: string;
  year: number;
  locale: "TH";
  name: string;
  holidays: Holiday[];
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}
