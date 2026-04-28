/** Filter clause that excludes soft-deleted rows. */
export const notDeleted = { deletedAt: null } as const;

/** Returns current timestamp for a soft-delete operation. */
export const softDeleteData = () => ({ deletedAt: new Date() });

/** Clears the soft-delete timestamp (restore operation). */
export const restoreData = () => ({ deletedAt: null });
