


// This file is part of TestCov,
// a robust test executor with reliable coverage measurement:
// https://gitlab.com/sosy-lab/software/test-suite-validator/
//
// SPDX-FileCopyrightText: 2019 Dirk Beyer <https://www.sosy-lab.org>
//
// SPDX-License-Identifier: Apache-2.0
// testcov_simple_if.c
extern int __VERIFIER_nondet_int();
extern char __VERIFIER_nondet_char();

int main() {
  int z = __VERIFIER_nondet_int();
  int y = __VERIFIER_nondet_int();
  int c = __VERIFIER_nondet_char();

  if (z > 0) {
    z++;
  }
  if (c == 'a') {
    z += 2;
  }

  if (y < 5 && c != 'b') {
    y--;
  }

  if (z == y) {
    c = 'c';
  }
  
}