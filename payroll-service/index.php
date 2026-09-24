<?php

// Payroll Microservice — standalone PHP service, independently deployable.
// Connects only to payroll_db, exposes read access to payroll runs and payslips.

header('Content-Type: application/json');

// ---------- Security: internal API key check ----------
$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

// ---------- Database connection (payroll_db only) ----------
$host = getenv('PAYROLL_DB_HOST') ?: 'postgres';
$port = getenv('PAYROLL_DB_PORT') ?: '5432';
$dbname = getenv('PAYROLL_DB_DATABASE') ?: 'payroll_db';
$user = getenv('PAYROLL_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('PAYROLL_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$dbname}", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['message' => 'Database unavailable.']);
    exit;
}

// ---------- Routing ----------
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);

// GET /payroll-runs/{id}
if (count($segments) === 2 && $segments[0] === 'payroll-runs') {
    $stmt = $pdo->prepare('SELECT * FROM payroll_runs WHERE id = :id');
    $stmt->execute(['id' => $segments[1]]);
    $run = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $run) {
        http_response_code(404);
        echo json_encode(['message' => 'Payroll run not found.']);
        exit;
    }

    echo json_encode($run);
    exit;
}

// GET /payslips/{id}
if (count($segments) === 2 && $segments[0] === 'payslips') {
    $stmt = $pdo->prepare('SELECT * FROM payslips WHERE id = :id');
    $stmt->execute(['id' => $segments[1]]);
    $payslip = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $payslip) {
        http_response_code(404);
        echo json_encode(['message' => 'Payslip not found.']);
        exit;
    }

    echo json_encode($payslip);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);