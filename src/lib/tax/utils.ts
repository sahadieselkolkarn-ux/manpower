
'use client';

import { Employee } from "@/types/employee";
import { PersonType } from "@/types/tax";

/**
 * Creates a standardized personKey string.
 * @param type The person's type, 'OFFICE' or 'FIELD'. The function normalizes 'FIELD' to 'MP'.
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
 * e.g., "OFFICE:123", "OFFICE123", "OFFICE%3A123", "FIELD:456"
 * @param rawPersonKey The key to parse, likely from a URL parameter.
 * @returns An object with personType ('OFFICE' | 'MP'), personRefId (doc id), and the canonical key.
 * @throws An error if the format is invalid.
 */
export function parsePersonKey(rawPersonKey: string): { personType: PersonType, personRefId: string, canonicalPersonKey: string } {
    const key = decodeURIComponent(rawPersonKey);
    let prefix: string;
    let personRefId: string;
    let personType: PersonType;

    if (key.includes(':')) {
        [prefix, personRefId] = key.split(':', 2);
    } else if (key.startsWith('OFFICE')) {
        prefix = 'OFFICE';
        personRefId = key.substring('OFFICE'.length);
    } else if (key.startsWith('MP')) {
        prefix = 'MP';
        personRefId = key.substring('MP'.length);
    } else if (key.startsWith('FIELD')) {
        prefix = 'FIELD';
        personRefId = key.substring('FIELD'.length);
    } else {
         throw new Error(`Invalid personKey format: does not contain a recognized prefix in "${key}"`);
    }

    if (!personRefId) {
        throw new Error(`Invalid personKey format: ID part is missing in "${key}"`);
    }

    if (prefix === 'OFFICE') {
        personType = 'OFFICE';
    } else if (prefix === 'MP' || prefix === 'FIELD') {
        personType = 'MP';
    } else {
        throw new Error(`Invalid personKey format: unrecognized prefix "${prefix}"`);
    }
    
    const canonicalPersonKey = `${personType}:${personRefId}`;

    return { personType, personRefId, canonicalPersonKey };
}
