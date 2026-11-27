/*
 * sikraken_v3_features.c
 *
 * A grab-bag of C features and parameter types for testing Sikraken v3
 * real-code mode (--function F). Select ONE function at a time, e.g.:
 *
 *   ./bin/sikraken.sh release 'budget[10]' --coverage condition \
 *       --function list_remove SampleCode/sikraken_v3_features.c
 *   ./bin/run_unity.sh SampleCode/sikraken_v3_features.c -64 list_remove
 *
 * Functions that call the hardware stubs (read_sensor, write_actuator,
 * get_tick) need:  --stub read_sensor --stub write_actuator --stub get_tick
 *
 * Sections:
 *   1. Scalar parameters and control flow            (expected: supported)
 *   2. Globals                                       (expected: supported)
 *   3. Stubs (declared, not defined)                 (expected: supported)
 *   4. Pointers to scalars / out-parameters          (expected: supported)
 *   5. Pointers to structs, nested structs, arrays   (expected: supported)
 *   6. Linked structures: list, tree                 (expected: supported, depth <= 9)
 *   7. Strings and arrays                            (expected: supported)
 *   8. exit() / abort() / assert() paths             (expected: supported)
 *   9. Library calls modelled by Sikraken            (expected: supported)
 *  10. Known limitations                             (expected: error or partial coverage)
 */

#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

/* ====================================================================== */
/* Types shared by several sections                                        */
/* ====================================================================== */

enum mode { MODE_OFF, MODE_IDLE, MODE_RUN, MODE_FAULT };

struct point { int x; int y; };

struct rect {
    struct point top_left;
    struct point bottom_right;
    unsigned char flags;
};

struct config {
    int  id;
    char name[8];
    int  limits[3];
};

struct node {
    int key;
    int value;
    struct node *next;
};

struct tree {
    int key;
    struct tree *left;
    struct tree *right;
};

typedef struct {
    uint8_t  data[4];
    unsigned head, tail, count;
} ring_t;

union word {
    unsigned int  as_uint;
    unsigned char as_bytes[4];
};

/* ====================================================================== */
/* Globals and stubs                                                       */
/* ====================================================================== */

static int setpoint = 20;               /* initialised: keeps its value     */
int hysteresis;                         /* no initialiser: input when read  */
static unsigned error_count;            /* read and written                 */
enum mode current_mode = MODE_IDLE;     /* initialised enum global          */
const int MAX_RETRIES = 3;              /* const: never an input            */
int lookup_table[4] = { 10, 20, 30, 40 };

int  read_sensor(int channel);          /* no body: use --stub */
void write_actuator(int value);         /* no body: use --stub */
unsigned long get_tick(void);           /* no body: use --stub */

/* ====================================================================== */
/* 1. Scalar parameters and control flow                                   */
/* ====================================================================== */

int classify_int(int x)
{
    if (x < 0)   return -1;
    if (x == 0)  return 0;
    if (x < 10)  return 1;
    if (x < 100) return 2;
    return 3;
}

/* unsigned types, bit masks, short-circuit operators */
int flag_decode(unsigned int flags, unsigned char byte)
{
    if ((flags & 0x1) && (byte > 127)) return 1;
    if ((flags & 0x2) || (byte == 0))  return 2;
    if ((flags & 0xF0) == 0xA0)        return 3;
    if (((flags >> 8) & 0xFF) == byte) return 4;
    return 0;
}

/* every integer width */
int mixed_widths(short s, long l, long long ll, unsigned long long ull)
{
    if (s < -100)        return 1;
    if (l > 100000L)     return 2;
    if (ll == 1234567LL) return 3;
    if (ull > 5000000000ULL) return 4;
    if (s == (short)l)   return 5;
    return 0;
}

int char_class(char c)
{
    if (c >= '0' && c <= '9') return 1;
    if (c >= 'a' && c <= 'z') return 2;
    if (c >= 'A' && c <= 'Z') return 3;
    if (c == ' ' || c == '\t' || c == '\n') return 4;
    return 0;
}

/* switch with fall-through and default */
int switch_dispatch(int op, int a, int b)
{
    int r = 0;
    switch (op) {
    case 0:  r = a + b; break;
    case 1:  r = a - b; break;
    case 2:
    case 3:  r = a * 2; break;
    case 4:  if (b == 0) return -1; r = a / b; break;
    default: r = -2;
    }
    return r;
}

