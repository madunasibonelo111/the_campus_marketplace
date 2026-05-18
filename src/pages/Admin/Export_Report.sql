--This function takes a start date, an end date, and the type of report the admin wants (either 'transactions' or 'facility'). 
--It securely gathers that specific data and packages it into a clean JSON array ready to be converted to a CSV file.
CREATE OR REPLACE FUNCTION generate_export_report(
    p_start_date DATE,
    p_end_date DATE,
    p_report_type TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    result JSON;
BEGIN
    -- SECURITY CHECK
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
    IF v_user_role != 'admin' OR v_user_role IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can export reports.';
    END IF;

    -- Generate Data Based on Report Type
    IF p_report_type = 'transactions' THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
        FROM (
            SELECT id, listing_id, buyer_id, seller_id, status, offer_amount, type, created_at
            FROM transactions
            WHERE created_at::DATE >= p_start_date AND created_at::DATE <= p_end_date
            ORDER BY created_at DESC
        ) t;

    ELSIF p_report_type = 'facility' THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
        FROM (
            SELECT check_date, total_slots_available, total_slots_booked, utilization_percentage
            FROM analytics_facility_utilization
            WHERE check_date >= p_start_date AND check_date <= p_end_date
            ORDER BY check_date DESC
        ) t;

    ELSE
        RAISE EXCEPTION 'Invalid report type. Please select ''transactions'' or ''facility''.';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;