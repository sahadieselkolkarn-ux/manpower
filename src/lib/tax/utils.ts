
import { Employee } from "@/types/employee";
import { PersonType } from "@/types/tax";

/**
 * Creates a standardized personKey string.
 * @param type The person's type, 'OFFICE' or 'MP' (for FIELD).
 * @param id The employee's Firestore document ID.
 * @returns A string in the format "TYPE:id".
 */
export function getPersonKey(type: Employee['employeeType'], id: string): string {
    const prefix = type === 'OFFICE' ? 'OFFICE' : 'MP';
    return `${prefix}:${id}`;
}

/**
 * Parses a raw, potentially URL-encoded personKey string into its constituent parts.
 * Gracefully handles formats with or without a colon, and with or without URL encoding.
 * e.g., "OFFICE:123", "OFFICE123", "OFFICE%3A123"
 * @param rawPersonKey The key to parse, likely from a URL parameter.
 * @returns An object with personType and personRefId.
 * @throws An error if the format is invalid.
 */
export function parsePersonKey(rawPersonKey: string): { personType: PersonType, personRefId: string } {
    const key = decodeURIComponent(rawPersonKey);

    if (key.includes(':')) {
        const [prefix, personRefId] = key.split(':', 2);
        if (prefix !== 'OFFICE' && prefix !== 'MP') {
            throw new Error(`Invalid personKey format: incorrect prefix in "${key}"`);
        }
        return {
            personType: prefix as PersonType,
            personRefId
        };
    } else {
        if (key.startsWith('OFFICE')) {
            return {
                personType: 'OFFICE',
                personRefId: key.substring('OFFICE'.length)
            };
        }
        if (key.startsWith('MP')) {
            return {
                personType: 'MP',
                personRefId: key.substring('MP'.length)
            };
        }
        // Fallback for just an ID, assuming it's a manpower employee if no prefix
        // This is a defensive measure, but ideally keys should always have prefixes.
        if (!isNaN(Date.parse(key)) && key.length < 10) { // Unlikely to be a plain ID
             throw new Error(`Invalid personKey format: ambiguous key "${key}"`);
        }
         // If it's just a string, it's likely a doc ID for a manpower employee based on legacy logic
         console.warn(`Ambiguous personKey format "${key}". Assuming Manpower employee.`);
         return {
            personType: 'MP',
            personRefId: key
         }
    }
}
