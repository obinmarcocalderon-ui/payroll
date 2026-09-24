<?php

return [

    /*
    |--------------------------------------------------------------------
    | Payroll Anomaly Detection
    |--------------------------------------------------------------------
    |
    | Configurable thresholds for the rule-based anomaly scan that runs
    | after every payroll compute (see App\Services\PayrollAnomalyDetector).
    |
    */
    'anomaly' => [
        // Overtime hours per cutoff above this trigger a "High overtime" flag.
        'ot_threshold_hours' => (float) env('PAYROLL_ANOMALY_OT_THRESHOLD_HOURS', 40),

        // Net pay deviation from the employee's trailing average (as a
        // percentage) above this triggers an "Unusual pay change" flag.
        'pay_deviation_percent' => (float) env('PAYROLL_ANOMALY_PAY_DEVIATION_PERCENT', 20),

        // How many previous cutoffs to average for the deviation baseline.
        'lookback_cutoffs' => (int) env('PAYROLL_ANOMALY_LOOKBACK_CUTOFFS', 3),
    ],

];
