import { ArrayParameter } from '../functionParsing/types';
import { formatCharacterInput, validateCharacterLiteral, validateScalarLiteral } from './literals';
import { KindHandler, ParameterValue } from './types';

type ArrayValue = Extract<ParameterValue, { kind: 'array' }>;

export const arrayHandler: KindHandler<ArrayParameter, ArrayValue> = {
	slots: (p) =>
		Array.from({ length: p.inputLength }, (_, i) => ({
			nondetName: p.elementNondeterministicName,
			protoType: p.elementBaseType,
			target: `${p.name}[${i}]`,
		})),

	prelude: (p) => [`\t${p.elementType} ${p.name}[${p.length}];`],

	epilogue: (p) => (p.isString ? [`\t${p.name}[${p.length - 1}] = '\\0';`] : []),

	decode: (p, raw) => ({
		kind: 'array',
		values: p.isString ? raw.map(formatCharacterInput) : raw,
	}),

	replay: (p, v) => {
		if (v.values.length !== p.inputLength) {
			throw new Error(`Array parameter ${p.name} requires ${p.inputLength} values, ` + `but received ${v.values.length}.`);
		}

		const arrayValues = v.values.map((value) => {
			return p.isString ? validateCharacterLiteral(value, p.name) : validateScalarLiteral(value, p.name, p.elementType);
		});

		const setupCodeLines: string[] = [];
		const argumentsList: string[] = [];
		setupCodeLines.push(
			p.isString
				? `${p.elementType} ${p.name}[${p.length}] = { ${arrayValues.join(', ')}, '\\0' };`
				: `${p.elementType} ${p.name}[${p.length}] = { ${arrayValues.join(', ')} };`,
		);
		argumentsList.push(p.name);
		return { setupCode: setupCodeLines, argument: argumentsList.join(', ') };
	},
};
