import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';

type Vps = {
	id: string;
	name: string | null;
	hostname: string | null;
	status: string;
	publicIp: string | null;
};

export async function getVpsList(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const list = (await helipodApiRequest.call(this, 'GET', '/vps')) as Vps[];
	const results = list
		.filter((v) => v.status !== 'terminated')
		.filter((v) => matchesFilter(filter, v.name, v.hostname, v.publicIp, v.id))
		.map((v) => ({
			name: `${v.name || v.hostname || v.id}${v.publicIp ? ` (${v.publicIp})` : ''}`,
			value: v.id,
		}));
	return { results: sortByName(results) };
}
