import { FunctionParameter } from '../functionParsing/types';
import { arrayHandler } from './ArrayHandler';
import { pointerHandler } from './PointerHandler';
import { scalarHandler } from './ScalarHandler';
import { ParameterValue, KindHandler } from './types';

type ParamOf<K extends FunctionParameter['kind']> = Extract<FunctionParameter, { kind: K }>;
type ValueOf<K extends ParameterValue['kind']> = Extract<ParameterValue, { kind: K }>;

export const handlers: { [K in FunctionParameter['kind']]: KindHandler<ParamOf<K>, ValueOf<K>> } = {
	scalar: scalarHandler,
	pointer: pointerHandler,
	array: arrayHandler,
};

export const handlerFor = (p: FunctionParameter) => 
    handlers[p.kind] as unknown as KindHandler<FunctionParameter, ParameterValue>;
