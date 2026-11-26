/* Demo 2: a byte ring buffer. A pointer to a struct holding an array: the struct's members are inputs, what is written is asserted */
#include <stdint.h>
#include <stddef.h>
#define RB_SIZE 4

typedef struct {
    uint8_t data[RB_SIZE];
    unsigned head;                      /* next slot written */
    unsigned tail;                      /* next slot read */
    unsigned count;
} ring_t;

static int rb_valid(const ring_t *rb)
{
    return rb->head < RB_SIZE && rb->tail < RB_SIZE && rb->count <= RB_SIZE;
}

int rb_push(ring_t *rb, uint8_t byte)
{
    if (rb == NULL || !rb_valid(rb)) return -1;
    if (rb->count == RB_SIZE) return 0;                 /* full */
    rb->data[rb->head] = byte;
    rb->head = (rb->head + 1) % RB_SIZE;
    rb->count++;
    return 1;
}

int rb_pop(ring_t *rb, uint8_t *out)
{
    if (rb == NULL || out == NULL || !rb_valid(rb)) return -1;
    if (rb->count == 0) return 0;                       /* empty */
    *out = rb->data[rb->tail];
    rb->tail = (rb->tail + 1) % RB_SIZE;
    rb->count--;
    return 1;
}
