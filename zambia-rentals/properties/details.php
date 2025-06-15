<?php
require_once __DIR__.'/../includes/functions.php';
$id = (int)($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM properties WHERE id = ?');
$stmt->execute([$id]);
$property = $stmt->fetch();
if(!$property) {
    header('Location: /404.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($property['title']); ?></title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1><?php echo htmlspecialchars($property['title']); ?></h1>
<p><?php echo htmlspecialchars($property['city']); ?></p>
<p>ZMW <?php echo number_format($property['price'],2); ?></p>
<p><?php echo nl2br(htmlspecialchars($property['description'])); ?></p>
</body>
</html>
