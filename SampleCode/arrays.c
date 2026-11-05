#include <assert.h>

// Declaration of the verifier's non-deterministic generator
extern int __VERIFIER_nondet_int(void);

int main() {
    int size = 5;
    int my_array[5];

    // Filling the array with completely non-deterministic values
    for (int i = 0; i < size; i++) {
        my_array[i] = __VERIFIER_nondet_int();
    }

    // The verifier will now check if the program is safe 
    // for ANY combination of integers inside this array.
    if (my_array[0] > 10) {
        assert(my_array[0] > 0); // The verifier proves this is always true
    }

    return 0;
}
