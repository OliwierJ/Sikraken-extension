/*
 * Real-world C examples for testing Sikraken's function testcase generator.
 *
 * The first section uses scalar-only signatures and should be supported.
 * The remaining functions intentionally exercise C features that are common
 * in production firmware but are not currently supported by the extension.
 * Select one function at a time when testing function generation.
 */

/* Supported: scalar state and bit-mask decisions. */
int decode_status_word(
    unsigned long status,
    int communication_ok,
    int temperature_ok)
{
    if (communication_ok == 0) {
        return 0;
    }

    if (temperature_ok == 0) {
        return 1;
    }

    if ((status & 1) != 0) {
        return 2;
    }

    if ((status & 2) != 0) {
        return 3;
    }

    if ((status & 4) != 0 && (status & 8) == 0) {
        return 4;
    }

    return 5;
}

/* Supported: scalar fixed-point conversion with saturation. */
int millivolts_to_percent(unsigned long millivolts, int calibration_offset)
{
    long adjusted = (long)millivolts + calibration_offset;

    if (adjusted <= 9000) {
        return 0;
    }

    if (adjusted >= 12600) {
        return 100;
    }

    return (int)((adjusted - 9000) * 100 / 3600);
}

/* Supported: persistent module state. */
int button_debounce_step(int raw_level, int stable_level, int sample_count)
{
    static int previous_level = 0;

    if (raw_level != 0 && raw_level != 1) {
        return -1;
    }

    if (raw_level != previous_level) {
        previous_level = raw_level;
        return stable_level;
    }

    if (sample_count >= 5) {
        return raw_level;
    }

    return stable_level;
}

/*
 * Unsupported: array parameters.
 * The extension cannot currently parse or generate harnesses for arrays.
 */
unsigned long crc32_update(
    unsigned long crc,
    const unsigned char data[],
    unsigned long length)
{
    unsigned long index = 0;

    while (index < length) {
        crc = crc ^ data[index];
        index++;
    }

    return crc;
}

/*
 * Unsupported: pointer parameters and pointer dereferencing.
 * This is representative of an ADC driver reading a caller-owned value.
 */
int validate_adc_sample(const int *sample, int minimum, int maximum)
{
    if (sample == 0) {
        return -1;
    }

    if (*sample < minimum || *sample > maximum) {
        return 0;
    }

    return 1;
}

/*
 * Unsupported: structure parameter.
 * Configuration records are common at hardware abstraction boundaries.
 */
struct UartConfig {
    int baud_rate;
    int data_bits;
    int stop_bits;
    int parity_enabled;
};

int validate_uart_config(struct UartConfig config)
{
    if (config.baud_rate < 1200 || config.baud_rate > 115200) {
        return 0;
    }

    if (config.data_bits < 7 || config.data_bits > 8) {
        return 0;
    }

    if (config.stop_bits != 1 && config.stop_bits != 2) {
        return 0;
    }

    if (config.parity_enabled != 0 && config.parity_enabled != 1) {
        return 0;
    }

    return 1;
}

/*
 * Unsupported: pointer to a structure.
 * This is a typical mutable driver configuration API.
 */
int apply_power_limits(struct UartConfig *config, int requested_baud_rate)
{
    if (config == 0) {
        return -1;
    }

    if (requested_baud_rate < 1200) {
        config->baud_rate = 1200;
        return 0;
    }

    if (requested_baud_rate > 115200) {
        config->baud_rate = 115200;
        return 0;
    }

    config->baud_rate = requested_baud_rate;
    return 1;
}

/*
 * Unsupported: void return type.
 * Hardware-control functions commonly report status through side effects.
 */
void set_output_enable(int enable)
{
    static int output_enabled = 0;

    if (enable != 0) {
        output_enabled = 1;
    } else {
        output_enabled = 0;
    }
}

/*
 * Unsupported: function pointer parameter.
 * Callback-based event dispatch is common in interrupt and timer drivers.
 */
int dispatch_event(int event_id, int (*callback)(int), int callback_enabled)
{
    if (callback_enabled == 0) {
        return -1;
    }

    if (event_id < 0) {
        return -2;
    }

    if (callback == 0) {
        return -3;
    }

    return callback(event_id);
}

/*
 * Unsupported: variadic arguments.
 * Logging and diagnostics APIs often use this pattern.
 */
int diagnostic_log(int severity, const char *format, ...)
{
    if (format == 0) {
        return -1;
    }

    if (severity < 0 || severity > 3) {
        return -2;
    }

    return severity;
}

/*
 * Unsupported: enum parameter.
 * Many C parsers expose the enum as a named type rather than a scalar.
 */
enum PowerMode {
    POWER_OFF,
    POWER_IDLE,
    POWER_ACTIVE,
    POWER_FAULT
};

int power_mode_allowed(enum PowerMode mode, int battery_percent)
{
    if (mode == POWER_FAULT) {
        return 0;
    }

    if (battery_percent < 5 && mode == POWER_ACTIVE) {
        return 0;
    }

    if (battery_percent > 100) {
        return 0;
    }

    return 1;
}

/*
 * Unsupported or parser-dependent: multidimensional arrays and local
 * aggregate initialization. This resembles a small lookup table in a
 * communication protocol implementation.
 */
int lookup_response_code(int command, const int table[2][3])
{
    if (table == 0) {
        return -1;
    }

    if (command < 0 || command >= 2) {
        return -2;
    }

    return table[command][0] + table[command][1] + table[command][2];
}

int main(void)
{
    return 0;
}
