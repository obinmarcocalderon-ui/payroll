<?php

// Benefits Microservice — standalone PHP service, independently deployable.
// Connects only to benefits_db, handles benefit plans, enrollments, and dependents.

header('Content-Type: application/json');

$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

$host = getenv('BENEFITS_DB_HOST') ?: 'postgres';
$port = getenv('BENEFITS_DB_PORT') ?: '5432';
$dbname = getenv('BENEFITS_DB_DATABASE') ?: 'benefits_db';
$user = getenv('BENEFITS_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('BENEFITS_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$dbname}", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['message' => 'Database unavailable.']);
    exit;
}

function generateUuidV4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function fetchDependents(PDO $pdo, string $enrollmentId): array {
    $stmt = $pdo->prepare('SELECT * FROM dependents WHERE benefit_enrollment_id = :eid');
    $stmt->execute(['eid' => $enrollmentId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// ================= PLANS =================

// GET /plans
if (count($segments) === 1 && $segments[0] === 'plans' && $method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM benefit_plans ORDER BY plan_name');
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// POST /plans
if (count($segments) === 1 && $segments[0] === 'plans' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $required = ['plan_name', 'provider', 'plan_type', 'coverage_amount', 'employer_share_percent', 'employee_share_percent'];
    foreach ($required as $field) {
        if (! isset($input[$field])) {
            http_response_code(422);
            echo json_encode(['message' => "Missing field: {$field}"]);
            exit;
        }
    }

    $id = generateUuidV4();
    $stmt = $pdo->prepare('INSERT INTO benefit_plans
        (id, plan_name, provider, plan_type, coverage_amount, employer_share_percent, employee_share_percent, is_active)
        VALUES (:id, :plan_name, :provider, :plan_type, :coverage_amount, :employer_share_percent, :employee_share_percent, true)
        RETURNING *');
    $stmt->execute([
        'id' => $id,
        'plan_name' => $input['plan_name'],
        'provider' => $input['provider'],
        'plan_type' => $input['plan_type'],
        'coverage_amount' => $input['coverage_amount'],
        'employer_share_percent' => $input['employer_share_percent'],
        'employee_share_percent' => $input['employee_share_percent'],
    ]);

    http_response_code(201);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    exit;
}

// PATCH /plans/{id}
if (count($segments) === 2 && $segments[0] === 'plans' && $method === 'PATCH') {
    $id = $segments[1];
    $input = json_decode(file_get_contents('php://input'), true);

    $allowed = ['plan_name', 'provider', 'plan_type', 'coverage_amount', 'employer_share_percent', 'employee_share_percent', 'is_active'];
    $sets = [];
    $params = ['id' => $id];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $input)) {
            $sets[] = "{$field} = :{$field}";
            $params[$field] = $input[$field];
        }
    }

    if (empty($sets)) {
        http_response_code(422);
        echo json_encode(['message' => 'No valid fields to update.']);
        exit;
    }

    $sql = 'UPDATE benefit_plans SET ' . implode(', ', $sets) . ' WHERE id = :id RETURNING *';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Plan not found.']);
        exit;
    }

    echo json_encode($row);
    exit;
}

// ================= ENROLLMENTS =================

// GET /enrollments (optional ?employee_id= filter)
if (count($segments) === 1 && $segments[0] === 'enrollments' && $method === 'GET') {
    if (! empty($_GET['employee_id'])) {
        $stmt = $pdo->prepare('SELECT * FROM benefit_enrollments WHERE employee_id = :eid ORDER BY employee_name');
        $stmt->execute(['eid' => $_GET['employee_id']]);
    } else {
        $stmt = $pdo->query('SELECT * FROM benefit_enrollments ORDER BY employee_name');
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$row) {
        $row['dependents'] = fetchDependents($pdo, $row['id']);
    }
    echo json_encode($rows);
    exit;
}

// POST /enrollments
if (count($segments) === 1 && $segments[0] === 'enrollments' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $required = ['employee_id', 'employee_name', 'plan_id'];
    foreach ($required as $field) {
        if (! isset($input[$field])) {
            http_response_code(422);
            echo json_encode(['message' => "Missing field: {$field}"]);
            exit;
        }
    }

    // Look up plan name from plan_id
    $planStmt = $pdo->prepare('SELECT plan_name FROM benefit_plans WHERE id = :id');
    $planStmt->execute(['id' => $input['plan_id']]);
    $plan = $planStmt->fetch(PDO::FETCH_ASSOC);

    if (! $plan) {
        http_response_code(422);
        echo json_encode(['message' => 'Invalid plan_id.']);
        exit;
    }

    $id = generateUuidV4();
    $stmt = $pdo->prepare("INSERT INTO benefit_enrollments
        (id, employee_id, employee_name, plan_id, plan_name, status, enrollment_date)
        VALUES (:id, :employee_id, :employee_name, :plan_id, :plan_name, 'pending', CURRENT_DATE)
        RETURNING *");
    $stmt->execute([
        'id' => $id,
        'employee_id' => $input['employee_id'],
        'employee_name' => $input['employee_name'],
        'plan_id' => $input['plan_id'],
        'plan_name' => $plan['plan_name'],
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $row['dependents'] = [];

    http_response_code(201);
    echo json_encode($row);
    exit;
}

// PATCH /enrollments/{id}
if (count($segments) === 2 && $segments[0] === 'enrollments' && $method === 'PATCH') {
    $id = $segments[1];
    $input = json_decode(file_get_contents('php://input'), true);

    if (! isset($input['status']) || ! in_array($input['status'], ['enrolled', 'pending', 'waived', 'terminated'])) {
        http_response_code(422);
        echo json_encode(['message' => 'Invalid or missing status.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE benefit_enrollments SET status = :status WHERE id = :id RETURNING *');
    $stmt->execute(['status' => $input['status'], 'id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Enrollment not found.']);
        exit;
    }

    $row['dependents'] = fetchDependents($pdo, $row['id']);
    echo json_encode($row);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);