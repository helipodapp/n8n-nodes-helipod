import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';
import type { Project } from './getProjects';

/** Every environment of every project, shown as "Project / environment". */
export async function getEnvironments(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const projects = (await helipodApiRequest.call(this, 'GET', '/containers/projects')) as Project[];
	const results = projects.flatMap((p) =>
		p.environments
			.map((e) => ({ name: `${p.name} / ${e.name}`, value: e.id }))
			.filter((item) => matchesFilter(filter, item.name, item.value)),
	);
	return { results: sortByName(results) };
}
