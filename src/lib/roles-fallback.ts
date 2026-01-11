
'use client';
import { ROLES_SEED_DATA } from '@/lib/roles'
import { Role } from '@/types/user'

export function getFallbackRoles(): Role[] {
    return ROLES_SEED_DATA.map(r => ({
      id: r.code,            // Use code as id to match what Firestore uses (docId = code)
      name: r.name,
      code: r.code,
      department: r.department,
      level: r.level,
      description: r.description,
      isSystem: r.isSystem,
      isProtected: false,    // Don't lock standard roles as per new requirement
    }));
  }
