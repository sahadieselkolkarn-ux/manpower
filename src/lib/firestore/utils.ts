

// A file for generic Firestore utility functions

/**
 * Recursively removes keys with `undefined` values from an object.
 * This is crucial before sending data to Firestore, as it rejects `undefined`.
 * It also removes keys of nested objects that become empty after cleaning.
 *
 * @param obj The object to sanitize.
 * @returns A new object with `undefined` values removed.
 */
export function removeUndefineds<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefineds(item)) as any;
  }

  // Firestore Timestamps, Dates, and other non-plain objects should be kept as is.
  if (typeof obj !== 'object' || obj instanceof Date || (obj as any).constructor.name === 'Timestamp') {
    return obj;
  }

  const newObj = { ...obj } as { [key: string]: any };

  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      const value = newObj[key];
      if (value === undefined) {
        delete newObj[key];
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date) && (value as any).constructor.name !== 'Timestamp') {
        const cleanedValue = removeUndefineds(value);
        // If a nested object becomes empty after cleaning, remove it.
        if (Object.keys(cleanedValue).length === 0 && !Array.isArray(cleanedValue)) {
            delete newObj[key];
        } else {
            newObj[key] = cleanedValue;
        }
      }
    }
  }

  return newObj as T;
}
