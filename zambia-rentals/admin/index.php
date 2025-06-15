<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

$stmt = $pdo->query('SELECT COUNT(*) as users FROM users');
$users = $stmt->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Admin Dashboard</h1>
<p>Total users: <?php echo $users; ?></p>
</body>
</html>
