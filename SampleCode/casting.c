extern int __VERIFIER_nondet_int();
extern unsigned long __VERIFIER_nondet_ulong();


int main () {
    unsigned long millivolts = __VERIFIER_nondet_ulong();
    int calibration_offset = __VERIFIER_nondet_int();

    long adjusted = (long)millivolts + calibration_offset;

    if (adjusted <= 9000) {
        return 0;
    }

    if (adjusted >= 12600) {
        return 100;
    }

    return (int)((adjusted - 9000) * 100 / 3600);

}