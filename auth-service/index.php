<?php

// Auth Microservice — standalone PHP service, independently deployable.
// Connects only to auth_db, exposes read access to user records.

header('Content-Type: application/json');

// ---------- Security: internal API key check ----------
$providedKey = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$expectedKey = getenv('INTERNAL_API_KEY');

if (! $expectedKey || $providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized internal request.']);
    exit;
}

// ---------- Database connection (auth_db only) ----------
$host = getenv('AUTH_DB_HOST') ?: 'postgres';
$port = getenv('AUTH_DB_PORT') ?: '5432';
$dbname = getenv('AUTH_DB_DATABASE') ?: 'auth_db';
$user = getenv('AUTH_DB_USERNAME') ?: 'payroll_user';
$pass = getenv('AUTH_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$dbname}", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['message' => 'Database unavailable.']);
    exit;
}

// ---------- Routing: GET /users/{id} ----------
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);

if (count($segments) === 2 && $segments[0] === 'users') {
    $userId = $segments[1];

    // Never expose the password hash over the wire.
    $stmt = $pdo->prepare('SELECT id, name, email, role, employee_id, created_at FROM users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $user) {
        http_response_code(404);
        echo json_encode(['message' => 'User not found.']);
        exit;
    }

    echo json_encode($user);
    exit;
}

// ---------- Routing: POST /login ----------
if (count($segments) === 1 && $segments[0] === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (! $email || ! $password) {
        http_response_code(422);
        echo json_encode(['message' => 'Email and password are required.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id, name, email, role, employee_id, password FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $user || ! password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid credentials.']);
        exit;
    }

    // Never send the password hash back out.
    unset($user['password']);

    http_response_code(200);
    echo json_encode(['user' => $user]);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Route not found.']);