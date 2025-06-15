<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

$content = $_POST['content'] ?? '';
$receiver_id = (int)($_POST['receiver_id'] ?? 0);
if ($content && $receiver_id) {
    $stmt = $pdo->prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)');
    $stmt->execute([$_SESSION['user_id'], $receiver_id, $content]);
}
header('Location: index.php');
?>
