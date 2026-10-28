% BEGIN LICENSE BLOCK
% Version: CMPL 1.1
%
% The contents of this file are subject to the Cisco-style Mozilla Public
% License Version 1.1 (the "License"); you may not use this file except
% in compliance with the License.  You may obtain a copy of the License
% at www.eclipseclp.org/license.
% 
% Software distributed under the License is distributed on an "AS IS"
% basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.  See
% the License for the specific language governing rights and limitations
% under the License. 
% 
% The Original Code is  MDD-based Constraints for ECLiPSe
% The Initial Developer of the Original Code is  Joachim Schimpf
% Portions created by the Initial Developer are
% Copyright (C) 2009 - 2017 Joachim Schimpf
% 
% Contributor(s): Joachim Schimpf
% 
% END LICENSE BLOCK


%:- comment(summary, "Extensional constraints ..."). % in parent file
:- comment(categories, ["Constraints"]).
:- comment(author, "Joachim Schimpf").
:- comment(copyright, "Joachim Schimpf, Coninfer Ltd").
:- comment(date, "$Date: 2017/09/28 22:43:43 $").


:- lib(hash).
:- lib(graph_algorithms).
:- use_module(mdd_support).
:- use_module(sparse_set).


%----------------------------------------------------------------------
% MDD-based arc consistency, using the algorithm from
% 
% Cheng,Yap:
%    Maintaining Generalized Arc Consistency on Ad Hoc r-Ary Constraints
%    CP 2008
%----------------------------------------------------------------------

