

int supported_types(
    int i, 
    unsigned int j, 
    long k, 
    unsigned long l, 
    float m, 
    double n, 
    char c, 
    unsigned char uc, 
    short s, 
    unsigned short us, 
    long long ll, 
    unsigned long long ull)
{
    if (i < 0) {
        return -1;
    }

    if (j > 100) {
        return -2;
    }

    if (k < -1000 || k > 1000) {
        return -3;
    }

    if (l > 1000000) {
        return -4;
    }

    if (m < 0.0f || m > 1.0f) {
        return -5;
    }

    if (n < -10.0 || n > 10.0) {
        return -6;
    }

    if (c < 'a' || c > 'z') {
        return -7;
    }

    if (uc > 127) {
        return -8;
    }

    if (s < -32768 || s > 32767) {
        return -9;
    }

    if (us > 65535) {
        return -10;
    }

    if (ll < -9223372036854775807LL || ll > 9223372036854775807LL) {
        return -11;
    }

    if (ull > 18446744073709551615ULL) {
        return -12;
    }


    return 0;
}

int longlongTest(long long ll) {
    if (ll < -9223372036854775807LL || ll > 9223372036854775807LL) {
        return -1;
    }
    return 0;
}