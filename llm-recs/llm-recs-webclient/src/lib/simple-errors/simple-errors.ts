
export interface AbstractErrorResponse {
  error: unknown;
}

export interface ErrorResponse {
  error: string;
}

export function isErrorResponse<T, E extends AbstractErrorResponse>(
  response: T | E
): response is E {
  if ((response as E).error) {
    return true;
  }
  return false;
}

export function assertNoErrorResponse<T, E extends AbstractErrorResponse>(
  response: T | E
): asserts response is T {
  if ((response as E).error) {
    throw new Error('response was an error after all');
  }
}