/* bounded loop, loop condition is a decision */
int loop_sum(int n)
{
    int total = 0;
    if (n < 0 || n > 5) return -1;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) total += i;
        else            total -= 1;
    }
    return total;
}

int do_while_digits(unsigned int n)
{
    int digits = 0;
    do {
        digits++;
        n /= 10;
    } while (n != 0 && digits < 4);
    return digits;
}

int goto_retry(int a, int b)
{
    int attempts = 0;
retry:
    attempts++;
    if (a < b && attempts < 3) {
        a += 2;
        goto retry;
    }
    return attempts;
}

int ternary_chain(int a, int b)
{
    return a > b ? (a > 100 ? 2 : 1) : (b > 100 ? -2 : -1);
}

/* floating point: solved over the reals, see limitations in the demo PDF */
int float_range(float f, double d)
{
    if (f < 0.0f)  return -1;
    if (f > 1.0f)  return 1;
    if (d < -10.0) return -2;
    if (d > 10.0)  return 2;
    if (f > (float)d) return 3;
    return 0;
}

/* static helper called from the function under test */
static int clamp(int v, int lo, int hi)
{
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

int clamped_scale(int v, int lo, int hi)
{
    if (lo > hi) return -1;
    return clamp(v, lo, hi) * 2;
}

/* recursion with a bounded argument */
int factorial(int n)
{
    if (n < 0) return -1;
    if (n == 0) return 1;
    if (n > 6)  return 0;
    return n * factorial(n - 1);
}

/* ====================================================================== */
/* 2. Globals                                                              */
/* ====================================================================== */

/* setpoint keeps 20; hysteresis becomes an input when first read */
int global_band(int temperature)
{
    if (temperature < setpoint - hysteresis) return 1;
    if (temperature > setpoint + hysteresis) return -1;
    return 0;
}

/* global written by the function: the test asserts the new value */
int global_counter_step(int fail)
{
    if (fail) {
        error_count++;
        if (error_count > 3) {
            current_mode = MODE_FAULT;
            return -1;
        }
        return 1;
    }
    error_count = 0;
    return 0;
}

/* enum global and const global */
int mode_transition(int request)
{
    switch (current_mode) {
    case MODE_OFF:   return request ? 1 : 0;
    case MODE_IDLE:  return request > MAX_RETRIES ? 2 : 3;
    case MODE_RUN:   return -1;
    case MODE_FAULT: return -2;
    }
    return -3;
}

/* global array indexed by an input */
int table_lookup(int index)
{
    if (index < 0 || index >= 4) return -1;
    if (lookup_table[index] > 25) return 1;
    return 0;
}

/* ====================================================================== */
/* 3. Stubs                                                                */
/* ====================================================================== */

int sensor_filter(int channel)
{
    int a, b;
    if (channel < 0) return -1;
    a = read_sensor(channel);
    if (a < 0) return -2;
    b = read_sensor(channel);
    if (a == b) return a;
    if (a > b + 5 || b > a + 5) {
        write_actuator(0);
        return -3;
    }
    write_actuator(a + b);
    return (a + b) / 2;
}

int timeout_check(unsigned long deadline)
{
    unsigned long now = get_tick();
    if (now > deadline) return 1;
    if (deadline - now < 10UL) return 2;
    return 0;
}

/* ====================================================================== */
/* 4. Pointers to scalars and out-parameters                               */
/* ====================================================================== */

int deref_check(const int *p)
{
    if (p == NULL) return -1;
    if (*p < 0)    return 0;
    if (*p > 100)  return 2;
    return 1;
}

void order_pair(int *a, int *b)         /* void return, writes via pointer */
{
    if (a == NULL || b == NULL) return;
    if (*a > *b) {
        int t = *a;
        *a = *b;
        *b = t;
    }
}

int divide_out(int num, int den, int *quot)
{
    if (quot == NULL) return -1;
    if (den == 0)     return -2;
    *quot = num / den;
    return 0;
}

int two_level(int **pp)                 /* pointer to pointer */
{
    if (pp == NULL)  return -1;
    if (*pp == NULL) return -2;
    return **pp > 0;
}

unsigned char byte_peek(const unsigned char *buf, int offset)
{
    if (buf == NULL) return 0;
    if (offset < 0 || offset > 3) return 0;
    return buf[offset];
}

/* ====================================================================== */
/* 5. Pointers to structs, nested structs, arrays in structs               */
/* ====================================================================== */

int point_quadrant(const struct point *p)
{
    if (p == NULL) return -1;
    if (p->x > 0 && p->y > 0) return 1;
    if (p->x < 0 && p->y > 0) return 2;
    if (p->x < 0 && p->y < 0) return 3;
    if (p->x > 0 && p->y < 0) return 4;
    return 0;
}

int rect_area(const struct rect *r)     /* nested struct members */
{
    int w, h;
    if (r == NULL) return -1;
    w = r->bottom_right.x - r->top_left.x;
    h = r->bottom_right.y - r->top_left.y;
    if (w <= 0 || h <= 0) return 0;
    if (r->flags & 1)     return w * h * 2;
    return w * h;
}

void rect_normalise(struct rect *r)     /* writes through a struct pointer */
{
    if (r == NULL) return;
    if (r->top_left.x > r->bottom_right.x) {
        int t = r->top_left.x;
        r->top_left.x = r->bottom_right.x;
        r->bottom_right.x = t;
    }
}

int config_validate(const struct config *c)   /* arrays inside a struct */
{
    if (c == NULL) return -1;
    if (c->id < 0) return -2;
    if (c->name[0] == '\0') return -3;
    for (int i = 0; i < 3; i++) {
        if (c->limits[i] < 0) return -4 - i;
    }
    return 0;
}

static int rb_valid(const ring_t *rb)
{
    return rb->head < 4 && rb->tail < 4 && rb->count <= 4;
}

int rb_push(ring_t *rb, uint8_t byte)
{
    if (rb == NULL || !rb_valid(rb)) return -1;
    if (rb->count == 4) return 0;
    rb->data[rb->head] = byte;
    rb->head = (rb->head + 1) % 4;
    rb->count++;
    return 1;
}

/* ====================================================================== */
/* 6. Linked structures                                                    */
/* ====================================================================== */

struct node *list_find(struct node *head, int key)
{
    while (head != NULL) {
        if (head->key == key) return head;
        head = head->next;
    }
    return NULL;
}

struct node *list_remove(struct node *head, int key)
{
    struct node *prev = NULL, *cur = head;
    while (cur != NULL) {
        if (cur->key == key) {
            if (prev == NULL) return cur->next;
            prev->next = cur->next;
            return head;
        }
        prev = cur;
        cur = cur->next;
    }
    return head;
}

int list_is_sorted(const struct node *head)
{
    while (head != NULL && head->next != NULL) {
        if (head->key > head->next->key) return 0;
        head = head->next;
    }
    return 1;
}

int list_sum_until_negative(const struct node *head)
{
    int sum = 0;
    for (; head != NULL; head = head->next) {
        if (head->value < 0) break;
        sum += head->value;
    }
    return sum;
}

int tree_contains(const struct tree *t, int key)   /* two pointers per node */
{
    if (t == NULL) return 0;
    if (key == t->key) return 1;
    if (key < t->key) return tree_contains(t->left, key);
    return tree_contains(t->right, key);
}

int tree_height(const struct tree *t)
{
    int l, r;
    if (t == NULL) return 0;
    l = tree_height(t->left);
    r = tree_height(t->right);
    return 1 + (l > r ? l : r);
}

/* ====================================================================== */
/* 7. Strings and arrays                                                   */
/* ====================================================================== */

long parse_port(const char *s)          /* 1..65535, -1 empty, -2 non-digit, -3 range */
{
    long v = 0;
    if (s == NULL) return -1;
    if (s[0] == '\0') return -1;
    for (int i = 0; s[i] != '\0'; i++) {
        if (s[i] < '0' || s[i] > '9') return -2;
        v = v * 10 + (s[i] - '0');
        if (v > 65535) return -3;
    }
    return v == 0 ? -3 : v;
}

int count_vowels(const char *s)
{
    int n = 0;
    if (s == NULL) return -1;
    for (; *s; s++) {
        char c = *s;
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') n++;
    }
    return n;
}

int str_equal(const char *a, const char *b)
{
    if (a == NULL || b == NULL) return -1;
    while (*a && *b) {
        if (*a != *b) return 0;
        a++;
        b++;
    }
    return *a == *b;
}

int array_max(const int arr[], int len)      /* array decays to pointer */
{
    int best;
    if (arr == NULL || len <= 0 || len > 5) return -1;
    best = arr[0];
    for (int i = 1; i < len; i++) {
        if (arr[i] > best) best = arr[i];
    }
    return best;
}

int fixed_array_sorted(const int arr[4])
{
    for (int i = 0; i + 1 < 4; i++) {
        if (arr[i] > arr[i + 1]) return 0;
    }
    return 1;
}

int two_dimensional_sum(int arr[3][2])
{
    int total = 0;
    if (arr == NULL) return -1;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 2; j++) {
            total += arr[i][j];
        }
    }
    return total;
}
/* ====================================================================== */
/* 8. exit() / abort() / assert() paths                                    */
/* ====================================================================== */

