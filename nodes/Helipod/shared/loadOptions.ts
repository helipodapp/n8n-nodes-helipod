import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { helipodApiRequest } from './transport';

type Model = { code: string; name: string; sunset?: string | null };
type ImageModel = Model & { description?: string; sizes: Array<{ size: string; price: number }> };
type Plan = {
	id: string;
	name: string;
	description?: string;
	effectiveMonthly?: number;
	osTemplates?: string[];
};
type Template = { slug: string; name: string; description?: string; services?: string[] };

const byName = (a: INodePropertyOptions, b: INodePropertyOptions) => a.name.localeCompare(b.name);

/** Chat models of the AI gateway with the price this account pays. */
export async function getChatModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const data = (await helipodApiRequest.call(this, 'GET', '/ai/models')) as { models: Model[] };
	return data.models
		.filter((m) => !m.sunset)
		.map((m) => ({ name: m.name, value: m.code, description: m.code }))
		.sort(byName);
}

export async function getImageModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const data = (await helipodApiRequest.call(this, 'GET', '/ai/models')) as {
		imageModels: ImageModel[];
	};
	return data.imageModels
		.filter((m) => !m.sunset)
		.map((m) => ({
			name: m.name,
			value: m.code,
			description:
				`${m.description ?? ''} From Rp ${Math.min(...m.sizes.map((s) => s.price)).toLocaleString('en-US')} per image`.trim(),
		}))
		.sort(byName);
}

/** VPS plans with the monthly price this account pays. */
export async function getVpsPlans(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const plans = (await helipodApiRequest.call(this, 'GET', '/vps/plans')) as Plan[];
	return plans
		.map((p) => ({
			name: `${p.name}${p.effectiveMonthly ? ` (Rp ${p.effectiveMonthly.toLocaleString('en-US')}/month)` : ''}`,
			value: p.id,
			description: p.description,
		}))
		.sort(byName);
}

/** The OS templates of the VPS plan chosen in "Plan". */
export async function getVpsOsTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const planId = this.getCurrentNodeParameter('planId') as string | undefined;
	if (!planId) return [];
	const plans = (await helipodApiRequest.call(this, 'GET', '/vps/plans')) as Plan[];
	const plan = plans.find((p) => p.id === planId);
	return (plan?.osTemplates ?? []).map((t) => ({ name: t, value: t })).sort(byName);
}

/** One-click templates (n8n, WordPress, Postgres, ...). */
export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const list = (await helipodApiRequest.call(this, 'GET', '/containers/templates')) as Template[];
	return list
		.map((t) => ({ name: t.name, value: t.slug, description: t.description }))
		.sort(byName);
}
