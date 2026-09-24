<?php

// Attendance Microservice — standalone PHP service, independently deployable.
// Connects only to attendance_db, exposes read access to attendance records and summaries.

header('Content-Type: application/json');

// ---------- Security: internal API key check ----------
$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

// ---------- Database connection (attendance_db only) ----------
$host = getenv('ATTENDANCE_DB_HOST') ?: 'postgres';
$port = getenv('ATTENDANCE_DB_PORT') ?: '5432';
$dbname = getenv('ATTENDANCE_DB_DATABASE') ?: 'attendance_db';
$user = getenv('ATTENDANCE_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('ATTENDANCE_DB_PASSWORD') ?: '';

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

// GET /attendance-records/{id}
if (count($segments) === 2 && $segments[0] === 'attendance-records') {
    $stmt = $pdo->prepare('SELECT * FROM attendance_records WHERE id = :id');
    $stmt->execute(['id' => $segments[1]]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $record) {
        http_response_code(404);
        echo json_encode(['message' => 'Attendance record not found.']);
        exit;
    }

    echo json_encode($record);
    exit;
}

// GET /attendance-summaries/{id}
if (count($segments) === 2 && $segments[0] === 'attendance-summaries') {
    $stmt = $pdo->prepare('SELECT * FROM attendance_summaries WHERE id = :id');
    $stmt->execute(['id' => $segments[1]]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $summary) {
        http_response_code(404);
        echo json_encode(['message' => 'Attendance summary not found.']);
        exit;
    }

    echo json_encode($summary);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);