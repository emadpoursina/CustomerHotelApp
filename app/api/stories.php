<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function env_value(string $name, string $default = ''): string
{
    $v = getenv($name);
    if ($v === false || trim($v) === '') {
        return $default;
    }
    return trim($v);
}

function get_db_connection(): PDO
{
    $host = env_value('DB_HOST', 'db');
    $port = (int) env_value('DB_PORT', '3306');
    $user = env_value('DB_USERNAME', env_value('DB_USER', 'hotel_survey'));
    $pass = env_value('DB_PASSWORD', '');
    $db   = env_value('DB_NAME', 'hotel_survey');

    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $e) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'error' => 'db']);
        exit;
    }

    try {
        $check = $pdo->query("SHOW TABLES LIKE 'hotel_feedback_queue'");
        if (!$check || $check->rowCount() === 0) {
            http_response_code(503);
            echo json_encode(['ok' => false, 'error' => 'setup']);
            exit;
        }
    } catch (Throwable $e) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'error' => 'setup']);
        exit;
    }

    return $pdo;
}

function normalize_department(?string $raw): string
{
    if ($raw === null) {
        return '';
    }
    $raw = trim($raw);
    if ($raw === '') {
        return '';
    }
    if (str_starts_with($raw, 'resta')) {
        return 'restaurant';
    }
    if (str_starts_with($raw, 'recep')) {
        return 'reception';
    }
    if (str_starts_with($raw, 'facil')) {
        return 'facilities';
    }
    if (str_starts_with($raw, 'house')) {
        return 'housekeeping';
    }
    $canon = ['restaurant', 'reception', 'facilities', 'housekeeping'];
    if (in_array($raw, $canon, true)) {
        return $raw;
    }
    return '';
}

function send_bale_notification(string $dept): string
{
    $token = env_value('BALE_BOT_TOKEN');
    $chatId = env_value('BALE_CHAT_ID');
    $apiBase = rtrim(env_value('BALE_API_BASE', 'https://tapi.bale.ai'), '/');

    if ($token === '' || $chatId === '') {
        error_log('bale: skipped');
        return 'skipped';
    }

    $deptMap = [
        'restaurant' => 'رستوران',
        'reception' => 'پذیرش',
        'facilities' => 'تاسیسات',
        'housekeeping' => 'خانه‌داری',
    ];
    $deptFa = $deptMap[$dept] ?? ($dept !== '' ? $dept : 'عمومی');
    $hotelFa = 'مجتمع کوثر ملکشهر';
    $whenFa = 'اکنون';

    $text = "بازخورد جدید · {$deptFa}\n"
          . "{$hotelFa}\n"
          . "{$whenFa}";

    $url = "{$apiBase}/bot{$token}/sendMessage";
    $payload = json_encode([
        'chat_id' => $chatId,
        'text' => $text,
    ]);

    $ch = curl_init($url);
    if ($ch === false) {
        error_log('bale: failed status=0');
        return 'failed';
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 5,
    ]);

    $res = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_errno($ch);
    curl_close($ch);

    if ($curlErr !== 0 || $httpCode < 200 || $httpCode >= 300) {
        error_log("bale: failed status={$httpCode}");
        return 'failed';
    }

    error_log('bale: sent');
    return 'sent';
}

function resolve_survey_columns(PDO $pdo, int $surveyId): array
{
    $stmt = $pdo->prepare("SELECT title, gid, qid FROM lime_questions WHERE sid = ? AND parent_qid = 0");
    $stmt->execute([$surveyId]);
    $cols = [];
    while ($row = $stmt->fetch()) {
        $title = $row['title'];
        $gid = $row['gid'];
        $qid = $row['qid'];
        $col = "{$surveyId}X{$gid}X{$qid}";
        if (preg_match('/^[0-9]+X[0-9]+X[0-9]+$/', $col)) {
            $cols[$title] = $col;
        }
    }
    return $cols;
}

function run_inbox_sync(PDO $pdo, int $surveyId = 420001): array
{
    $cols = resolve_survey_columns($pdo, $surveyId);
    $deptCol = $cols['QDEPT'] ?? null;

    $surveyTable = "lime_survey_{$surveyId}";
    $selectFields = ['id', 'submitdate'];
    if ($deptCol !== null) {
        $selectFields[] = "`{$deptCol}` AS dept_raw";
    }

    $sql = "SELECT " . implode(', ', $selectFields) . " FROM `{$surveyTable}` WHERE submitdate IS NOT NULL ORDER BY id ASC";
    $stmt = $pdo->query($sql);
    if (!$stmt) {
        return ['inserted' => 0, 'bale' => 'skipped'];
    }

    $inserted = 0;
    $lastBale = 'skipped';

    $insertStmt = $pdo->prepare("INSERT IGNORE INTO hotel_feedback_queue (survey_id, response_id, department, overall, nps, submitted_at, state) VALUES (?, ?, ?, ?, ?, ?, 'pending')");

    while ($row = $stmt->fetch()) {
        $responseId = (int) $row['id'];
        $submitDate = (string) $row['submitdate'];
        $dept = normalize_department($row['dept_raw'] ?? null);

        $insertStmt->execute([$surveyId, $responseId, $dept, null, null, $submitDate]);
        if ($insertStmt->rowCount() > 0) {
            $inserted++;
            $lastBale = send_bale_notification($dept);
        }
    }

    error_log("inbox: sync inserted={$inserted}");
    return ['inserted' => $inserted, 'bale' => $lastBale];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$pdo = get_db_connection();
run_inbox_sync($pdo, 420001);

$cols = resolve_survey_columns($pdo, 420001);
$q8Col = $cols['Q8LIKED'] ?? null;
$q9Col = $cols['Q9IMPROVE'] ?? null;

$praiseExpr = $q8Col !== null ? "r.`{$q8Col}`" : "''";
$complaintExpr = $q9Col !== null ? "r.`{$q9Col}`" : "''";

$sql = "SELECT q.department, q.submitted_at,
               COALESCE({$praiseExpr}, '') AS praise_raw,
               COALESCE({$complaintExpr}, '') AS complaint_raw
        FROM hotel_feedback_queue q
        JOIN lime_survey_420001 r ON q.response_id = r.id
        WHERE q.survey_id = 420001 AND q.state = 'published'
        ORDER BY q.submitted_at DESC, q.id DESC";

$stmt = $pdo->query($sql);
$items = [];
$validDepts = ['restaurant', 'reception', 'facilities', 'housekeeping'];

while ($row = $stmt->fetch()) {
    $praise = trim((string) $row['praise_raw']);
    $complaint = trim((string) $row['complaint_raw']);
    if ($praise === '' && $complaint === '') {
        continue;
    }
    $dept = normalize_department($row['department']);
    if (!in_array($dept, $validDepts, true)) {
        continue;
    }
    $items[] = [
        'department' => $dept,
        'praise' => $praise,
        'complaint' => $complaint,
        'submittedAt' => (string) $row['submitted_at'],
    ];
}

echo json_encode(['ok' => true, 'items' => $items]);
