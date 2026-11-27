#include "include.c"

int validate_sample(const int *sample, struct Limits limits, enum Level lvl)
{
    if (sample == 0) {
        return -1;
    }

    if (*sample < limits.minimum || *sample > limits.maximum) {
        return 0;
    }

    return 1;
}

int main(void)
{
    return 0;
}
