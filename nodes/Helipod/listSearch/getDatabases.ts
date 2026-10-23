import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';

type Database = { id: string; name: string; region?: string; status: string };

export async function getDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const list = (await helipodApiRequest.call(this, 'GET', '/databases')) as Database[];
	const results = list
		.filter((d) => matchesFilter(filter, d.name, d.id))
		.map((d) => ({ name: `${d.name}${d.region ? ` (${d.region})` : ''}`, value: d.id }));
	return { results: sortByName(results) };
}
