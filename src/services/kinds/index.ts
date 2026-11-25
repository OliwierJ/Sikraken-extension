import { FunctionParameter } from '../functionParsing/types';
import { arrayHandler } from './ArrayHandler';
import { pointerHandler } from './PointerHandler';
import { scalarHandler } from './ScalarHandler';
import { ParameterValue, KindHandler, NondetVariable } from './types';

type ParamOf<K extends FunctionParameter['kind']> = Extract<FunctionParameter, { kind: K }>;
type ValueOf<K extends ParameterValue['kind']> = Extract<ParameterValue, { kind: K }>;

export const handlers: { [K in FunctionParameter['kind']]: KindHandler<ParamOf<K>, ValueOf<K>> } = {
	scalar: scalarHandler,
	pointer: pointerHandler,
	array: arrayHandler,
};

export const handlerFor = (p: FunctionParameter) => handlers[p.kind] as unknown as KindHandler<FunctionParameter, ParameterValue>;

const declareSlot = (s: NondetVariable) => 
	`\t${s.declType ? s.declType + ' ' : ''}${s.target} = __VERIFIER_nondet_${s.nondetName}();`;

// Everything the harness body needs for one parameter
export function harnessLines(p: FunctionParameter): string[] {
	const h = handlerFor(p);
	return [...h.declareStorage(p), ...h.nondetInputs(p).map(declareSlot), ...h.buildArgument(p)];
}

// Deduplicated by nondet name, so the same name never gets two prototypes
export function harnessPrototypes(params: FunctionParameter[]): string[] {
	const byName = new Map(params.flatMap((p) => handlerFor(p).nondetInputs(p)).map((s) => [s.nondetName, s.protoType] as const));
	return [...byName].map(([name, type]) => `extern ${type} __VERIFIER_nondet_${name}(void);`);
}
