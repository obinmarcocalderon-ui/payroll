<?php

// Claims Microservice — standalone PHP service, independently deployable.
// Connects only to claims_db, handles claims and reimbursement records.

header('Content-Type: application/json');

$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

$host = getenv('CLAIMS_DB_HOST') ?: 'postgres';
$port = getenv('CLAIMS_DB_PORT') ?: '5432';
$dbname = getenv('CLAIMS_DB_DATABASE') ?: 'claims_db';
$user = getenv('CLAIMS_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('CLAIMS_DB_PASSWORD') ?: '';

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

// ---------- GET /claims (list all, optional ?employee_id= filter) ----------
if (count($segments) === 1 && $segments[0] === 'claims' && $method === 'GET') {
    if (! empty($_GET['employee_id'])) {
        $stmt = $pdo->prepare('SELECT * FROM claims WHERE employee_id = :eid ORDER BY date_submitted DESC');
        $stmt->execute(['eid' => $_GET['employee_id']]);
    } else {
        $stmt = $pdo->query('SELECT * FROM claims ORDER BY date_submitted DESC');
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// ---------- GET /claims/{id} ----------
if (count($segments) === 2 && $segments[0] === 'claims' && $method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM claims WHERE id = :id');
    $stmt->execute(['id' => $segments[1]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Claim not found.']);
        exit;
    }

    echo json_encode($row);
    exit;
}

// ---------- POST /claims (create) ----------
if (count($segments) === 1 && $segments[0] === 'claims' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $required = ['employee_id', 'employee_name', 'department', 'claim_type', 'description', 'amount', 'date_incurred'];
    foreach ($required as $field) {
        if (! isset($input[$field])) {
            http_response_code(422);
            echo json_encode(['message' => "Missing field: {$field}"]);
            exit;
        }
    }

    function generateUuidV4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

$newId = generateUuidV4();

$stmt = $pdo->prepare('INSERT INTO claims
    (id, employee_id, employee_name, department, claim_type, description, amount, date_incurred, date_submitted, status)
    VALUES (:id, :employee_id, :employee_name, :department, :claim_type, :description, :amount, :date_incurred, CURRENT_DATE, \'submitted\')
    RETURNING *');
$stmt->execute([
    'id' => $newId,
    'employee_id' => $input['employee_id'],
    'employee_name' => $input['employee_name'],
    'department' => $input['department'],
    'claim_type' => $input['claim_type'],
    'description' => $input['description'],
    'amount' => $input['amount'],
    'date_incurred' => $input['date_incurred'],
]);

    http_response_code(201);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    exit;
}

// ---------- PATCH /claims/{id} (update status/reviewer note) ----------
if (count($segments) === 2 && $segments[0] === 'claims' && $method === 'PATCH') {
    $id = $segments[1];
    $input = json_decode(file_get_contents('php://input'), true);

    if (! isset($input['status']) || ! in_array($input['status'], ['submitted', 'under_review', 'approved', 'rejected', 'reimbursed'])) {
        http_response_code(422);
        echo json_encode(['message' => 'Invalid or missing status.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE claims SET status = :status, reviewer_note = COALESCE(:note, reviewer_note) WHERE id = :id RETURNING *');
    $stmt->execute([
        'status' => $input['status'],
        'note' => $input['reviewer_note'] ?? null,
        'id' => $id,
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Claim not found.']);
        exit;
    }

    echo json_encode($row);
    exit;
}

// ---------- POST /claims/{id}/reimburse ----------
if (count($segments) === 3 && $segments[0] === 'claims' && $segments[2] === 'reimburse' && $method === 'POST') {
    $stmt = $pdo->prepare("UPDATE claims SET status = 'reimbursed' WHERE id = :id RETURNING *");
    $stmt->execute(['id' => $segments[1]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $row) {
        http_response_code(404);
        echo json_encode(['message' => 'Claim not found.']);
        exit;
    }

    echo json_encode($row);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);