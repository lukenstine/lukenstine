<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Profile</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Profile</h1>
<p>Email: <?php echo htmlspecialchars($user['email']); ?></p>
<p>Role: <?php echo htmlspecialchars($user['role']); ?></p>
</body>
</html>
