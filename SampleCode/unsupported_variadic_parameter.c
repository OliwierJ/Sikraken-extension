#include <stdarg.h>

int sum_values(int count, ...)
{
    va_list values;
    va_start(values, count);
    va_end(values);
    return count;
}
