
INSERT INTO users (name, email, password)
VALUES
('Anant Singh', 'anant@gmail.com', 'hashed_password_001'),
('Rahul Sharma', 'rahul@gmail.com', 'hashed_password_002'),
('Priya Verma', 'priya@gmail.com', 'hashed_password_003'),
('Aman Gupta', 'aman@gmail.com', 'hashed_password_004'),
('Sneha Mishra', 'sneha@gmail.com', 'hashed_password_005');


INSERT INTO medicines
(medicine_name, batch_number, manufacturer, mfg_date, expiry_date, mrp, barcode)
VALUES
('Paracetamol 500mg', 'PCM001', 'Sun Pharma',
 '2025-01-15', '2027-01-14', 25.50, '890100000001'),

('Azithromycin 500mg', 'AZM002', 'Cipla',
 '2025-03-10', '2027-03-09', 85.00, '890100000002'),

('Amoxicillin 500mg', 'AMX003', 'Mankind Pharma',
 '2025-02-20', '2027-02-19', 65.75, '890100000003'),

('Cetirizine 10mg', 'CTZ004', 'Dr. Reddy''s Laboratories',
 '2025-04-05', '2027-04-04', 18.00, '890100000004'),

('Ibuprofen 400mg', 'IBP005', 'Abbott',
 '2025-05-12', '2027-05-11', 42.50, '890100000005');


INSERT INTO verification
(user_id, medicine_id, result, confidence_score)
VALUES
(1, 1, 'Valid', 98.50),
(2, 2, 'Valid', 96.20),
(3, 3, 'Suspicious', 74.80),
(4, 4, 'Valid', 99.10),
(5, 5, 'Invalid', 42.60);

INSERT INTO reports
(user_id, medicine_image, description, status)
VALUES
(1, 'uploads/paracetamol.jpg',
 'Medicine packaging verified successfully',
 'Resolved'),

(2, 'uploads/azithromycin.jpg',
 'Barcode and medicine details verified',
 'Resolved'),

(3, 'uploads/amoxicillin.jpg',
 'Medicine batch information appears suspicious',
 'Under Review'),

(4, 'uploads/cetirizine.jpg',
 'Medicine details match the database',
 'Resolved'),

(5, 'uploads/ibuprofen.jpg',
 'Barcode could not be verified',
 'Pending');
