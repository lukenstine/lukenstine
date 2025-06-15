<?php
require_once __DIR__.'/../includes/functions.php';
redirect_if_not_logged_in();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'] ?? '';
    $city = $_POST['city'] ?? '';
    $price = (float)($_POST['price'] ?? 0);
    $description = $_POST['description'] ?? '';
    $stmt = $pdo->prepare('INSERT INTO properties (user_id, title, city, price, description) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$_SESSION['user_id'], $title, $city, $price, $description]);
    header('Location: /properties/index.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Manage Properties</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Add Property</h1>
<form method="post">
    <label>Title <input type="text" name="title" required></label><br>
    <label>City
        <select name="city">
            <option value="Lusaka">Lusaka</option>
            <option value="Kitwe">Kitwe</option>
            <option value="Ndola">Ndola</option>
        </select>
    </label><br>
    <label>Price <input type="number" name="price" step="0.01" required></label><br>
    <label>Description<br><textarea name="description"></textarea></label><br>
    <button type="submit">Save</button>
</form>
</body>
</html>
