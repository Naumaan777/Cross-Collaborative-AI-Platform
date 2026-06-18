export interface SafeError {
    message: string;
}

/**
 * Returns true if the exception possesses a valid string message property.
 */
export function isSafeError(error: object | null | undefined): error is SafeError {
    return error !== null && error !== undefined && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}