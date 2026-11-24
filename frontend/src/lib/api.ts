import { httpsCallable, type HttpsCallableOptions, type HttpsCallableResult } from 'firebase/functions';
import { getFunctionsService } from './firebase';
import type { Callables, CallableName } from '../shared/types';

const callableCache = new Map<string, any>();

export async function callFunction<T extends CallableName>(
  name: T,
  data: Callables[T]['req'],
  options?: HttpsCallableOptions
): Promise<Callables[T]['res']> {
  try {
    const functions = getFunctionsService();
    
    if (!callableCache.has(name)) {
      callableCache.set(name, httpsCallable(functions, name, options));
    }
    
    const fn = callableCache.get(name);
    const result = await fn(data);
    return result.data as Callables[T]['res'];
  } catch (error) {
    // Extract Firebase Cloud Functions error details
    const message = extractErrorMessage(error);
    console.error(`Error calling ${name}:`, error, `-> ${message}`);
    throw new Error(message);
  }
}

function extractErrorMessage(error: any): string {
  // Handle Firebase HttpsCallableError
  if (error?.code && error?.message) {
    // Format: "functions/error-code: Error message"
    if (error.details) {
      // Check for details with reason
      if (error.details.reason) {
        return `${error.message} (${error.details.reason})`;
      }
      return `${error.message} (${JSON.stringify(error.details)})`;
    }
    return error.message;
  }

  // Handle standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Handle unknown
  return String(error);
}

export async function submitLetter(pairId: string, body: string, letterId?: string) {
  return callFunction('submitLetter', { pairId, body, ...(letterId === undefined ? {} : { letterId }) });
}

export async function reviewLetter(
  letterId: string,
  action: 'approve' | 'return',
  note?: string
) {
  return callFunction('reviewLetter', { letterId, action, ...(note === undefined ? {} : { note }) });
}

export async function reportPair(pairId: string, reason: string) {
  return callFunction('reportPair', { pairId, reason });
}

export async function adminCreatePair(studentUid: string, palUid: string) {
  return callFunction('adminCreatePair', { studentUid, palUid });
}

export async function adminApproveUser(uid: string, role: 'student' | 'pal' | 'officer' | 'admin') {
  return callFunction('adminApproveUser', { uid, role });
}

export async function adminSetRole(uid: string, role: 'student' | 'pal' | 'officer' | 'admin') {
  return callFunction('adminSetRole', { uid, role });
}

export async function adminUnpausePair(pairId: string) {
  return callFunction('adminUnpausePair', { pairId });
}

export async function signOutEverywhere() {
  return callFunction('signOutEverywhere', {});
}
