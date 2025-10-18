-- Query 1: Total de órdenes en la BD
SELECT status, COUNT(*) as total
FROM work_orders
GROUP BY status
ORDER BY status;

-- Query 2: Órdenes por workshop (si aplica)
SELECT workshop_id, status, COUNT(*) as total
FROM work_orders
GROUP BY workshop_id, status
ORDER BY workshop_id, status;

-- Query 3: Órdenes creadas hoy
SELECT status, COUNT(*) as total
FROM work_orders
WHERE created_at >= CURRENT_DATE
GROUP BY status;