:- comment(mddc/2, [
    amode: mddc(?,++),
    args: ["Tuple": "A collection of finite domain variables",
	   "MDD": "A graph (multi-valued decision diagram)"],
    summary: "The variables in Tuple only take values allowed by the given multi-valued decision diagram MDD",
    kind:[constraint:[root:[ic,fd]]],
    desc: html("<P>\
    This constraint is defined extensionally via a multi-valued decision
    diagram (MDD), which in turn is represented as a graph (in the format
    of library(graph_algorithms)).
    <P>
    The MDD is a compact encoding of all valid tuples X1,..,XN, and must
    be constructed as follows:
    <UL> 
    <LI>The graph nodes are numbered 1..M, where M is the number of nodes.
    <LI>Node M is the root node (the unique source node).
    <LI>Node 1 is the 'true' node (the unique sink node).
    <LI>Each node is labelled with a variable index between 1 and N
	(apart from the true-node, which is labelled with 0).  All
	nodes on the same level must have the same index label.
    <LI>Edges lead from the root node towards the true-node.  On each path
    	from root to true, each variable index is encountered exactly once,
	and in the same order on every path.
    <LI>If a path traverses a node annotated with i, and the outgoing edge is
    	annotated with value j, then X[i]=j in the tuple defined by this path.
    <LI>Each path from root to true defines one valid tuple.
    </UL> 
    <P>
    Declaratively, the variables in Tuple are constrained to take only
    values allowed by the decision diagram, i.e. corresponding to paths 
    from the root to the true-node.  Operationally, the constraint
    maintains arc-consistency, i.e. it keeps removing all domain values
    that can no longer be part of a solution.
    <P>
    Tuple can be a collection expression as understood by eval_to_list/2;
    if uninstantiated, it will be bound to a list.
    <P>
    The implementation uses the algorithm from Cheng&Yap: Maintaining
    Generalized Arc Consistency on Ad Hoc r-Ary Constraints, CP 2008.
"),
    see_also:[library(graph_algorithms),graph_algorithms:make_graph/3,table/2],
    eg:"
    % ------------------------------------------------------------
    % Example 1
    % ------------------------------------------------------------

    % To allow the tuples [1,1,1], [1,2,3] and [3,3,3] we use the
    % following decision diagram (where (1)-(6) are node numbers):
    %
    %       (6)        X[1]
    %       / \\
    %      1   3
    %     /     \\
    %    (4)   (5)     X[2]
    %    |  \\    |
    %    1   2   3
    %    |    \\  |
    %    (2)   (3)     X[3]
    %     \\     /
    %      1   3
    %       \\ /
    %       (1)        true

    :- lib(ic).		% or lib(fd)
    :- lib(ic_mdd).	% or lib(fd_mdd)
    :- lib(graph_algorithms).

    % Make a graph describing the MDD

    sample_mdd(MDD) :-
        make_graph(6, [                  % Edges: e(FromNode,ToNode,EdgeValue)
                e(6,4,1), e(6,5,3),
                e(4,2,1), e(4,3,2), e(5,3,3),
                e(2,1,1), e(3,1,3)
            ], MDD),
        Nodez = [](0,3,3,2,2,1),         % Variable index for node (1) to (6)
        graph_set_nodenames(MDD, Nodez).


    % Sample run:

    ?- sample_mdd(MDD), mddc(Xs, MDD), labeling(Xs).
    Xs = [1, 1, 1]
    MDD = graph(...)
    Yes (0.00s cpu, solution 1, maybe more)

    Xs = [1, 2, 3]
    MDD = graph(...)
    Yes (0.00s cpu, solution 2, maybe more)

    Xs = [3, 3, 3]
    MDD = graph(...)
    Yes (0.00s cpu, solution 3)


    % ------------------------------------------------------------
    % Example 2
    % ------------------------------------------------------------

    :- lib(ic).		% or lib(fd)
    :- lib(ic_mdd).	% or lib(fd_mdd)
    :- lib(mdd_support).

    crossword :-
        dim(Grid, [4,4]),
        words4(Words),

        % constrain rows and columns to be words
        sort(Words, WordsOrdered),
        ordered_tuples_to_mdd(WordsOrdered, MDD),

        ( for(I,1,4), param(Grid,MDD) do
            mddc(Grid[I,*], MDD),
            mddc(Grid[*,I], MDD)
        ),

        % find solution(s)
        labeling(Grid),

        % print result
        ( foreachelem(Char,Grid,[_,J]) do
            ( J==1 -> nl ; put(0' ) ), put(Char)
        ).

    % List of allowed words
    % Note: `aloe` is the same as the list [0'a, 0'l, 0'o, 0'e], which
    % is the same as the list of character codes [97, 108, 111, 101]
    words4([`aloe`, `back`, `bash`, `soil`, `help`, `kelp`, `luck`]).


    % Sample run:
    ?- crossword.

    b a s h
    a l o e
    s o i l
    h e l p
"]).


:- local struct(mddc_state(
    	mdd,	% graph representing MDD
	no	% set of nodes known to lead to failure in current state
    )).

:- export mddc/2.
mddc(Xc, G) :-
	eval_to_array(Xc, Xz),
	mdd_hull(G, Xz),
	mddc_setup(G, MDDC),
	call_priority(mddc_prop(Xz, MDDC, _Susp), 2).
	
mddc_setup(G, mddc_state{mdd:G,no:No}) :-
	graph_get_maxnode(G, NN),
	ss_create(NN, No).

:- demon(mddc_prop/3).
:- set_flag(mddc_prop/3, priority, 5).
:- set_flag(mddc_prop/3, run_priority, 2).
mddc_prop(Xz, Mddc, Susp) :-
	Mddc = mddc_state{mdd:G,no:No},
	hash_create(Yes),
	arity(Xz, N),
	dim(Supported, [N]),
	( foreacharg(SuppI,Supported) do hash_create(SuppI) ),
	% count of unsupported domain values
	(
	    foreacharg(X,Xz),
	    fromto(0,S1,S2,S3),		% count domain sizes
	    fromto(0,N1,N2,NVars3)	% count variables
	do
	    ( var(X) ->
		N2 is N1+1, S2 is S1 + get_domain_size(X)
	    ;
		N2 = N1, S2 is S1+1
	    )
	),
	graph_get_maxnode(G, Root),
	mddc_seek_supports(Xz, G, Yes, No, Supported, Root, S3, S4, Result),
	Result==true,	% may fail
	( S4>0 ->
	    trim_domains(Xz, Supported, NVars3, NVars)
	;
	    NVars=NVars3	% no unsupported values, nothing to prune
	),
	( NVars < 2 ->
	    kill_suspension(Susp)
	; var(Susp) ->
	    suspend(mddc_prop(Xz, Mddc, Susp), 0, Xz->any, Susp)
	;
	    true % resuspend
	).

trim_domains(Xz, Supported, NVars0, NVars) :-
	(
	    foreacharg(X,Xz,K),
	    fromto(NVars0,NVars1,NVars2,NVars),
	    param(Supported)
	do
	    ( var(X) ->
		arg(K, Supported, SuppK),
		hash_keys(SuppK, SupportedDomain),
		X :: SupportedDomain,
		% if we just grounded this variable, decrement
		( var(X) -> NVars1 = NVars2 ; NVars2 is NVars1-1 )
	    ;
		% Here it's guaranteed that SupportedDomain = [X]
		%arg(K, Supported, SuppK),
		%hash_keys(SuppK, SupportedDomain),
		%( SupportedDomain == [X] -> true ; abort ),
		NVars1 = NVars2
	    )
	).


mddc_seek_supports(Xz, G, Yes, No, Supported, NodeNr, S0, S4, Result) :-
	( NodeNr == 1 ->	% true-node
	    S4 = S0, Result = true
	; S0 == 0 ->
	    S4 = S0, Result = true
	; hash_contains(Yes, NodeNr) ->
	    S4 = S0, Result = true
	; ss_in(NodeNr, No) ->
	    S4 = S0, Result = false
	;
	    graph_get_adjacent_edges(G, NodeNr, Edges),
	    node_to_nodename(G, NodeNr, K),
	    arg(K, Xz, X),
	    (
		foreach(e(_,SubNodeNr,Val),Edges),
		fromto(S0,S1,S3,S4),	% remaining unsupported domain values
		param(K,X,Xz,G,Yes,No,Sup,Supported)
	    do
		( S1 == 0 ->
		    S3 = S1
	    	; not_unify(Val, X) ->
		    S3 = S1
		;
		    mddc_seek_supports(Xz, G, Yes, No, Supported, SubNodeNr, S1, S2, SubResult),
		    ( SubResult == true ->
			Sup = yes,
			arg(K, Supported, SuppK),
			( hash_insert(SuppK, Val, []) ->
			    S3 is S2-1
			    % ,( S3 == 0 -> writeln(early) ; true )
			    % ,( S3 < 0 -> abort ; true )
			;
			    % K-Val already in Supported
			    S3 = S2
			)
		    ;
			S3 = S2
		    )
		)
	    ),
	    ( Sup == yes ->
	    	hash_add(Yes, NodeNr, []),
		Result = true
	    ;
	    	ss_add(No, NodeNr),
		Result = false
	    )
	).


:- if(current_predicate((&::)/2)).

% Initial constraint setup: collect full domains
mdd_hull(G, Xz) :-
	hash_create(Seen),
	hash_set(Seen, 1, []),
	mdd_depth(G, N),
	dim(Xz, [N]),
	dim(Vz, [N]),
	( foreacharg(V,Vz) do hash_create(V) ),
	graph_get_maxnode(G, Root),
	mdd_hull(G, Root, Seen, Vz),
	( for(I,1,N), param(Xz,Vz) do
	    arg(I, Xz, X),
	    arg(I, Vz, V),
	    hash_keys(V, Domain),
	    X &:: Domain
	).

    mdd_hull(G, From, Seen, Vz) :-
	( hash_insert(Seen, From, []) ->
	    node_to_nodename(G, From, K),
	    graph_get_adjacent_edges(G, From, Edges),
	    arg(K, Vz, VK),
	    (
		foreach(e(_From,To,Val),Edges),
		param(G,Seen,Vz,VK)
	    do
		hash_set(VK, Val, []),
		mdd_hull(G, To, Seen, Vz)
	    )
	;
	    true	% node already seen
	).

:- else.

% Initial constraint setup: determine bounds only
mdd_hull(G, Xz) :-
	hash_create(Seen),
	hash_set(Seen, 1, []),
	mdd_depth(G, N),
	dim(Xz, [N]),
	dim(Lz, [N]),
	dim(Hz, [N]),
	( foreacharg(1.0Inf,Lz) do true ),
	( foreacharg(-1.0Inf,Hz) do true ),
	graph_get_maxnode(G, Root),
	mdd_hull(G, Root, Seen, Lz, Hz),
	( for(I,1,N), param(Xz,Lz,Hz) do
	    arg(I, Xz, X),
	    arg(I, Lz, L),
	    arg(I, Hz, H),
	    X :: L..H
	).

    mdd_hull(G, From, Seen, Lz, Hz) :-
	( hash_insert(Seen, From, []) ->
	    node_to_nodename(G, From, K),
	    graph_get_adjacent_edges(G, From, Edges),
	    (
		foreach(e(_From,To,Val),Edges),
		param(G,Seen,Lz,Hz,K)
	    do
		( Val<arg(K,Lz) -> setarg(K, Lz, Val) ; true ),
		( Val>arg(K,Hz) -> setarg(K, Hz, Val) ; true ),
		mdd_hull(G, To, Seen, Lz, Hz)
	    )
	;
	    true	% node already seen
	).
:- endif.

mdd_depth(G, D) :-
	graph_get_maxnode(G, Root),
	mdd_depth(G, 0, D, Root).

    mdd_depth(G, D0, D, From) :-
	graph_adjacent_edge(G, From, Edge), !,
	e(_,To,_) = Edge,
	D1 is D0+1,
	mdd_depth(G, D1, D, To).
    mdd_depth(_G, D, D, _).


%----------------------------------------------------------------------
% table/2
%----------------------------------------------------------------------

:- comment(table/2, [
    amode: table(+,++),
    args: ["Tuples": "A collection of tuples of finite domain variables - these will be constrained",
	   "Table": "A collection of tuples of integers"],
    summary: "Constrain all tuples to take values from the table rows",
    kind:[constraint:[root:[ic,fd]]],
    see_also:[mddc/2,eval_to_list/2],
    desc: html("<P>\
    This constraint is defined extensionally, i.e. by an explicit table
    of value tuples that are valid solutions.
    <P>
    Declaratively, all tuples in Tuples are constrained to take only
    values from Table.  Operationally, for each tuple in Tuples, this
    constraint maintains arc-consistency, i.e. removes all domain
    values that can no longer be part of a solution.  Posting the
    constraint with multiple tuples in Tuples is equivalent
    (declaratively and consistency-wise) to posting an individual
    table-constraint for each tuple in Tuples.
    <P>
    The tuples in both Tuples and Table can be lists, arrays or any
    collection expression understood by eval_to_list/2.
    <P>
    Compatibility: This constraint is known as in_relation in the global
    constraint catalog, as table/2 in SICStus Prolog, and extensional()
    in Gecode.
"),
    eg:"
    :- lib(ic).		% or lib(fd)
    :- lib(ic_mdd).	% or lib(fd_mdd)

    crossword :-
        dim(Grid, [4,4]),
        words4(Words),

        % constrain rows and columns to be words
        ( for(I,1,4), fromto(Slots,Slots1,Slots2,[]), param(Grid) do
            Slots1 = [Grid[I,*], Grid[*,I] |Slots2]
        ),
        table(Slots, Words),

        % find solution(s)
        labeling(Grid),

        % print result
        ( foreachelem(Char,Grid,[_,J]) do
            ( J==1 -> nl ; put(0' ) ), put(Char)
        ).

    % List of allowed words
    % Note: `aloe` is the same as the list [0'a, 0'l, 0'o, 0'e], which
    % is the same as the list of character codes [97, 108, 111, 101]
    words4([`aloe`, `back`, `bash`, `soil`, `help`, `kelp`, `luck`]).


    % Sample run:
    ?- crossword.

    b a s h
    a l o e
    s o i l
    h e l p
"]).


check_instantiated(X, Where) :-
	( var(X) -> throw(error(instantiation_error,Where)) ; true ).

:- export table/2.
table(Tuples, Extension) :-
	% we want list of arrays for both Tuples and Extension
	collection_to_list(Extension, Vcs),
	( foreach(Vc,Vcs), foreach(Vz,Vzs) do
	    eval_to_array(Vc, Vz),
	    check_instantiated(Vz, table/2)
	),
	sort(Vzs, SortedVzs),
	ordered_tuples_to_mdd(SortedVzs, Graph),
	collection_to_list(Tuples, Xcs),
	( foreach(Xc,Xcs), param(Graph) do
	    mddc(Xc, Graph)
	).

