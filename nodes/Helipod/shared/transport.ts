import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const API_BASE_URL = 'https://api.helipod.io/api';

/** One call to the Helipod public API with the selected credential. Returns the `data` of { success, data }. */
export async function helipodApiRequest(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
): Promise<unknown> {
	const authentication = this.getNodeParameter('authentication', 0) as string;
	const credentialType = authentication === 'oAuth2' ? 'helipodOAuth2Api' : 'helipodApi';
	const options: IHttpRequestOptions = {
		method,
		url: `${API_BASE_URL}${path}`,
		qs,
		json: true,
	};
	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialType,
		options,
	)) as { data: unknown };
	return response.data;
}
