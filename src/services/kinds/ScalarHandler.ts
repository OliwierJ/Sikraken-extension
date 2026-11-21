import { ScalarParameter } from '../functionParsing/types';
import { KindHandler, ParameterValue } from './types';

// Extract the specific ParameterValue type for scalars where kind is 'scalar'
type ScalarValue = Extract<ParameterValue, { kind: 'scalar' }>;

export const scalarHandler: KindHandler<ScalarParameter, ScalarValue> = {

	slots: (p) => [{ nondetName: p.nondeterministicName, protoType: p.baseType, target: p.name, declType: p.type }],

	prelude: () => [],

	epilogue: () => [],

	decode: (p, [raw]) => ({
		kind: 'scalar',
		value: p.baseType === 'char' ? formatCharacterInput(raw) : raw,
	}),

	replay: (p, v) => ({
		setupCode: [],
		argument: p.baseType === 'char' ? validateCharacterLiteral(v.value, p.name) : validateScalarLiteral(v.value, p.name, p.type),
	}),
};

export function formatCharacterInput(value: string): string {
	const numericValue = Number(value);
	if (!Number.isInteger(numericValue) || numericValue < 32 || numericValue > 126) {
		return value;
	}

	const character = String.fromCharCode(numericValue);
	if (character === "'" || character === '\\') {
		return `'\\${character}'`;
	}

	return `'${character}'`;
}

export function validateCharacterLiteral(value: string, parameterName: string): string {
	if (/^'(?:[^'\\]|\\.)'$/.test(value.trim())) {
		return value.trim();
	}

	return validateScalarLiteral(value, parameterName, 'char');
}

export function validateScalarLiteral(value: string, parameterName: string, type: string): string {
	const normalized = value.trim().toLowerCase();
	const isFloatingPoint = /\b(float|double)\b/.test(type);

	if (isFloatingPoint) {
		if (normalized === 'nan' || normalized === '+nan' || normalized === '-nan') {
			return 'NAN';
		}

		if (normalized === 'inf' || normalized === '+inf' || normalized === 'infinity' || normalized === '+infinity') {
			return 'INFINITY';
		}

		if (normalized === '-inf' || normalized === '-infinity') {
			return '-INFINITY';
		}
	}

	const literalPattern = /^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+)(?:[uUlLfF]*)$/;
	if (!literalPattern.test(value.trim())) {
		throw new Error(`Unsupported generated value for parameter ${parameterName}: ${value}`);
	}

	return value.trim();
}
