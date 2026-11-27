#include <stddef.h>

int classify(int* value, float threshold) {

    if (value == NULL) {
        return 0;
    }

    if (threshold < 0.0f || threshold > 1.0f) {
        return -1;
    }

    if (*value < 0) {
        return -2;
    }
    return *value > threshold * 10;
}

int swap(int* a, int* b) {
    if (a == NULL) {
        return -1;
    }

    if (b == NULL) {
        return -2;
    }
    
    int temp = *a;
    *a = *b;
    *b = temp;
    return 0;
}

int increment(const int* ptr) {
    if (ptr == NULL) {
        return -1;
    }
    return *ptr + 1;
}
