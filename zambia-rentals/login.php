<?php
require_once __DIR__.'/includes/functions.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    if (login_user($email, $password)) {
        header('Location: /index.php');
        exit();
    } else {
        $error = 'Invalid credentials';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Login</h1>
<?php if($error): ?>
<p class="error"><?php echo $error; ?></p>
<?php endif; ?>
<form method="post">
    <label>Email <input type="email" name="email" required></label><br>
    <label>Password <input type="password" name="password" required></label><br>
    <button type="submit">Login</button>
</form>
</body>
</html>
