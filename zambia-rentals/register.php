<?php
require_once __DIR__.'/includes/functions.php';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $role = $_POST['role'] ?? 'tenant';
    if (register_user($email, $password, $role)) {
        header('Location: /login.php');
        exit();
    } else {
        $error = 'Registration failed';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Register</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<h1>Register</h1>
<?php if($error): ?>
<p class="error"><?php echo $error; ?></p>
<?php endif; ?>
<form method="post">
    <label>Email <input type="email" name="email" required></label><br>
    <label>Password <input type="password" name="password" required></label><br>
    <label>Role
        <select name="role">
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
        </select>
    </label><br>
    <button type="submit">Register</button>
</form>
</body>
</html>
