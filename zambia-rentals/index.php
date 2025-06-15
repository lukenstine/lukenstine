<?php
require_once __DIR__.'/includes/functions.php';

$stmt = $pdo->query('SELECT * FROM properties LIMIT 10');
$properties = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Zambia Rentals</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<header>
    <h1>Zambia Rentals</h1>
    <?php if(is_logged_in()): ?>
        <a href="/profile/index.php">Profile</a> |
        <a href="/logout.php">Logout</a>
    <?php else: ?>
        <a href="/login.php">Login</a> |
        <a href="/register.php">Register</a>
    <?php endif; ?>
</header>
<main>
    <h2>Available Properties</h2>
    <div class="properties">
        <?php foreach($properties as $property): ?>
        <div class="property">
            <h3><?php echo htmlspecialchars($property['title']); ?></h3>
            <p><?php echo htmlspecialchars($property['city']); ?></p>
            <p>ZMW <?php echo number_format($property['price'],2); ?></p>
            <a href="/properties/details.php?id=<?php echo $property['id']; ?>">View</a>
        </div>
        <?php endforeach; ?>
    </div>
</main>
</body>
</html>
