import { FunctionParameter } from '../functionParsing/types';

export type NondetVariable = {
	nondetName: string; // 'int', 'ulong', ...
	protoType: string; // type used in `extern T __VERIFIER_nondet_X(void);`
	target: string; // lvalue assigned by the harness
	declType?: string; // present => emit "declType target = nondet();", absent => plain assignment
};

export type ParameterValue =
	|   { kind: 'scalar'; value: string }
	|   { kind: 'pointer'; value: string }
	|   { kind: 'array'; values: string[] };


export interface KindHandler<P extends FunctionParameter, V extends ParameterValue> {
	// Harness generation
	nondetInputs(p: P): NondetVariable[];
	declareStorage(p: P): string[];
	buildArgument(p: P): string[];

	// Parsing SIKRAKEN output
	valueFromTokens(p: P, raw: string[]): V;

	// Generated tests and input evaluator
	testArgument(p: P, v: V): { setupCode: string[]; argument: string };
}
