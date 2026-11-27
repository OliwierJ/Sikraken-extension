const inputElementPattern = /<input>\s*([\s\S]*?)\s*<\/input>/g;
const nondeterministicVariablePattern = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

export function extractNondeterministicVariables(source: string): string[] {
	return Array.from(source.matchAll(nondeterministicVariablePattern), (match) => match[1]);
}

export function parseTestInputsXML(xml: string): string[] {
	return Array.from(xml.matchAll(inputElementPattern), (match) => match[1].trim());
}
