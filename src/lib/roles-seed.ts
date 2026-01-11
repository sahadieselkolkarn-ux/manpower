
'use client';
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ROLES_SEED_DATA } from './roles';
import { Firestore } from 'firebase/firestore';

/**
 * Ensures that the standard roles defined in the application are present in the Firestore database.
 * This function is idempotent and safe to run multiple times. It will only add roles that are missing
 * and ensure existing standard roles are protected.
 * @param db The Firestore instance.
 * @returns A promise that resolves when the operation is complete.
 */
export async function ensureStandardRolesSeeded(db: Firestore) {
  if (!db) {
    console.error("ensureStandardRolesSeeded: Firestore instance is not available.");
    return;
  }

  console.log("Checking for standard roles in the database...");

  try {
    const rolesRef = collection(db, 'roles');
    const existingRolesSnap = await getDocs(rolesRef);
    const existingRoles = new Map(existingRolesSnap.docs.map(d => [d.id, d.data()]));

    const batch = writeBatch(db);
    let writesMade = 0;

    for (const roleData of ROLES_SEED_DATA) {
      const docId = roleData.code; // Use the code as the stable document ID
      const roleRef = doc(db, 'roles', docId);
      const existingRole = existingRoles.get(docId);

      if (!existingRole) {
        // Role does not exist, create it with protection
        console.log(`Seeding new standard role: ${roleData.code}`);
        batch.set(roleRef, {
          ...roleData,
          isProtected: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        writesMade++;
      } else if (existingRole.isProtected !== true) {
        // Role exists but isn't protected, update it
        console.log(`Protecting existing standard role: ${roleData.code}`);
        batch.update(roleRef, {
          isProtected: true,
          updatedAt: serverTimestamp(),
        });
        writesMade++;
      }
    }

    if (writesMade > 0) {
      await batch.commit();
      console.log(`${writesMade} standard role(s) seeded/protected successfully.`);
    } else {
      console.log("All standard roles are already present and protected.");
    }
  } catch (error) {
    console.error("Error during role seeding:", error);
    // We don't re-throw here to avoid crashing the app if seeding fails.
  }
}
