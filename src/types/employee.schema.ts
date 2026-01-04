
import * as z from 'zod';
import { DATE_FORMAT } from '@/lib/utils';
import { isValid, parse } from 'date-fns';

const dateStringSchema = z.string().refine(val => val === '' || isValid(parse(val, DATE_FORMAT, new Date())), {
    message: `Invalid date format. Please use ${DATE_FORMAT} or leave it empty.`,
});

const documentSchema = z.object({
  type: z.enum(['Passport', 'Seaman Book', 'Certificate']),
  name: z.string().optional(),
  certificateTypeId: z.string().optional(),
  issueDate: dateStringSchema.optional(),
  expiryDate: dateStringSchema.optional(),
}).refine(data => {
    if (data.type === 'Certificate') {
        return !!data.certificateTypeId;
    }
    return !!data.name;
}, {
    message: 'Name or Certificate Type is required.',
    path: ['name'],
});

// Base schema for fields common to both types
export const baseEmployeeSchema = z.object({
    personalInfo: z.object({
        firstName: z.string().min(1, 'First name is required.'),
        lastName: z.string().min(1, 'Last name is required.'),
        dateOfBirth: dateStringSchema.optional(),
        nationalId: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.object({ name: z.string().optional(), relationship: z.string().optional(), phone: z.string().optional() }).optional(),
    }),
    contactInfo: z.object({
        phone: z.string().optional(),
        email: z.string().email('Invalid email address.').optional().or(z.literal('')),
    }),
    financeInfo: z.object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        socialSecurity: z.object({ has: z.boolean(), hospitalId: z.string().optional() }).optional(),
    }),
    positionIds: z.array(z.string()).min(1, 'At least one position must be selected.'),
    skillTags: z.string().optional(),
    employmentStatus: z.enum(['Active', 'Inactive', 'Terminated']),
    documents: z.array(documentSchema).optional(),
});

// Schema specific to Office employees
export const officeEmployeeSchema = baseEmployeeSchema.extend({
    employeeType: z.literal('OFFICE'),
    orgLevel: z.enum(['STAFF', 'MANAGER', 'EXECUTIVE']),
    createUser: z.boolean(),
    userEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
}).refine(data => {
    if (data.createUser && !data.userEmail) {
        return false;
    }
    return true;
}, {
    message: 'Email is required to create a user account.',
    path: ['userEmail'],
});

// Schema for Field employees
export const fieldEmployeeSchema = baseEmployeeSchema.extend({
    employeeType: z.literal('FIELD'),
});

// Export the specific form schemas. Using a discriminated union at the top level was causing module evaluation errors.
// By exporting separated schemas, the form component can decide which one to use based on context props.
export const officeEmployeeFormSchema = officeEmployeeSchema;
export const fieldEmployeeFormSchema = fieldEmployeeSchema;

export type EmployeeFormData = z.infer<typeof officeEmployeeSchema> | z.infer<typeof fieldEmployeeSchema>;