int checked_divide(int a, int b)
{
    assert(b != 0);                     /* failing path ends in abort() */
    return a / b;
}

int exit_on_negative(int x)
{
    if (x < 0) exit(3);                 /* path ends with exit status 3 */
    if (x == 0) return 0;
    return 1;
}

int port_or_exit(const char *s)
{
    long p;
    assert(s != NULL);
    p = parse_port(s);
    if (p < 0) exit(2);
    return (int)p;
}

/* ====================================================================== */
/* 9. Library calls Sikraken models (memory, strings, allocation)          */
/* ====================================================================== */

int use_strlen(const char *s)
{
    if (s == NULL) return -1;
    if (strlen(s) == 0) return 0;
    if (strlen(s) > 3)  return 2;
    return 1;
}

int use_malloc(int n)
{
    int *buf;
    if (n <= 0 || n > 4) return -1;
    buf = malloc((size_t)n * sizeof *buf);
    if (buf == NULL) return -2;
    for (int i = 0; i < n; i++) buf[i] = i * i;
    n = buf[n - 1];
    free(buf);
    return n > 4;
}

int use_memcpy(const int *src, int n)
{
    int dst[4];
    if (src == NULL || n < 1 || n > 4) return -1;
    memcpy(dst, src, (size_t)n * sizeof(int));
    return dst[n - 1] > 0;
}

