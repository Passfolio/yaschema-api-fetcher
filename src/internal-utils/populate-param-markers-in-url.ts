import type { AnyStringSerializableType } from 'yaschema-api';

/** Replaces param markers, like `{…}`, with values from params.  These will be URI encoded.  If parameter values are missing, this throws
 * an error. */
export const populateParamMarkersInUrl = (url: string, params: Record<string, AnyStringSerializableType>) =>
  url.replace(/\{([^}]+)\}/g, (_match, paramName) => {
    const value = params[paramName as string];
    if (value === undefined) {
      throw new Error(`Missing param value for ${paramName as string}`);
    }
    return encodeURIComponent(String(value));
  });
