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

function send_bale_notification(string $dept, ?int $overall, ?int $nps): string
{
    if ($overall === null || $nps === null) {
        error_log('bale: skipped');
        return 'skipped';
    }

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
          . "امتیاز کلی: {$overall}/5\n"
          . "NPS: {$nps}\n"
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
    $q1Col = $cols['Q1OVERALL'] ?? null;
    $q7Col = $cols['Q7RECOMMEND'] ?? null;

    $surveyTable = "lime_survey_{$surveyId}";

    $selectFields = ['id', 'submitdate'];
    if ($deptCol !== null) {
        $selectFields[] = "`{$deptCol}` AS dept_raw";
    }
    if ($q1Col !== null) {
        $selectFields[] = "`{$q1Col}` AS q1_raw";
    }
    if ($q7Col !== null) {
        $selectFields[] = "`{$q7Col}` AS q7_raw";
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
        $overall = isset($row['q1_raw']) && is_numeric($row['q1_raw']) ? (int) $row['q1_raw'] : null;
        $nps = isset($row['q7_raw']) && is_numeric($row['q7_raw']) ? (int) $row['q7_raw'] : null;

        $insertStmt->execute([$surveyId, $responseId, $dept, $overall, $nps, $submitDate]);
        if ($insertStmt->rowCount() > 0) {
            $inserted++;
            $lastBale = send_bale_notification($dept, $overall, $nps);
        }
    }

    error_log("inbox: sync inserted={$inserted}");
    return ['inserted' => $inserted, 'bale' => $lastBale];
}

$pdo = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_json']);
        exit;
    }

    $op = $body['op'] ?? '';
    if ($op === 'sync') {
        $syncRes = run_inbox_sync($pdo, 420001);
        echo json_encode([
            'ok' => true,
            'inserted' => $syncRes['inserted'],
            'bale' => $syncRes['bale'],
        ]);
        exit;
    }

    if ($op === 'action') {
        $id = isset($body['id']) && is_numeric($body['id']) ? (int) $body['id'] : 0;
        $action = $body['action'] ?? '';

        if ($id <= 0 || !in_array($action, ['publish', 'private'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'invalid_input']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, state FROM hotel_feedback_queue WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'not_found']);
            exit;
        }

        $state = $row['state'];

        if ($state === 'private') {
            if ($action === 'publish') {
                http_response_code(409);
                echo json_encode(['ok' => false, 'error' => 'private_terminal']);
                exit;
            }
            echo json_encode(['ok' => true, 'state' => 'private']);
            exit;
        }

        if ($state === 'published') {
            if ($action === 'publish') {
                http_response_code(409);
                echo json_encode(['ok' => false, 'error' => 'not_pending']);
                exit;
            }
            $upd = $pdo->prepare("UPDATE hotel_feedback_queue SET state = 'private', decided_at = NOW() WHERE id = ? AND state = 'published'");
            $upd->execute([$id]);
            if ($upd->rowCount() === 1) {
                echo json_encode(['ok' => true, 'state' => 'private']);
                exit;
            }
            http_response_code(409);
            echo json_encode(['ok' => false, 'error' => 'state_conflict']);
            exit;
        }

        if ($state === 'pending') {
            $target = $action === 'publish' ? 'published' : 'private';
            $upd = $pdo->prepare("UPDATE hotel_feedback_queue SET state = ?, decided_at = NOW() WHERE id = ? AND state = 'pending'");
            $upd->execute([$target, $id]);
            if ($upd->rowCount() === 1) {
                echo json_encode(['ok' => true, 'state' => $target]);
                exit;
            }
            http_response_code(409);
            echo json_encode(['ok' => false, 'error' => 'state_conflict']);
            exit;
        }

        http_response_code(409);
        echo json_encode(['ok' => false, 'error' => 'unknown_state']);
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_op']);
    exit;
}

if ($method === 'GET') {
    run_inbox_sync($pdo, 420001);

    $view = $_GET['view'] ?? '';

    if ($view === 'meta') {
        $stmt = $pdo->query("SELECT id FROM hotel_feedback_queue WHERE survey_id = 420001 ORDER BY submitted_at DESC, id DESC");
        $ids = [];
        while ($r = $stmt->fetch()) {
            $ids[] = (int) $r['id'];
        }
        echo json_encode(['ok' => true, 'ids' => $ids]);
        exit;
    }

    if (isset($_GET['id']) && $_GET['id'] !== '') {
        $id = (int) $_GET['id'];
        $cols = resolve_survey_columns($pdo, 420001);
        $q8Col = $cols['Q8LIKED'] ?? null;
        $q9Col = $cols['Q9IMPROVE'] ?? null;

        $praiseExpr = $q8Col !== null ? "r.`{$q8Col}`" : "''";
        $complaintExpr = $q9Col !== null ? "r.`{$q9Col}`" : "''";

        $sql = "SELECT q.id, q.department, q.overall, q.nps, q.submitted_at, q.state,
                       COALESCE({$praiseExpr}, '') AS praise_raw,
                       COALESCE({$complaintExpr}, '') AS complaint_raw
                FROM hotel_feedback_queue q
                LEFT JOIN lime_survey_420001 r ON q.response_id = r.id
                WHERE q.id = ? AND q.survey_id = 420001";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'not_found']);
            exit;
        }

        echo json_encode([
            'ok' => true,
            'id' => (int) $row['id'],
            'department' => normalize_department($row['department']),
            'overall' => $row['overall'] !== null ? (int) $row['overall'] : null,
            'nps' => $row['nps'] !== null ? (int) $row['nps'] : null,
            'submittedAt' => (string) $row['submitted_at'],
            'state' => (string) $row['state'],
            'praise' => (string) ($row['praise_raw'] ?? ''),
            'complaint' => (string) ($row['complaint_raw'] ?? ''),
        ]);
        exit;
    }

    // Default: list view (no comment text)
    $stmt = $pdo->query("SELECT id, department, overall, nps, submitted_at, state FROM hotel_feedback_queue WHERE survey_id = 420001 ORDER BY submitted_at DESC, id DESC");
    $items = [];
    while ($row = $stmt->fetch()) {
        $items[] = [
            'id' => (int) $row['id'],
            'department' => normalize_department($row['department']),
            'overall' => $row['overall'] !== null ? (int) $row['overall'] : null,
            'nps' => $row['nps'] !== null ? (int) $row['nps'] : null,
            'submittedAt' => (string) $row['submitted_at'],
            'state' => (string) $row['state'],
        ];
    }

    echo json_encode(['ok' => true, 'items' => $items]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
