% Caution: this will call fzn_ic:table/2 with flattened array t

predicate table(array[int] of var bool: x, array[int, int] of bool: t);
predicate table(array[int] of var int: x, array[int, int] of int: t);

