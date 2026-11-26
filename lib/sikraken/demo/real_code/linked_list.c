/* Demo 3: a singly linked list. Pointers read inside input memory: each next is NULL or a node of its own, built as the path needs it */
#include <stddef.h>

struct node {
    int key;
    int value;
    struct node *next;
};

/* the node of the key, or NULL */
struct node *list_find(struct node *head, int key)
{
    for (struct node *n = head; n != NULL; n = n->next)
        if (n->key == key) return n;
    return NULL;
}

/* unlinks the first node of the key; returns the new head */
struct node *list_remove(struct node *head, int key)
{
    if (head == NULL) return NULL;
    if (head->key == key) return head->next;
    for (struct node *p = head; p->next != NULL; p = p->next)
        if (p->next->key == key) {
            p->next = p->next->next;
            return head;
        }
    return head;
}

/* 1 when the keys are in strictly increasing order */
int list_is_sorted(const struct node *head)
{
    while (head != NULL && head->next != NULL) {
        if (head->key >= head->next->key) return 0;
        head = head->next;
    }
    return 1;
}
