prolog_c([
declaration(spec([extern], int), [function(UC___VERIFIER_nondet_int, [])]), 
function(spec([], int), function(Main, []), [], 
cmp_stmts([
declaration(spec([], int), [initialised(X, function_call(UC___VERIFIER_nondet_int, []))]), 
if_stmt(branch(1, op(>, X, int(0))), 
cmp_stmts([
expr_stmt(prepostfix(postfix, X, 1))
]) )
]))
]).