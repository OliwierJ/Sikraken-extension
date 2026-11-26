/* Demo 1: a thermostat controller. Scalar parameters, globals and the hardware (two functions declared, not defined) */
enum mode { MODE_OFF, MODE_HEAT, MODE_COOL, MODE_FAULT };

int read_temperature(int sensor);       /* hardware: no body in this file, a stub in the tests */
void set_heater(int on);                /* hardware */

static int setpoint = 20;               /* initialised: keeps 20 (an input with --ignore-initialisers) */
int hysteresis;                         /* no initialiser: an input when it is read */
enum mode current_mode = MODE_OFF;

enum mode thermostat_step(int sensor)
{
    if (sensor < 0 || sensor > 3) return MODE_FAULT;
    if (hysteresis < 0 || hysteresis > 5) return MODE_FAULT;
    int t = read_temperature(sensor);
    if (t < -40 || t > 125) {           /* sensor out of range: switch off */
        set_heater(0);
        current_mode = MODE_OFF;
    } else if (t < setpoint - hysteresis) {
        set_heater(1);
        current_mode = MODE_HEAT;
    } else if (t > setpoint + hysteresis) {
        set_heater(0);
        current_mode = MODE_COOL;
    }                                   /* within the band: no change */
    return current_mode;
}
