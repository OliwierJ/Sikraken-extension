
int sum4(const int values[4]) {
    return values[0] + values[1] + values[2] + values[3];
}

int sum_too_large(int values[ 10 ]) {
    int total = 0;
    for (int i = 0; i < 10; i++) {
        total += values[i];
    }
    if (total > 100) {
        return -1;
    }
    return total;
}



int two_equal_char_arrays(char a[10], char b[10]) {
    for (int i = 0; i < 10; i++) {
        if (a[i] != b[i]) {
            return 0;
        }
    }
    return 1;
}

int two_equal_float_arrays(float a[10], float b[10]) {
    for (int i = 0; i < 10; i++) {
        if (a[i] != b[i]) {
            return 0;
        }
    }
    return 1;
}

int str_is_equal(char a[10], char b[10]) {
    for (int i = 0; i < 10; i++) {
        if (a[i] != b[i]) {
            return 0;
        }
    }
    return 1;
}


int none_ptr_null(int* a[5]) {
    for (int i = 0; i < 5; i++) {
        if (a[i] == NULL) {
            return 0;
        }
    }
    return 1;
}

int main() {return 0;}