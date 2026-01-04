
import { Employee } from "@/types/employee";
import { PersonType } from "@/types/tax";

export function getPersonKey(type: Employee['employeeType'], id: string): string {
    const prefix = type === 'OFFICE' ? 'OFFICE' : 'MP';
    return `${prefix}:${id}`;
}

export function parsePersonKey(personKey: string): { personType: PersonType, personRefId: string } {
    if (personKey.includes(':')) {
        const [prefix, personRefId] = personKey.split(':');
        if (prefix !== 'OFFICE' && prefix !== 'MP') {
            throw new Error(`Invalid personKey format: incorrect prefix in "${personKey}"`);
        }
        return {
            personType: prefix as PersonType,
            personRefId
        };
    } else {
        if (personKey.startsWith('OFFICE')) {
            return {
                personType: 'OFFICE',
                personRefId: personKey.substring('OFFICE'.length)
            };
        }
        if (personKey.startsWith('MP')) {
            return {
                personType: 'MP',
                personRefId: personKey.substring('MP'.length)
            };
        }
        throw new Error(`Invalid personKey format: no valid prefix found in "${personKey}"`);
    }
}
