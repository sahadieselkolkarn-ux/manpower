
'use client';
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ROLES_SEED_DATA } from './roles';
import { Firestore } from 'firebase/firestore';

/**
 * Ensures that the standard roles defined in the application are present in the Firestore database.
 * This function is idempotent and safe to run multiple times. It will only add roles that are missing.
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
    const existingRoleCodes = new Set(existingRolesSnap.docs.map(d => d.id));

    const batch = writeBatch(db);
    let writesMade = 0;

    for (const roleData of ROLES_SEED_DATA) {
      const docId = roleData.code; // Use the code as the stable document ID
      if (!existingRoleCodes.has(docId)) {
        console.log(`Seeding new standard role: ${roleData.code}`);
        const roleRef = doc(db, 'roles', docId);
        batch.set(roleRef, {
          ...roleData,
          isProtected: true, // Mark seeded roles as protected
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        writesMade++;
      }
    }

    if (writesMade > 0) {
      await batch.commit();
      console.log(`${writesMade} standard role(s) seeded successfully.`);
    } else {
      console.log("All standard roles are already present.");
    }
  } catch (error) {
    console.error("Error during role seeding:", error);
    // We don't re-throw here to avoid crashing the app if seeding fails.
  }
}
