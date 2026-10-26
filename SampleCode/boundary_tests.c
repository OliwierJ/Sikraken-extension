/*
 * Boundary-focused functions for exercising Sikraken's testcase generation.
 *
 * The extension supports scalar parameters, so each function deliberately
 * avoids arrays, pointers, structs, variadic arguments, and external calls.
 * Select one function at a time in VS Code when using "Generate Tests on
 * Function".
 */

int clamp_to_range(int value, int lower, int upper)
{
    if (lower > upper) {
        return 0;
    }

    if (value <= lower) {
        return lower;
    }

    if (value >= upper) {
        return upper;
    }

    return value;
}

int classify_temperature(int temperature)
{
    if (temperature < -40) {
        return 0;
    }

    if (temperature == -40) {
        return 1;
    }

    if (temperature < 0) {
        return 2;
    }

    if (temperature == 0) {
        return 3;
    }

    if (temperature < 37) {
        return 4;
    }

    if (temperature == 37) {
        return 5;
    }

    if (temperature <= 100) {
        return 6;
    }

    return 7;
}

int saturating_add(int left, int right)
{
    if (right > 0 && left > 2147483647 - right) {
        return 2147483647;
    }

    if (right < 0 && left < -2147483648 - right) {
        return -2147483648;
    }

    return left + right;
}

int saturating_subtract(int left, int right)
{
    if (right > 0 && left < -2147483648 + right) {
        return -2147483648;
    }

    if (right < 0 && left > 2147483647 + right) {
        return 2147483647;
    }

    return left - right;
}

int classify_percentage(int percentage)
{
    if (percentage < 0) {
        return -1;
    }

    if (percentage <= 10) {
        return 0;
    }

    if (percentage < 50) {
        return 1;
    }

    if (percentage == 50) {
        return 2;
    }

    if (percentage < 90) {
        return 3;
    }

    if (percentage <= 100) {
        return 4;
    }

    return 5;
}

int guarded_divide(int numerator, int denominator)
{
    if (denominator == 0) {
        return 0;
    }

    if (numerator == -2147483648 && denominator == -1) {
        return 2147483647;
    }

    return numerator / denominator;
}

int triangular_number(int count)
{
    int total = 0;
    int index = 1;

    if (count < 0) {
        return 0;
    }

    while (index <= count && index <= 100) {
        total = total + index;
        index++;
    }

    if (count > 100) {
        return -1;
    }

    return total;
}

int retry_result(int attempts, int failures)
{
    int retries = 0;

    if (attempts <= 0) {
        return -1;
    }

    while (retries < attempts && retries < 3) {
        if (failures <= retries) {
            return retries;
        }
        retries++;
    }

    if (failures > attempts) {
        return -2;
    }

    return retries;
}

long long classify_counter(long long value)
{
    if (value == -9223372036854775807LL - 1) {
        return -2;
    }

    if (value < -1) {
        return -1;
    }

    if (value == 0) {
        return 0;
    }

    if (value <= 1) {
        return 1;
    }

    return 2;
}

double classify_ratio(double ratio)
{
    if (ratio < 0.0) {
        return -1.0;
    }

    if (ratio == 0.0) {
        return 0.0;
    }

    if (ratio < 1.0) {
        return 1.0;
    }

    if (ratio == 1.0) {
        return 2.0;
    }

    return 3.0;
}

int main(void)
{
    return 0;
}
