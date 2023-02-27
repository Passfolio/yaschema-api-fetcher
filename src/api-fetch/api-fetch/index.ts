import _ from 'lodash';
import type { SingleOrArray, ValidationMode } from 'yaschema';
import type { AnyStringSerializableType, HttpApi } from 'yaschema-api';

import { getFetch } from '../../config/fetch';
import { getDefaultRequestValidationMode, getDefaultResponseValidationMode } from '../../config/validation-mode';
import type { ApiRequest } from '../../types/ApiRequest';
import type { ApiFetchResult } from '../types/ApiFetchResult';
import { generateApiFetchResultFromFetchResponse } from './generate-api-fetch-result-from-fetch-response';
import { FetchRequirementsError, generateFetchRequirementsFromApiFetchRequest } from './generate-fetch-requirements-from-api-fetch-request';
import { isUnsupportedHttpResponseType } from './is-unsupported-http-response-type';

export interface ApiFetchOptions {
  /**
   * Override the configured request validation mode.
   *
   * @see `setDefaultRequestValidationMode`
   */
  requestValidationMode?: ValidationMode;
  /**
   * Override the configured response validation mode.
   *
   * Hard validation is always performed on responses statuses, regardless of this setting.
   *
   * @see `setDefaultResponseValidationMode`
   */
  responseValidationMode?: ValidationMode;
  /** Options that can be used to supplement / override those passed to `fetch` by default */
  fetchOptions?: RequestInit;
}

/** Uses `fetch` to access the specified API */
export const apiFetch = async <
  ReqHeadersT extends Record<string, AnyStringSerializableType>,
  ReqParamsT extends Record<string, AnyStringSerializableType>,
  ReqQueryT extends Record<string, SingleOrArray<AnyStringSerializableType>>,
  ReqBodyT,
  ResStatusT extends number,
  ResHeadersT extends Record<string, AnyStringSerializableType>,
  ResBodyT,
  ErrResStatusT extends number,
  ErrResHeadersT extends Record<string, AnyStringSerializableType>,
  ErrResBodyT
>(
  api: HttpApi<ReqHeadersT, ReqParamsT, ReqQueryT, ReqBodyT, ResStatusT, ResHeadersT, ResBodyT, ErrResStatusT, ErrResHeadersT, ErrResBodyT>,
  req: ApiRequest<ReqHeadersT, ReqParamsT, ReqQueryT, ReqBodyT>,
  {
    requestValidationMode = getDefaultRequestValidationMode(),
    responseValidationMode = getDefaultResponseValidationMode(),
    fetchOptions
  }: ApiFetchOptions = {}
): Promise<ApiFetchResult<ResStatusT, ResHeadersT, ResBodyT, ErrResStatusT, ErrResHeadersT, ErrResBodyT>> => {
  // TODO: add wrapper support
  const responseType = api.responseType ?? 'json';
  if (responseType !== 'dynamic' && isUnsupportedHttpResponseType(responseType)) {
    throw new Error(`Unsupported HTTP response type (${responseType}) encountered for ${api.url}`);
  }

  try {
    const { url, headers, body } = await generateFetchRequirementsFromApiFetchRequest(api, req, { validationMode: requestValidationMode });

    const fetch = getFetch();
    const fetchRes = await fetch(url, {
      method: api.method,
      credentials: api.credentials,
      headers,
      body,
      ...fetchOptions
    });

    return generateApiFetchResultFromFetchResponse(api, req, { fetchRes, validationMode: responseValidationMode });
  } catch (e) {
    if (e instanceof FetchRequirementsError) {
      return { ok: false, error: e.message };
    } else {
      throw e;
    }
  }
};
