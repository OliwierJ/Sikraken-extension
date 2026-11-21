import assert from 'assert';
import { FunctionParameter } from '../../services/functionParsing/types';
import { handlerFor } from '../../services/kinds';
import { nondeterministicTemplate } from '../../templates';
import { scalarParam, pointerParam, arrayParam } from '../unit/testHelpers';


suite('Refactor Kind Handlers', () => {
	const generic = (p: FunctionParameter) => {
		const h = handlerFor(p);
		return [
			...h.prelude(p),
			...h.slots(p).map((s) => `\t${s.declType ? s.declType + ' ' : ''}${s.target} = __VERIFIER_nondet_${s.nondetName}();`),
			...h.epilogue(p),
		].join('\n');
	};

	[scalarParam('int', 'a'), 
        pointerParam('int*', 'p', 'int'), 
        arrayParam('int[3]', 'arr', 'int', 3), 
        arrayParam('char[4]', 's', 'char', 4)
    ].forEach((p, index) =>
		test(`harness parity ${index}: ${p.kind} ${p.name} ${p.type}`, () => assert.strictEqual(generic(p), nondeterministicTemplate(p))),
	);

});
