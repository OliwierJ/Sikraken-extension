int sample_function(int a, int b) {
    if (a > b) {
        return a - b;
    } else {
        return b - a;
    }
}
int main() {
    int result = sample_function(10, 5);
    return 0;
}
