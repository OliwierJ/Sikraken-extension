import { PointerParameter } from "../functionParsing/types";
import { validateScalarLiteral } from "./literals";
import { KindHandler, ParameterValue } from "./types";

type PointerValue = Extract<ParameterValue, { kind: 'pointer' }>;

export const pointerHandler: KindHandler<PointerParameter, PointerValue> = {
	
    slots: (p) => [
		{ nondetName: p.pointeeNondeterministicName, protoType: p.pointeeBaseType, target: `${p.name}_SIK_storage`, declType: p.pointeeType },
		{ nondetName: 'int', protoType: 'int', target: p.nullIndicatorName, declType: 'int' },
	],
	
    prelude: () => [],
	
    epilogue: (p) => [`\t${p.type.trim()} ${p.name} = ${p.nullIndicatorName} ? NULL : &${p.name}_SIK_storage;`],
	
    decode: (_p, [value, isNull]) => ({ kind: 'pointer', value: isNull === '0' ? value : 'NULL' }),
	
    replay: (p, v) =>
		v.value === 'NULL'
			? { setupCode: [`${p.type.trim()} ${p.name} = NULL;`], argument: p.name }
			: {
					setupCode: [
						`${p.pointeeType} ${p.name}_SIK_storage = ${validateScalarLiteral(v.value, p.name, p.pointeeType)};`,
						`${p.type.trim()} ${p.name} = &${p.name}_SIK_storage;`,
					],
					argument: p.name,
				},
};
