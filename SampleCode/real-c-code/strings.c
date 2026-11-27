
int is_password_valid(const char password[10]) {
    int has_uppercase = 0;
    int has_lowercase = 0;
    int has_digit = 0;
    for (int i = 0; i < 10; i++) {
        if (password[i] >= 'A' && password[i] <= 'Z') {
            has_uppercase = 1;
        } else if (password[i] >= 'a' && password[i] <= 'z') {
            has_lowercase = 1;
        } else if (password[i] >= '0' && password[i] <= '9') {
            has_digit = 1;
        }
    }
    return has_uppercase && has_lowercase && has_digit;
}

int is_password_strong(const char password[8]) {
    int has_uppercase = 0;
    int has_lowercase = 0;
    int has_digit = 0;
    int has_special = 0;
    for (int i = 0; i < 10; i++) {
        if (password[i] >= 'A' && password[i] <= 'Z') {
            has_uppercase = 1;
        } else if (password[i] >= 'a' && password[i] <= 'z') {
            has_lowercase = 1;
        } else if (password[i] >= '0' && password[i] <= '9') {
            has_digit = 1;
        } else if ((password[i] >= '!' && password[i] <= '/') ||
                   (password[i] >= ':' && password[i] <= '@') ||
                   (password[i] >= '[' && password[i] <= '`') ||
                   (password[i] >= '{' && password[i] <= '~')) {
            has_special = 1;
        }
    }
    return has_uppercase && has_lowercase && has_digit && has_special;
}


int compare(const char* str1, const char* str2) {
    if (str1 == NULL || str2 == NULL) {
        return -1;
    }

    while (*str1 && *str2) {
        if (*str1 != *str2) {
            return *str1 - *str2;
        }
        str1++;
        str2++;
    }

    return *str1 - *str2;
}

