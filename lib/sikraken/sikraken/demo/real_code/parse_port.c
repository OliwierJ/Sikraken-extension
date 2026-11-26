/* Demo 4: parsing a TCP port number from a string, and a wrapper that ends the program on bad input */
#include <stdlib.h>
#include <assert.h>

#define ERR_EMPTY  -1
#define ERR_DIGIT  -2
#define ERR_RANGE  -3

/* the port 1..65535 of a string of decimal digits, or an error */
long parse_port(const char *s)
{
    if (s == NULL || s[0] == '\0') return ERR_EMPTY;
    long v = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (s[i] < '0' || s[i] > '9') return ERR_DIGIT;
        v = v * 10 + (s[i] - '0');
        if (v > 65535) return ERR_RANGE;
    }
    if (v == 0) return ERR_RANGE;
    return v;
}

/* a configuration value that must be valid: exit(2) otherwise; a NULL string is a programming error */
int port_or_exit(const char *s)
{
    assert(s != NULL);
    long p = parse_port(s);
    if (p < 0) exit(2);
    return (int)p;
}
