const nondeterministicVariablePattern = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

export function extractNondeterministicVariables(source: string): string[] {
	return Array.from(source.matchAll(nondeterministicVariablePattern), match => match[1]);
}
