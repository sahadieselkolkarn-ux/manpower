

'use client';
import * as z from 'zod';
import { DATE_FORMAT } from '@/lib/utils';
import { isValid, parse } from 'date-fns';

const dateStringSchema = z.string().refine(val => val && isValid(parse(val, DATE_FORMAT, new Date())), {
    message: `Required and must be in ${DATE_FORMAT} format.`
});

const numberInString = z.string().transform(val => val ? Number(val) : undefined).optional();

const emptyStringToUndefined = z.string().transform(val => val === "" ? undefined : val);

const baseDataSchema = z.object({
  personal: z.object({
    taxId: z.string().min(13, 'Tax ID must be 13 digits.').max(13, 'Tax ID must be 13 digits.'),
    address: z.object({
      building: z.string().optional(),
      roomNo: z.string().optional(),
      floor: z.string().optional(),
      village: z.string().optional(),
      houseNo: z.string().min(1, 'House No. is required.'),
      moo: z.string().optional(),
      soi: z.string().optional(),
      road: z.string().optional(),
      subDistrict: z.string().min(1, 'Sub-district is required.'),
      district: z.string().min(1, 'District is required.'),
      province: z.string().min(1, 'Province is required.'),
      postalCode: z.string().min(5, 'Postal code must be 5 digits.').max(5, 'Postal code must be 5 digits.'),
    }),
  }),
  marital: z.object({
    status: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED']),
    marriedDuringYear: z.boolean().optional(),
    spouseHasIncome: z.boolean().optional(),
  }),
  children: z.object({
    totalCount: z.coerce.number().optional(),
    allowance30kCount: z.coerce.number().optional(),
    allowance60kCount: z.coerce.number().optional(),
  }).optional(),
  parents: z.object({
      self: z.object({ father: z.boolean().optional(), mother: z.boolean().optional() }).optional(),
      spouse: z.object({ father: z.boolean().optional(), mother: z.boolean().optional() }).optional(),
  }).optional(),
  disability: z.object({
    dependentsCount: z.coerce.number().optional(),
  }).optional(),
  insuranceAndFunds: z.object({
      lifeInsuranceAmount: z.coerce.number().optional(),
      healthInsuranceAmount: z.coerce.number().optional(),
      selfParentsHealthInsuranceAmount: z.coerce.number().optional(),
      spouseParentsHealthInsuranceAmount: z.coerce.number().optional(),
      providentFundAmount: z.coerce.number().optional(),
      governmentPensionFundAmount: z.coerce.number().optional(),
      nationalSavingsFundAmount: z.coerce.number().optional(),
      rmfAmount: z.coerce.number().optional(),
      ltfAmount: z.coerce.number().optional(),
  }).optional(),
  otherDeductions: z.object({
    homeLoanInterestAmount: z.coerce.number().optional(),
    socialSecurityAmount: z.coerce.number().optional(),
    educationDonationAmount: z.coerce.number().optional(),
    otherDonationAmount: z.coerce.number().optional(),
    otherDonationDescription: z.string().optional(),
  }).optional(),
});


export const ly01FormSchema = z.object({
  data: baseDataSchema,
  declaredDate: dateStringSchema.optional().or(z.literal('')),
  verifiedBySelf: z.boolean().optional(),
});


export type Ly01FormData = z.infer<typeof ly01FormSchema>;
