import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';

export type Project = {
	id: string;
	name: string;
	description: string | null;
	environments: Array<{ id: string; name: string }>;
};

export async function getProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const projects = (await helipodApiRequest.call(this, 'GET', '/containers/projects')) as Project[];
	return {
		results: sortByName(
			projects
				.filter((p) => matchesFilter(filter, p.name, p.id))
				.map((p) => ({ name: p.name, value: p.id })),
		),
	};
}
