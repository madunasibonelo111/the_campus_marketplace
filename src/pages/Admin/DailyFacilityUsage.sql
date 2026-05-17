--links to the analytics_facility_utilization table
CREATE OR REPLACE FUNCTION calculate_daily_facility_utilization()
RETURNS VOID AS $$
DECLARE
    booked_slots INTEGER;
    available_slots INTEGER := 40; -- Assuming 8 hours open * 5 slots per hour
    util_pct DECIMAL(5,2);
BEGIN
    -- Count how many drop-offs/collections were booked for today
    SELECT COUNT(*) INTO booked_slots
    FROM facility_bookings
    WHERE booking_date::DATE = CURRENT_DATE;

    -- Calculate percentage
    IF available_slots > 0 THEN
        util_pct := (booked_slots::DECIMAL / available_slots::DECIMAL) * 100;
    ELSE
        util_pct := 0;
    END IF;

    -- Insert or Update the snapshot table
    INSERT INTO analytics_facility_utilization (check_date, total_slots_available, total_slots_booked, utilization_percentage)
    VALUES (CURRENT_DATE, available_slots, booked_slots, util_pct)
    ON CONFLICT (id) DO UPDATE 
    SET total_slots_booked = EXCLUDED.total_slots_booked,
        utilization_percentage = EXCLUDED.utilization_percentage;
END;
$$ LANGUAGE plpgsql;