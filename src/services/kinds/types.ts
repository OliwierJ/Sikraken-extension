import { FunctionParameter } from '../functionParsing/types';

export type Slot = {
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
	slots(p: P): Slot[];
	prelude(p: P): string[];
	epilogue(p: P): string[];
	decode(p: P, raw: string[]): V;
	replay(p: P, v: V): { setupCode: string[]; argument: string };
}
