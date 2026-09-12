CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE medicines (
    medicine_id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL,
    batch_number VARCHAR(100),
    manufacturer VARCHAR(150),
    mfg_date DATE,
    expiry_date DATE,
    mrp NUMERIC(10,2),
    barcode VARCHAR(100) UNIQUE
);

CREATE TABLE verification (
    verification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    medicine_id INT,
    result VARCHAR(50) NOT NULL,
    confidence_score NUMERIC(5,2),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id)
        ON DELETE SET NULL
);

CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    medicine_image TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);