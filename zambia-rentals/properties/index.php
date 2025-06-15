<?php
require_once __DIR__.'/../includes/functions.php';

$city = $_GET['city'] ?? '';
if($city) {
    $stmt = $pdo->prepare('SELECT * FROM properties WHERE city = ?');
    $stmt->execute([$city]);
} else {
    $stmt = $pdo->query('SELECT * FROM properties');
}
$properties = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Properties</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Properties</h1>
<form method="get">
    <label>City
        <select name="city">
            <option value="">All</option>
            <option value="Lusaka">Lusaka</option>
            <option value="Kitwe">Kitwe</option>
            <option value="Ndola">Ndola</option>
        </select>
    </label>
    <button type="submit">Filter</button>
</form>
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
</body>
</html>
