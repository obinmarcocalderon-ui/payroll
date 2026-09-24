<?php

// Compensation Microservice — standalone PHP service, independently deployable.
// Connects only to compensation_db, handles compensation adjustment records.

header('Content-Type: application/json');

// ---------- Security: internal API key check ----------
$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

// ---------- Database connection (compensation_db only) ----------
$host = getenv('COMPENSATION_DB_HOST') ?: 'postgres';
$port = getenv('COMPENSATION_DB_PORT') ?: '5432';
$dbname = getenv('COMPENSATION_DB_DATABASE') ?: 'compensation_db';
$user = getenv('COMPENSATION_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('COMPENSATION_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$dbname}", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['message' => 'Database unavailable.']);
    exit;
}

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// ---------- Routing: GET /adjustments (list all) ----------
if (count($segments) === 1 && $segments[0] === 'adjustments' && $method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM compensation_adjustments ORDER BY requested_at DESC');
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// ---------- Routing: POST /adjustments (create) ----------
if (count($segments) === 1 && $segments[0] === 'adjustments' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $required = ['employee_id', 'employee_name', 'adjustment_type', 'current_salary', 'proposed_salary', 'effective_date', 'justification', 'requested_by'];
    foreach ($required as $field) {
        if (! isset($input[$field])) {
            http_response_code(422);
            echo json_encode(['message' => "Missing field: {$field}"]);
            exit;
        }
    }

    $stmt = $pdo->prepare('INSERT INTO compensation_adjustments
        (employee_id, employee_name, adjustment_type, current_salary, proposed_salary, effective_date, justification, requested_by, requested_at, status)
        VALUES (:employee_id, :employee_name, :adjustment_type, :current_salary, :proposed_salary, :effective_date, :justification, :requested_by, NOW(), \'pending\')
        RETURNING *');
    $stmt->execute([
        'employee_id' => $input['employee_id'],
        'employee_name' => $input['employee_name'],
        'adjustment_type' => $input['adjustment_type'],
        'current_salary' => $input['current_salary'],
        'proposed_salary' => $input['proposed_salary'],
        'effective_date' => $input['effective_date'],
        'justification' => $input['justification'],
        'requested_by' => $input['requested_by'],
    ]);

    http_response_code(201);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    exit;
}

// ---------- Routing: PATCH /adjustments/{id} (update status) ----------
if (count($segments) === 2 && $segments[0] === 'adjustments' && $method === 'PATCH') {
    $id = $segments[1];
    $input = json_decode(file_get_contents('php://input'), true);

    if (! isset($input['status']) || ! in_array($input['status'], ['pending', 'approved', 'rejected', 'implemented'])) {
        http_response_code(422);
        echo json_encode(['message' => 'Invalid or missing status.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE compensation_adjustments SET status = :status WHERE id = :id RETURNING *');
    $stmt->execute(['status' => $input['status'], 'id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Adjustment not found.']);
        exit;
    }

    echo json_encode($row);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);