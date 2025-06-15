<?php
require_once __DIR__.'/db.php';
session_start();

function is_logged_in() {
    return isset($_SESSION['user_id']);
}

function redirect_if_not_logged_in() {
    if (!is_logged_in()) {
        header('Location: /login.php');
        exit();
    }
}

function register_user($email, $password, $role) {
    global $pdo;
    $stmt = $pdo->prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    $hash = password_hash($password, PASSWORD_DEFAULT);
    return $stmt->execute([$email, $hash, $role]);
}

function login_user($email, $password) {
    global $pdo;
    $stmt = $pdo->prepare('SELECT id, password FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        return true;
    }
    return false;
}

function logout_user() {
    session_destroy();
}
?>
