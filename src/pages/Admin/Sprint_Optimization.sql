
-- ------------------------------------------
-- 1. PERFORMANCE: System-Wide Indexes
-- ------------------------------------------
-- Index for faster transaction volume calculation
CREATE INDEX idx_transactions_status ON transactions(status);

-- Index for faster flagged content counting
CREATE INDEX idx_flagged_content_status ON flagged_content(status);

-- Index for faster date lookups on handoffs
CREATE INDEX idx_facility_handoffs_date ON facility_handoffs(created_at);

-- Index for facility utilization lookups
CREATE INDEX idx_facility_utilization_date ON analytics_facility_utilization(check_date);

-- Create the GIN Index for the JSONB payload
-- This allows the UI to instantly search inside the JSON 'details' column
CREATE INDEX idx_audit_logs_details_gin ON audit_logs USING GIN (details);

-- ------------------------------------------
-- 2. AUTOMATION: Scheduled Tasks (pg_cron)
-- ------------------------------------------
-- First, ensure the pg_cron extension is enabled 
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every day at midnight (22:00 UTC = Midnight SAST)
SELECT cron.schedule(
    'daily-facility-utilization-snapshot', 
    '0 22 * * *',                          
    'SELECT calculate_daily_facility_utilization();' 
);

-- ------------------------------------------
-- 3. WORKFLOW AUTOMATION: Postgres Triggers
-- ------------------------------------------
-- Create the function that automatically stamps the resolved time
CREATE OR REPLACE FUNCTION set_resolved_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if the status changes FROM pending TO something else
    IF NEW.status IN ('reviewed', 'dismissed', 'removed') AND OLD.status = 'pending' THEN
        NEW.resolved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the flagged_content table
CREATE TRIGGER trigger_update_resolved_at
BEFORE UPDATE ON flagged_content
FOR EACH ROW
EXECUTE FUNCTION set_resolved_at_timestamp();

-- ------------------------------------------
-- 4. SECURITY: Immutable Audit Logs
-- ------------------------------------------
-- Create the Immutability Function
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY ALERT: Audit logs are immutable and cannot be modified or deleted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach the Immutability Trigger
CREATE TRIGGER trigger_immutable_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- ------------------------------------------
-- 5. DATA INTEGRITY: Constraints & Views
-- ------------------------------------------
-- Prevent duplicate exception dates (e.g., adding Christmas twice)
ALTER TABLE facility_exceptions
ADD CONSTRAINT unique_exception_date UNIQUE (exception_date);

-- Create the "Available Slots" View (Protects UI from complex joins)
CREATE OR REPLACE VIEW vw_available_facility_slots AS
WITH date_series AS (
    -- Generate the next 30 days dynamically
    SELECT (CURRENT_DATE + generate_series(0, 30))::DATE AS check_date
),
daily_capacity AS (
    SELECT 
        d.check_date,
        fc.open_time,
        fc.close_time,
        -- Calculate total physical capacity for the day based on config
        ((EXTRACT(EPOCH FROM (fc.close_time - fc.open_time)) / 60) / fc.slot_duration_minutes)::INTEGER * fc.max_capacity_per_slot AS total_daily_capacity
    FROM date_series d
    JOIN facility_config fc ON EXTRACT(DOW FROM d.check_date) = fc.day_of_week
    WHERE fc.is_active = TRUE
),
booked_slots AS (
    SELECT 
        booking_date::DATE AS check_date,
        COUNT(*) AS total_booked
    FROM facility_bookings
    WHERE status IN ('pending', 'confirmed')
    GROUP BY booking_date::DATE
)
SELECT 
    dc.check_date,
    -- If it's a holiday, return 0 slots. Otherwise, subtract bookings from daily capacity.
    CASE 
        WHEN fe.is_closed = TRUE THEN 0
        ELSE COALESCE(dc.total_daily_capacity, 0) - COALESCE(bs.total_booked, 0)
    END AS slots_available,
    CASE WHEN fe.is_closed = TRUE THEN TRUE ELSE FALSE END AS is_holiday,
    fe.reason AS holiday_reason
FROM daily_capacity dc
LEFT JOIN facility_exceptions fe ON dc.check_date = fe.exception_date
LEFT JOIN booked_slots bs ON dc.check_date = bs.check_date;