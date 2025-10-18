-- ═══════════════════════════════════════════════════════════════
-- SERVICIOS PREDEFINIDOS PARA TALLER MECÁNICO
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- NOTA: Reemplaza 'YOUR_ORGANIZATION_ID' con tu organization_id real
-- Puedes obtenerlo ejecutando: SELECT id FROM organizations LIMIT 1;

DO $$
DECLARE
  org_id uuid;
BEGIN
  -- Obtener el primer organization_id
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna organización';
  END IF;

  -- Verificar si ya existen servicios para esta organización
  IF EXISTS (SELECT 1 FROM services WHERE organization_id = org_id LIMIT 1) THEN
    RAISE NOTICE 'Ya existen servicios para esta organización. Saltando inserción.';
    RETURN;
  END IF;

  -- Insertar servicios de mantenimiento
  INSERT INTO services (organization_id, code, name, description, category, base_price, estimated_hours, is_active)
  VALUES
    -- MANTENIMIENTO PREVENTIVO
    (org_id, 'SRV-001', 'Cambio de Aceite', 'Cambio de aceite de motor y filtro', 'Mantenimiento', 350.00, 0.5, true),
    (org_id, 'SRV-002', 'Cambio de Filtros', 'Cambio de filtro de aire, aceite y combustible', 'Mantenimiento', 450.00, 1.0, true),
    (org_id, 'SRV-003', 'Afinación Menor', 'Afinación menor con revisión general', 'Mantenimiento', 850.00, 2.0, true),
    (org_id, 'SRV-004', 'Afinación Mayor', 'Afinación mayor con cambio de bujías y cables', 'Mantenimiento', 1500.00, 3.0, true),
    (org_id, 'SRV-005', 'Revisión 10,000 km', 'Revisión preventiva a los 10,000 km', 'Mantenimiento', 500.00, 1.5, true),
    
    -- FRENOS
    (org_id, 'SRV-010', 'Cambio de Balatas Delanteras', 'Cambio de balatas/pastillas delanteras', 'Frenos', 800.00, 1.0, true),
    (org_id, 'SRV-011', 'Cambio de Balatas Traseras', 'Cambio de balatas/pastillas traseras', 'Frenos', 750.00, 1.0, true),
    (org_id, 'SRV-012', 'Cambio de Discos de Freno', 'Cambio de discos de freno delanteros', 'Frenos', 2500.00, 2.0, true),
    (org_id, 'SRV-013', 'Rectificación de Discos', 'Rectificación de discos de freno', 'Frenos', 600.00, 1.0, true),
    (org_id, 'SRV-014', 'Sangrado de Frenos', 'Sangrado y cambio de líquido de frenos', 'Frenos', 400.00, 1.0, true),
    
    -- SUSPENSIÓN
    (org_id, 'SRV-020', 'Cambio de Amortiguadores', 'Cambio de amortiguadores delanteros o traseros', 'Suspensión', 3500.00, 3.0, true),
    (org_id, 'SRV-021', 'Alineación', 'Alineación de las 4 ruedas', 'Suspensión', 450.00, 1.0, true),
    (org_id, 'SRV-022', 'Balanceo', 'Balanceo de las 4 ruedas', 'Suspensión', 350.00, 0.5, true),
    (org_id, 'SRV-023', 'Cambio de Rótulas', 'Cambio de rótulas delanteras', 'Suspensión', 1200.00, 2.0, true),
    (org_id, 'SRV-024', 'Cambio de Terminales', 'Cambio de terminales de dirección', 'Suspensión', 800.00, 1.5, true),
    
    -- MOTOR
    (org_id, 'SRV-030', 'Diagnóstico de Motor', 'Diagnóstico completo con escáner automotriz', 'Motor', 500.00, 1.0, true),
    (org_id, 'SRV-031', 'Cambio de Banda de Distribución', 'Cambio de banda/cadena de distribución', 'Motor', 4500.00, 4.0, true),
    (org_id, 'SRV-032', 'Cambio de Bujías', 'Cambio de bujías de encendido', 'Motor', 600.00, 1.0, true),
    (org_id, 'SRV-033', 'Limpieza de Inyectores', 'Limpieza ultrasónica de inyectores', 'Motor', 1200.00, 2.0, true),
    (org_id, 'SRV-034', 'Cambio de Empaque de Cabeza', 'Cambio de empaque de cabeza del motor', 'Motor', 6500.00, 8.0, true),
    
    -- TRANSMISIÓN
    (org_id, 'SRV-040', 'Cambio de Aceite de Transmisión', 'Cambio de aceite de transmisión automática', 'Transmisión', 1200.00, 1.5, true),
    (org_id, 'SRV-041', 'Servicio de Transmisión', 'Servicio completo de transmisión', 'Transmisión', 2500.00, 3.0, true),
    (org_id, 'SRV-042', 'Cambio de Clutch', 'Cambio de clutch/embrague completo', 'Transmisión', 8500.00, 6.0, true),
    
    -- SISTEMA ELÉCTRICO
    (org_id, 'SRV-050', 'Cambio de Batería', 'Cambio de batería (no incluye batería)', 'Eléctrico', 200.00, 0.5, true),
    (org_id, 'SRV-051', 'Cambio de Alternador', 'Cambio de alternador (no incluye pieza)', 'Eléctrico', 800.00, 1.5, true),
    (org_id, 'SRV-052', 'Cambio de Motor de Arranque', 'Cambio de marcha/motor de arranque', 'Eléctrico', 700.00, 1.5, true),
    (org_id, 'SRV-053', 'Diagnóstico Eléctrico', 'Diagnóstico de sistema eléctrico', 'Eléctrico', 400.00, 1.0, true),
    
    -- AIRE ACONDICIONADO
    (org_id, 'SRV-060', 'Carga de Aire Acondicionado', 'Carga de gas refrigerante', 'Clima', 800.00, 1.0, true),
    (org_id, 'SRV-061', 'Servicio de Aire Acondicionado', 'Servicio completo de A/C con limpieza', 'Clima', 1500.00, 2.0, true),
    (org_id, 'SRV-062', 'Cambio de Compresor A/C', 'Cambio de compresor de aire acondicionado', 'Clima', 3500.00, 3.0, true),
    
    -- CARROCERÍA
    (org_id, 'SRV-070', 'Pintura de Panel', 'Pintura de un panel individual', 'Carrocería', 2500.00, 4.0, true),
    (org_id, 'SRV-071', 'Hojalatería Menor', 'Reparación menor de hojalatería', 'Carrocería', 1500.00, 3.0, true),
    (org_id, 'SRV-072', 'Pulido', 'Pulido completo del vehículo', 'Carrocería', 800.00, 2.0, true),
    
    -- NEUMÁTICOS
    (org_id, 'SRV-080', 'Cambio de Neumáticos', 'Cambio de 4 neumáticos (no incluye llantas)', 'Neumáticos', 300.00, 0.5, true),
    (org_id, 'SRV-081', 'Rotación de Neumáticos', 'Rotación de las 4 llantas', 'Neumáticos', 200.00, 0.5, true),
    (org_id, 'SRV-082', 'Reparación de Ponchadura', 'Reparación de ponchadura/pinchazo', 'Neumáticos', 150.00, 0.5, true);

  RAISE NOTICE 'Servicios insertados correctamente para organization_id: %', org_id;
END $$;

-- Verificar los servicios insertados
SELECT 
  code,
  name,
  category,
  base_price,
  estimated_hours
FROM services
ORDER BY code;
