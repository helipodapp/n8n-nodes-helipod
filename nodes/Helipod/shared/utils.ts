import type {
	IDataObject,
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeListSearchItems,
} from 'n8n-workflow';

/** Responses are { success, data }: the node outputs `data` (a list becomes one item per element). */
export const unwrapData = {
	output: {
		postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }],
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
