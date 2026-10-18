import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { helipodApiRequest } from '../shared/transport';
import { matchesFilter, sortByName } from '../shared/utils';
import type { Project } from './getProjects';

type Service = { id: string; name: string };

/** Every service of every project environment, shown as "Project / environment / service". */
export async function getServices(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const projects = (await helipodApiRequest.call(this, 'GET', '/containers/projects')) as Project[];
	const environments = projects.flatMap((p) =>
		p.environments.map((e) => ({ label: `${p.name} / ${e.name}`, id: e.id })),
	);
	const lists = await Promise.all(
		environments.map(async (e) => {
			const services = (await helipodApiRequest.call(
				this,
				'GET',
				`/containers/environments/${e.id}/services`,
			)) as Service[];
			return services.map((s) => ({ name: `${e.label} / ${s.name}`, value: s.id }));
		}),
	);
	const results = lists.flat().filter((item) => matchesFilter(filter, item.name, item.value));
	return { results: sortByName(results) };
}
