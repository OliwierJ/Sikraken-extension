


// This file is part of TestCov,
// a robust test executor with reliable coverage measurement:
// https://gitlab.com/sosy-lab/software/test-suite-validator/
//
// SPDX-FileCopyrightText: 2019 Dirk Beyer <https://www.sosy-lab.org>
//
// SPDX-License-Identifier: Apache-2.0
// testcov_simple_if.c
extern int __VERIFIER_nondet_int();


// Example of a simple harness for a function 
// that checks if a number is prime.
int is_prime(int n) {
  if (n <= 1) {
    return 0;
  }
  for (int i = 2; i * i <= n; i++) {
    if (n % i == 0) {
      return 0;
    }
  }
  return 1;
}

// Another example of a simple harness
int find_smallest_number(int num1, int num2, int num3) {
  int smallest = num1;
  if (num2 < smallest) {
    smallest = num2;
  }
  if (num3 < smallest) {
    smallest = num3;
  }
  return smallest;
}

// The main function serves as a simple harness 
// for the is_prime function.
int main() {
  
  int n = __VERIFIER_nondet_int();

  if (n <= 1) {
    return 0;
  }
  for (int i = 2; i * i <= n; i++) {
    if (n % i == 0) {
      return 0;
    }
  }
  return 1;
}
