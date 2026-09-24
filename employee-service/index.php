<?php

// Employee Microservice — standalone PHP service, independently deployable.
// Connects only to employee_db, exposes read access to employee records.

header('Content-Type: application/json');

// ---------- Security: internal API key check ----------
$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

// ---------- Database connection (employee_db only) ----------
$host = getenv('EMPLOYEE_DB_HOST') ?: 'postgres';
$port = getenv('EMPLOYEE_DB_PORT') ?: '5432';
$dbname = getenv('EMPLOYEE_DB_DATABASE') ?: 'employee_db';
$user = getenv('EMPLOYEE_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('EMPLOYEE_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$dbname}", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['message' => 'Database unavailable.']);
    exit;
}

// ---------- Routing: GET /employees/{id} ----------
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);

if (count($segments) === 2 && $segments[0] === 'employees') {
    $employeeId = $segments[1];

    $stmt = $pdo->prepare('SELECT * FROM employees WHERE id = :id AND deleted_at IS NULL');
    $stmt->execute(['id' => $employeeId]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $employee) {
        http_response_code(404);
        echo json_encode(['message' => 'Employee not found.']);
        exit;
    }

    echo json_encode($employee);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);