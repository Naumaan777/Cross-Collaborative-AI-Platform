export interface SafeError {
    message: string;
}

/** valid string message */
export function isSafeError(error: object | null | undefined): error is SafeError {
    return error !== null && error !== undefined && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}