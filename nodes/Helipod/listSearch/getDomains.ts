import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';

type Domain = { id: number; domainName: string; status: string };

export async function getDomains(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domains = (await helipodApiRequest.call(this, 'GET', '/domains/mine')) as Domain[];
	const results = domains
		.filter((d) => matchesFilter(filter, d.domainName))
		.map((d) => ({ name: d.domainName, value: String(d.id) }));
	return { results: sortByName(results) };
}
