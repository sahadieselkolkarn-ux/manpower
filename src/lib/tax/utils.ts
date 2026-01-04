

'use client';

import { Employee } from "@/types/employee";
import { PersonType } from "@/types/tax";

/**
 * Creates a standardized personKey string.
 * @param type The person's type, 'OFFICE' or 'MP'.
 * @param id The employee's Firestore document ID.
 * @returns A string in the format "TYPE:id".
 */
export function getPersonKey(type: Employee['employeeType'], id: string): string {
    const prefix = type === 'OFFICE' ? 'OFFICE' : 'MP';
    return `${prefix}:${id}`;
}


/**
 * Safely parses a raw, potentially URL-encoded personKey string into its constituent parts.
 * This function is designed to NEVER throw an error.
 * It handles undefined, null, empty strings, and invalid URI components gracefully.
 * It accepts prefixes: OFFICE, MP, FIELD (maps to MP)
 * It accepts formats with or without a colon.
 *
 * @param rawPersonKey The key to parse, likely from a URL parameter.
 * @returns An object with personType ('OFFICE' | 'MP'), personRefId (doc id), and the canonical key, or null if invalid.
 */
export function parsePersonKey(rawPersonKey: string | null | undefined): { personType: PersonType, personRefId: string, canonicalPersonKey: string } | null {
    if (!rawPersonKey) {
        return null;
    }

    let key: string;
    try {
        key = decodeURIComponent(rawPersonKey);
    } catch (e) {
        // If decoding fails, it's a malformed URI component. Treat as invalid.
        console.error("Failed to decode personKey:", rawPersonKey, e);
        return null;
    }

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
        prefix = 'FIELD'; // Legacy prefix
        personRefId = key.substring('FIELD'.length);
    } else {
        return null; // No recognized prefix
    }

    if (!prefix || !personRefId) {
        return null; // ID or prefix part is missing
    }

    if (prefix.toUpperCase() === 'OFFICE') {
        personType = 'OFFICE';
    } else if (prefix.toUpperCase() === 'MP' || prefix.toUpperCase() === 'FIELD') {
        personType = 'MP';
    } else {
        return null; // Unrecognized prefix after all checks
    }

    // Always return the canonical key format using the normalized personType ('MP', not 'FIELD')
    const canonicalPersonKey = `${personType}:${personRefId}`;

    return { personType, personRefId, canonicalPersonKey };
}
