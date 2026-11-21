import { ScalarParameter } from '../functionParsing/types';
import { formatCharacterInput, validateCharacterLiteral, validateScalarLiteral } from './literals';
import { KindHandler, ParameterValue } from './types';

// Extract the specific ParameterValue type for scalars where kind is 'scalar'
type ScalarValue = Extract<ParameterValue, { kind: 'scalar' }>;

export const scalarHandler: KindHandler<ScalarParameter, ScalarValue> = {

	nondetInputs: (p) => [{ nondetName: p.nondeterministicName, protoType: p.baseType, target: p.name, declType: p.type }],

	declareStorage: () => [],

	buildArgument: () => [],

	valueFromTokens: (p, [raw]) => ({
		kind: 'scalar',
		value: p.baseType === 'char' ? formatCharacterInput(raw) : raw,
	}),

	testArgument: (p, v) => ({
		setupCode: [],
		argument: p.baseType === 'char' ? validateCharacterLiteral(v.value, p.name) : validateScalarLiteral(v.value, p.name, p.type),
	}),
};