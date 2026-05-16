


CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    total_tx_volume DECIMAL(12,2);
    pending_flags INTEGER;
    avg_facility_utilization DECIMAL(5,2);
    recent_handoffs INTEGER;
    result JSON;
BEGIN
    -- 1. Calculate Total Transaction Volume (Only completed/accepted trades)
    SELECT COALESCE(SUM(total_amount), 0) INTO total_tx_volume 
    FROM transactions 
    WHERE status IN ('accepted', 'completed');

    -- 2. Count Pending Flagged Content (Needs Admin Attention)
    SELECT COUNT(*) INTO pending_flags 
    FROM flagged_content 
    WHERE status = 'pending';

    -- 3. Calculate Average Facility Utilization for the last 7 days
    SELECT COALESCE(AVG(utilization_percentage), 0) INTO avg_facility_utilization
    FROM analytics_facility_utilization
    WHERE check_date >= CURRENT_DATE - INTERVAL '7 days';

    -- 4. Count successful handoffs in the last 30 days
    SELECT COUNT(*) INTO recent_handoffs
    FROM facility_handoffs
    WHERE created_at >= NOW() - INTERVAL '30 days';

    -- Build the final JSON object to send to the frontend
    result := json_build_object(
        'total_transaction_volume', total_tx_volume,
        'pending_flagged_items', pending_flags,
        'weekly_facility_utilization_pct', avg_facility_utilization,
        'monthly_successful_handoffs', recent_handoffs
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;
