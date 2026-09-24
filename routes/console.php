<?php

use Illuminate\Support\Facades\Schedule;

// Prune tokens that have been idle past the inactivity timeout, so an
// unattended session can't be resumed later from the same browser.
Schedule::command('sanctum:prune-idle')->everyMinute();