<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

$stmt = $pdo->prepare('SELECT * FROM ratings WHERE rated_user_id = ?');
$stmt->execute([$_SESSION['user_id']]);
$ratings = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Ratings</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Your Ratings</h1>
<ul>
<?php foreach($ratings as $r): ?>
    <li><?php echo htmlspecialchars($r['comment']); ?> - <?php echo $r['stars']; ?> stars</li>
<?php endforeach; ?>
</ul>
</body>
</html>
