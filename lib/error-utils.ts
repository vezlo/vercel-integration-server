/**
 * Utility functions for extracting and formatting error messages
 */

export interface VercelError {
  response?: {
    status?: number;
    data?: {
      error?: string | { code?: string; message?: string };
      message?: string;
      error_description?: string;
      errors?: Array<{ message?: string; error?: string }>;
    };
  };
  message?: string;
}

/**
 * Extracts a user-friendly error message from Vercel API errors
 */
export function extractVercelErrorMessage(error: VercelError | any): string {
  if (!error) return 'Unknown error';

  // Vercel API error structure: error.response.data.error.message (nested object)
  const errorObj = error.response?.data?.error;
  if (errorObj) {
    if (typeof errorObj === 'object' && errorObj.message) {
      return errorObj.message;
    }
    if (typeof errorObj === 'string') {
      return errorObj;
    }
  }

  // Try other common paths
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error_description) return error.response.data.error_description;
  if (error.message && !error.message.includes('Request failed')) return error.message;

  // Fallback to HTTP status
  const status = error.response?.status;
  return status ? `HTTP ${status} error` : String(error);
}

/**
 * Checks if an error is a conflict error (409 or 400 with ENV_CONFLICT)
 */
export function isConflictError(error: VercelError | any): boolean {
  const status = error.response?.status;
  if (status === 409) return true;
  
  if (status === 400) {
    const errorCode = error.response?.data?.error?.code;
    const errorMessage = error.response?.data?.error?.message;
    return errorCode === 'ENV_CONFLICT' || errorMessage?.includes('already exists');
  }
  
  return false;
}

/**
 * Extracts error message from API response data
 */
export function extractApiErrorMessage(data: any): string {
  if (!data) return 'Deployment failed. Please try again.';

  if (data.message && typeof data.message === 'string') {
    return data.message;
  }

  if (data.error) {
    if (typeof data.error === 'string') return data.error;
    if (data.error.message) return data.error.message;
  }

  if (data.details && Array.isArray(data.details)) {
    const detailsStr = data.details
      .map((d: any) => (d.path ? `${d.path.join('.')}: ${d.message}` : d.message || String(d)))
      .join(', ');
    return `Validation error: ${detailsStr}`;
  }

  return 'Deployment failed. Please try again.';
}

