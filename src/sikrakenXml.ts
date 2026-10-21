const inputElementPattern = /<input>\s*([\s\S]*?)\s*<\/input>/g;

export function extractTestInputs(xml: string): string[] {
	return Array.from(xml.matchAll(inputElementPattern), match => match[1].trim());
}
