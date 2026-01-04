
import { Employee } from "@/types/employee";
import { PersonType } from "@/types/tax";

export function getPersonKey(type: Employee['employeeType'], id: string): string {
    const prefix = type === 'OFFICE' ? 'OFFICE' : 'MP';
    return `${prefix}:${id}`;
}

export function parsePersonKey(personKey: string): { personType: PersonType, personRefId: string } {
    const [prefix, personRefId] = personKey.split(':');
    if (prefix !== 'OFFICE' && prefix !== 'MP') {
        throw new Error('Invalid personKey format');
    }
    return {
        personType: prefix as PersonType,
        personRefId
    };
}

    