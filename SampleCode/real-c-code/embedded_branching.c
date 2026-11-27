/*
 * Embedded-style branching scenarios for Sikraken.
 *
 * These functions model decisions commonly found in firmware: state
 * transitions, sensor plausibility checks, watchdog servicing, and fault
 * prioritisation. They use scalar parameters so they can be selected by the
 * function testcase generator.
 */

int motor_controller_step(
    int state,
    int enable,
    int emergency_stop,
    int position,
    int target,
    int current,
    int temperature)
{
    if (emergency_stop != 0) {
        return 0;
    }

    if (temperature > 90) {
        return 0;
    }

    if (state == 0) {
        if (enable == 0) {
            return 0;
        }

        if (position != 0 || current > 2) {
            return 1;
        }

        return 2;
    }

    if (state == 1) {
        if (enable == 0) {
            return 0;
        }

        if (position == target) {
            return 3;
        }

        if (current > 8 || temperature > 75) {
            return 4;
        }

        if (position < target) {
            return 5;
        }

        return 6;
    }

    if (state == 2) {
        if (enable == 0 || position == target) {
            return 3;
        }

        if (current == 0 && position != target) {
            return 7;
        }

        return 5;
    }

    if (state == 3) {
        if (enable != 0 && position != target) {
            return 5;
        }

        return 3;
    }

    return 0;
}

int sensor_plausibility(int previous, int measured, int minimum, int maximum)
{
    int difference = measured - previous;

    if (minimum > maximum) {
        return -1;
    }

    if (measured < minimum || measured > maximum) {
        return 0;
    }

    if (difference < -20 || difference > 20) {
        return 1;
    }

    if (measured == minimum || measured == maximum) {
        if (difference == 0) {
            return 2;
        }
        return 3;
    }

    if (difference == 0) {
        return 4;
    }

    if ((previous < minimum && measured >= minimum) ||
        (previous > maximum && measured <= maximum)) {
        return 5;
    }

    return 6;
}

int power_rail_decision(
    int voltage_mv,
    int current_ma,
    int enable_request,
    int thermal_trip,
    int brownout_seen,
    int retry_count)
{
    if (thermal_trip != 0) {
        return 0;
    }

    if (voltage_mv < 8500) {
        return 1;
    }

    if (voltage_mv > 14500) {
        return 2;
    }

    if (current_ma < 0) {
        return 3;
    }

    if (current_ma > 2500) {
        if (retry_count >= 3) {
            return 4;
        }

        if (brownout_seen != 0) {
            return 5;
        }

        return 6;
    }

    if (enable_request == 0) {
        return 7;
    }

    if (brownout_seen != 0 && retry_count == 0) {
        return 8;
    }

    if (retry_count > 3) {
        return 9;
    }

    return 10;
}

int watchdog_action(
    int heartbeat_age_ms,
    int communication_age_ms,
    int control_age_ms,
    int reset_count,
    int boot_complete)
{
    if (boot_complete == 0) {
        if (reset_count > 2) {
            return 0;
        }

        return 1;
    }

    if (heartbeat_age_ms < 0 ||
        communication_age_ms < 0 ||
        control_age_ms < 0) {
        return 2;
    }

    if (heartbeat_age_ms >= 1000) {
        if (reset_count >= 3) {
            return 3;
        }

        if (communication_age_ms >= 5000) {
            return 4;
        }

        return 5;
    }

    if (control_age_ms >= 100) {
        if (communication_age_ms < 500) {
            return 6;
        }

        return 7;
    }

    if (communication_age_ms >= 5000) {
        return 8;
    }

    return 9;
}

int fault_priority(
    int sensor_fault,
    int overcurrent,
    int overtemperature,
    int communication_fault,
    int actuator_fault,
    int safe_mode)
{
    if (safe_mode != 0) {
        if (overtemperature != 0 || overcurrent != 0) {
            return 0;
        }

        return 1;
    }

    if (overtemperature != 0 && overcurrent != 0) {
        return 2;
    }

    if (actuator_fault != 0) {
        if (sensor_fault != 0) {
            return 3;
        }

        if (communication_fault != 0) {
            return 4;
        }

        return 5;
    }

    if (overcurrent != 0) {
        return 6;
    }

    if (overtemperature != 0) {
        return 7;
    }

    if (sensor_fault != 0 && communication_fault != 0) {
        return 8;
    }

    if (communication_fault != 0) {
        return 9;
    }

    if (sensor_fault != 0) {
        return 10;
    }

    return 11;
}

int scheduler_slot(
    int tick,
    int deadline,
    int high_priority_ready,
    int low_priority_ready,
    int bus_busy,
    int recovery_pending)
{
    if (recovery_pending != 0) {
        if (bus_busy == 0 && tick >= deadline) {
            return 0;
        }

        return 1;
    }

    if (tick < 0 || deadline < 0) {
        return 2;
    }

    if (high_priority_ready != 0) {
        if (bus_busy != 0) {
            return 3;
        }

        if (tick > deadline) {
            return 4;
        }

        return 5;
    }

    if (low_priority_ready != 0) {
        if (bus_busy == 0 && tick <= deadline) {
            return 6;
        }

        if (tick > deadline) {
            return 7;
        }
    }

    return 8;
}

int main(void)
{
    return 0;
}
