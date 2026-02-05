-- ============================================
-- QUERY: Ver números de Twilio asignados
-- ============================================
-- 
-- Esta query muestra qué números de Twilio están asignados
-- a cada organización en la base de datos.
--
-- NOTA: Los números reales en Twilio se verifican vía API,
-- no están almacenados en la base de datos.
-- ============================================

-- Ver números asignados por organización
SELECT 
    omc.organization_id,
    o.name as organization_name,
    omc.sms_enabled,
    omc.sms_twilio_number,
    omc.sms_twilio_sid,
    omc.sms_provider,
    omc.sms_webhook_url,
    omc.sms_monthly_cost_usd,
    omc.sms_per_message_cost_mxn,
    omc.sms_activated_at,
    omc.updated_at
FROM organization_messaging_config omc
LEFT JOIN organizations o ON o.id = omc.organization_id
WHERE omc.sms_enabled = true
    AND omc.sms_twilio_number IS NOT NULL
ORDER BY omc.updated_at DESC;

-- Ver todas las configuraciones de SMS (incluyendo deshabilitadas)
SELECT 
    omc.organization_id,
    o.name as organization_name,
    omc.sms_enabled,
    omc.sms_twilio_number,
    omc.sms_twilio_sid,
    CASE 
        WHEN omc.sms_twilio_number IS NOT NULL THEN 'Asignado'
        WHEN omc.sms_enabled = true THEN 'Habilitado pero sin número'
        ELSE 'Deshabilitado'
    END as status
FROM organization_messaging_config omc
LEFT JOIN organizations o ON o.id = omc.organization_id
ORDER BY omc.updated_at DESC;

-- Contar números asignados por país (basado en prefijo)
SELECT 
    CASE 
        WHEN sms_twilio_number LIKE '+52%' THEN 'México (+52)'
        WHEN sms_twilio_number LIKE '+57%' THEN 'Colombia (+57)'
        WHEN sms_twilio_number LIKE '+54%' THEN 'Argentina (+54)'
        WHEN sms_twilio_number LIKE '+56%' THEN 'Chile (+56)'
        WHEN sms_twilio_number LIKE '+51%' THEN 'Perú (+51)'
        WHEN sms_twilio_number LIKE '+55%' THEN 'Brasil (+55)'
        WHEN sms_twilio_number LIKE '+593%' THEN 'Ecuador (+593)'
        WHEN sms_twilio_number LIKE '+598%' THEN 'Uruguay (+598)'
        WHEN sms_twilio_number LIKE '+506%' THEN 'Costa Rica (+506)'
        WHEN sms_twilio_number LIKE '+1%' THEN 'Toll-Free (+1)'
        ELSE 'Otro'
    END as country,
    COUNT(*) as total_numbers,
    STRING_AGG(sms_twilio_number, ', ') as phone_numbers
FROM organization_messaging_config
WHERE sms_enabled = true 
    AND sms_twilio_number IS NOT NULL
GROUP BY 
    CASE 
        WHEN sms_twilio_number LIKE '+52%' THEN 'México (+52)'
        WHEN sms_twilio_number LIKE '+57%' THEN 'Colombia (+57)'
        WHEN sms_twilio_number LIKE '+54%' THEN 'Argentina (+54)'
        WHEN sms_twilio_number LIKE '+56%' THEN 'Chile (+56)'
        WHEN sms_twilio_number LIKE '+51%' THEN 'Perú (+51)'
        WHEN sms_twilio_number LIKE '+55%' THEN 'Brasil (+55)'
        WHEN sms_twilio_number LIKE '+593%' THEN 'Ecuador (+593)'
        WHEN sms_twilio_number LIKE '+598%' THEN 'Uruguay (+598)'
        WHEN sms_twilio_number LIKE '+506%' THEN 'Costa Rica (+506)'
        WHEN sms_twilio_number LIKE '+1%' THEN 'Toll-Free (+1)'
        ELSE 'Otro'
    END
ORDER BY total_numbers DESC;
