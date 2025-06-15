<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

// fetch messages
$stmt = $pdo->prepare('SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) ORDER BY created_at DESC LIMIT 20');
$stmt->execute([$_SESSION['user_id'], $_SESSION['user_id']]);
$messages = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Messages</title>
    <link rel="stylesheet" href="/assets/css/style.css">
    <script src="/assets/js/main.js" defer></script>
</head>
<body>
<h1>Messages</h1>
<div id="chat">
    <?php foreach($messages as $msg): ?>
        <div class="msg">
            <strong><?php echo $msg['sender_id'] == $_SESSION['user_id'] ? 'Me' : 'Them'; ?>:</strong>
            <?php echo htmlspecialchars($msg['content']); ?>
        </div>
    <?php endforeach; ?>
</div>
<form id="chat-form" method="post" action="send.php">
    <input type="text" name="content" required>
    <input type="hidden" name="receiver_id" value="1"><!-- demo -->
    <button type="submit">Send</button>
</form>
</body>
</html>
