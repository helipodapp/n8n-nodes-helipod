import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
	INodeListSearchItems,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * postReceive step every operation starts with. Requests are sent with ignoreHttpStatusErrors, so an error answer
 * arrives here: it becomes a node error with the API's own message and code (n8n's default error only says "Bad
 * request"). A success answer { success, data } becomes one item per element of `data`, one item for an object,
 * and one empty item for null (for example Get Backup while backups are off).
 */
export async function unwrapResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = response?.statusCode ?? 200;
	const body = (response?.body ?? items[0]?.json) as IDataObject | string | undefined;
	const envelope = body && typeof body === 'object' ? body : undefined;
	if (status >= 400 || envelope?.success === false) {
		const message =
			typeof envelope?.error === 'string' && envelope.error
				? envelope.error
				: `The Helipod API answered HTTP ${status}`;
		throw new NodeApiError(
			this.getNode(),
			(envelope ?? { body: String(body ?? '') }) as JsonObject,
			{
				message,
				description:
					typeof envelope?.code === 'string' ? `Error code: ${envelope.code}` : undefined,
				httpCode: String(status),
				itemIndex: this.getItemIndex(),
			},
		);
	}
	const data = envelope && 'data' in envelope ? envelope.data : body;
	if (Array.isArray(data)) return data.map((json) => ({ json: json as IDataObject }));
	if (data && typeof data === 'object') return [{ json: data as IDataObject }];
	if (data === null || data === undefined) return [{ json: {} }];
	return [{ json: { value: data } }];
}

/** Responses are { success, data }: the node outputs `data` (a list becomes one item per element). */
export const unwrapData = {
	output: {
		postReceive: [unwrapResponse],
	},
};

/** Search filter for the "From list" pickers: matches any of the given texts, case-insensitive. */
export function matchesFilter(
	filter: string | undefined,
	...texts: Array<string | null | undefined>
) {
	if (!filter) return true;
	const needle = filter.toLowerCase();
	return texts.some((text) => (text ?? '').toLowerCase().includes(needle));
}

export function sortByName(items: INodeListSearchItems[]) {
	return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Return All / Limit for list operations. The Helipod list endpoints return the whole list in one response,
 * so the limit is applied to the output.
 */
export function returnAllOrLimit(show: {
	resource: string[];
	operation: string[];
}): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			routing: { output: { maxResults: '={{$value}}' } },
		},
	];
}

export function simplifyOption(show: { resource: string[]; operation: string[] }): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		displayOptions: { show },
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	};
}

/** postReceive step: when Simplify is on, keep only the given fields of each item. */
export function simplifyTo(fields: string[]) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
	): Promise<INodeExecutionData[]> {
		if (!this.getNodeParameter('simplify', true)) return items;
		return items.map((item) => {
			const json: IDataObject = {};
			for (const field of fields) {
				if (item.json[field] !== undefined) json[field] = item.json[field];
			}
			return { ...item, json };
		});
	};
}

/**
 * preSend step: an Idempotency-Key for paid requests the API requires one for. Stable for one item of one run of
 * this node in one execution (a "Retry On Fail" returns the first result instead of charging twice), different for
 * every other item, loop run and execution.
 */
export async function idempotencyKey(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const itemIndex = this.getItemIndex();
	const proxy = this.getWorkflowDataProxy(itemIndex) as unknown as { $runIndex?: number };
	const executionId = this.getExecutionId() || `manual-${Date.now()}`;
	const key = `n8n-${executionId}-${this.getNode().id}-${proxy.$runIndex ?? 0}-${itemIndex}`;
	requestOptions.headers = {
		...(requestOptions.headers ?? {}),
		'Idempotency-Key': key.slice(0, 128),
	};
	return requestOptions;
}

/** A "Dry Run" switch: true sends ?dryRun=true, so the API only returns the price and changes nothing. */
export function dryRunOption(
	show: { resource: string[]; operation: string[] },
	what: string,
): INodeProperties {
	return {
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		displayOptions: { show },
		default: false,
		description: `Whether to only return the price, without ${what} or charging anything`,
		routing: {
			send: { type: 'query', property: 'dryRun', value: '={{ $value ? "true" : undefined }}' },
		},
	};
}

/** postReceive step: one output item per element of the array at `field` of the response data. */
export function itemsFrom(field: string) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
	): Promise<INodeExecutionData[]> {
		return items.flatMap((item) => {
			const list = item.json[field];
			return Array.isArray(list) ? list.map((json) => ({ json: json as IDataObject })) : [item];
		});
	};
}
