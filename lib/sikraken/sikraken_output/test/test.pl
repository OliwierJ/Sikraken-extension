prolog_c([function(spec([], int), function(Sample_function, [param(spec([], int), A), param(spec([], int), B)]), [], 
cmp_stmts([
if_stmt(branch(1, op(>, A, B)), 
cmp_stmts([
return_stmt(minus_op(A, B))

]) , 
cmp_stmts([
return_stmt(minus_op(B, A))

]))
])), 
function(spec([], int), function(Main, []), [], 
cmp_stmts([
declaration(spec([], int), [initialised(Result, function_call(Sample_function, [int(10), int(5)]))]), 
return_stmt(int(0))

]))
]).