int use_abs(int x)
{
    int a = abs(x);
    return a > 50;
}

/* ====================================================================== */
/* 10. Known limitations: expect an error, partial coverage, or failures   */
/* ====================================================================== */

/* (a) struct passed by value: Sikraken stops with an error message */
int struct_by_value(struct point p)
{
    return p.x > p.y;
}

/* (b) void * parameter: stops with an error */
int void_pointer_param(void *p, int tag)
{
    if (tag == 0) return *(int *)p;
    return 0;
}

/* (c) function pointer parameter: stops with an error */
int callback_param(int (*cb)(int), int x)
{
    if (cb == NULL) return -1;
    return cb(x);
}

/* (d) variadic: stops with an error */
int variadic_sum(int count, ...)
{
    return count;
}

/* (e) signed overflow is not modelled as wrapping: the wrap branch is not
 *     covered, or a path through wrapping arithmetic yields a failing test */
int overflow_branch(int a, int b)
{
    int sum = a + b;
    if (a > 0 && b > 0 && sum < 0) return -1;   /* only reachable by wrapping */
    if (sum == 0) return 0;
    return 1;
}

/* (f) state persisting between calls: static local is not an input, so the
 *     branch that needs a second call is not covered */
int second_call_only(int x)
{
    static int calls = 0;
    calls++;
    if (calls == 2 && x > 0) return 99;
    return calls;
}

/* (g) two pointers aliasing each other are never generated */
int alias_check(int *a, int *b)
{
    if (a == NULL || b == NULL) return -1;
    if (a == b) return 1;
    return 0;
}

/* (h) cyclic list: pointers never form cycles, and chains are <= 9 deep */
int list_has_cycle(const struct node *head)
{
    const struct node *slow = head, *fast = head;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return 1;
    }
    return 0;
}

/* (i) function pointer read out of input memory ends the path */
struct handler { int id; int (*fn)(int); };

int call_handler(const struct handler *h, int x)
{
    if (h == NULL) return -1;
    if (h->id == 0) return 0;
    return h->fn(x);
}

/* (j) union member reads */
int union_bytes(const union word *w)
{
    if (w == NULL) return -1;
    if (w->as_bytes[0] == 0xFF) return 1;
    if (w->as_uint > 1000u) return 2;
    return 0;
}

/* (k) negative zero is not distinguished from 0.0 */
int float_sign(double d)
{
    if (d == 0.0) return 0;
    if (d > 0.0)  return 1;
    return -1;
}

/* (l) function without branches: nothing to cover, expect few/one test */
int no_branch(long left, int right)
{
    return (int)(left + right);
}

int main(void)
{
    return 0;
}