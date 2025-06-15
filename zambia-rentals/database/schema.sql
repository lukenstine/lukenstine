CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('tenant','landlord','admin') NOT NULL DEFAULT 'tenant'
);

CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rated_user_id INT NOT NULL,
    rater_id INT NOT NULL,
    stars TINYINT NOT NULL,
    comment VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rated_user_id) REFERENCES users(id),
    FOREIGN KEY (rater_id) REFERENCES users(id)
);

INSERT INTO users (email, password, role) VALUES
('landlord@example.com', '$2y$10$examplehashhereforlandlord', 'landlord'),
('tenant@example.com', '$2y$10$examplehashherefortenant', 'tenant');

INSERT INTO properties (user_id, title, city, price, description) VALUES
(1, 'Two Bedroom Apartment', 'Lusaka', 1500.00, 'Nice place in Lusaka');
