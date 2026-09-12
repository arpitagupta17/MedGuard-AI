SELECT* FROM VERIFICATION;


SELECT* FROM USERS;


SELECT* FROM MEDICINES;


SELECT* FROM REPORTS;




SELECT
    u.name AS user_name,
    m.medicine_name,
    m.batch_number,
    m.manufacturer,
    v.result,
    v.confidence_score
FROM verification v
JOIN users u
    ON v.user_id = u.user_id
JOIN medicines m
    ON v.medicine_id = m.medicine_id;