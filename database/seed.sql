-- ==============================================================================
-- SmeltIQ Master Seeds & Mock Test Data
-- Steel Plant Approved Logistics Vendors & Sample Audit Movements
-- ==============================================================================

-- Seed Approved Vendors for Vizag Steel / SmeltIQ Plant Gates
INSERT INTO vendors (vendor_code, vendor_name, is_active, contact_phone, contact_email) VALUES
('VEND-TATALOG-01', 'Tata Steel Supply Chain & Freight Logistics', TRUE, '+91-891-2567890', 'dispatch@tatalogistics.co.in'),
('VEND-JINDAL-02', 'Jindal Heavy Transporters & Bulk Cargo Pvt Ltd', TRUE, '+91-891-2789123', 'operations@jindaltrans.com'),
('VEND-VIZAG-03', 'Vizag Coastal Freight Carriers', TRUE, '+91-891-2894567', 'fleet@vizagfreight.com'),
('VEND-APEX-04', 'Apex Ore & Minerals Haulage Ltd', TRUE, '+91-891-2345678', 'gate-desk@apexhaulage.in'),
('VEND-BLACKLIST-99', 'Defunct Southern Roadways (Blacklisted)', FALSE, '+91-891-2999000', 'blocked@southernroadways.org')
ON CONFLICT (vendor_code) DO NOTHING;

-- Seed Sample Historic Audit Log Entries for demonstration
INSERT INTO gate_movements (
    gate_id,
    movement_type,
    vehicle_number,
    ocr_confidence,
    owner_name,
    vendor_id,
    rc_status,
    puc_valid_until,
    compliance_status,
    rejection_reasons,
    raw_surepass_payload,
    guard_id,
    created_at
) VALUES 
(
    'GATE-NORTH-01',
    'ENTRY',
    'AP31TJ9988',
    96.4,
    'RAMESH CHANDRA SHARMA',
    (SELECT id FROM vendors WHERE vendor_code = 'VEND-TATALOG-01' LIMIT 1),
    'ACTIVE',
    CURRENT_DATE + INTERVAL '120 days',
    'ALLOWED',
    '{}',
    '{"status_code": 200, "success": true, "data": {"rc_number": "AP31TJ9988", "rc_status": "ACTIVE", "owner_name": "RAMESH CHANDRA SHARMA", "vehicle_class": "Heavy Goods Vehicle", "puc_valid_upto": "2027-02-15", "insurance_upto": "2027-05-30"}}'::jsonb,
    'GUARD-8812',
    NOW() - INTERVAL '3 hours'
),
(
    'GATE-NORTH-01',
    'ENTRY',
    'MH12AB5678',
    92.1,
    'SURESH TRUCKING CO.',
    (SELECT id FROM vendors WHERE vendor_code = 'VEND-JINDAL-02' LIMIT 1),
    'ACTIVE',
    CURRENT_DATE - INTERVAL '15 days',
    'DENIED',
    ARRAY['Pollution Under Control (PUC) certificate expired on ' || TO_CHAR(CURRENT_DATE - INTERVAL '15 days', 'YYYY-MM-DD')],
    '{"status_code": 200, "success": true, "data": {"rc_number": "MH12AB5678", "rc_status": "ACTIVE", "owner_name": "SURESH TRUCKING CO.", "vehicle_class": "Multi-Axle Truck", "puc_valid_upto": "2026-09-27", "insurance_upto": "2027-01-10"}}'::jsonb,
    'GUARD-8812',
    NOW() - INTERVAL '1 hour 45 minutes'
),
(
    'GATE-EAST-02',
    'ENTRY',
    'AP31XX0001',
    89.8,
    'VIJAYAWADA ROADWAYS LTD',
    (SELECT id FROM vendors WHERE vendor_code = 'VEND-VIZAG-03' LIMIT 1),
    'SUSPENDED',
    CURRENT_DATE + INTERVAL '45 days',
    'OVERRIDDEN',
    ARRAY['Vehicle Registration Certificate (RC) status is SUSPENDED (expected ACTIVE)'],
    '{"status_code": 200, "success": true, "data": {"rc_number": "AP31XX0001", "rc_status": "SUSPENDED", "owner_name": "VIJAYAWADA ROADWAYS LTD", "vehicle_class": "Heavy Goods Vehicle", "puc_valid_upto": "2026-11-26"}}'::jsonb,
    'GUARD-9014',
    NOW() - INTERVAL '40 minutes'
);

-- Update the overridden movement with supervisor details
UPDATE gate_movements 
SET override_reason = 'Emergency slag disposal vehicle authorized by Shift Incharge Capt. Rao',
    supervisor_code = 'SUP-VSP-9901',
    overridden_at = NOW() - INTERVAL '35 minutes'
WHERE vehicle_number = 'AP31XX0001';
