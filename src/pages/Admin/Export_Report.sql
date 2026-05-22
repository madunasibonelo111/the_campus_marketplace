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

    /* =========================
       DATE VALIDATION
    ========================== */

    IF p_start_date IS NULL
       OR p_end_date IS NULL THEN

        RAISE EXCEPTION
        'Both start date and end date are required.';
    END IF;

    IF p_start_date > p_end_date THEN

        RAISE EXCEPTION
        'Invalid date range: Start date cannot be after end date.';
    END IF;

    IF p_start_date < DATE '2020-01-01' THEN

        RAISE EXCEPTION
        'Invalid start date.';
    END IF;

    /* =========================
       SECURITY CHECK
    ========================== */

    SELECT role
    INTO v_user_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_user_role IS NULL
       OR v_user_role != 'admin' THEN

        RAISE EXCEPTION
        'Access denied.';
    END IF;

    /* =========================
       TRANSACTIONS
    ========================== */

    IF p_report_type = 'transactions' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                id,
                listing_id,
                buyer_id,
                seller_id,
                type,
                status,
                total_amount,
                amount_paid,
                remaining_balance,
                created_at

            FROM transactions

            WHERE created_at::DATE
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY created_at DESC

        ) t;

    /* =========================
       LISTINGS
    ========================== */

    ELSIF p_report_type = 'listings' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                id,
                title,
                price,
                listing_type,
                condition,
                status,
                created_at

            FROM listings

            WHERE created_at::DATE
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY created_at DESC

        ) t;

    /* =========================
       FLAGGED CONTENT
    ========================== */

    ELSIF p_report_type = 'flagged_content' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                id,
                content_type,
                reason,
                status,
                moderator_notes,
                created_at,
                resolved_at

            FROM flagged_content

            WHERE created_at::DATE
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY created_at DESC

        ) t;

    /* =========================
       PAYMENTS / REVENUE
    ========================== */

    ELSIF p_report_type = 'payments' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                id,
                transaction_id,
                amount,
                method,
                status,
                paid_at,
                created_at

            FROM payments

            WHERE created_at::DATE
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY created_at DESC

        ) t;

    /* =========================
       FACILITY REPORTS
    ========================== */

    ELSIF p_report_type = 'facility' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                check_date,
                total_slots_available,
                total_slots_booked,
                utilization_percentage

            FROM analytics_facility_utilization

            WHERE check_date
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY check_date DESC

        ) t;

    /* =========================
       CATEGORY TRENDS
    ========================== */

    ELSIF p_report_type = 'category_trends' THEN

        SELECT COALESCE(
            json_agg(row_to_json(t)),
            '[]'::json
        )
        INTO result
        FROM (

            SELECT
                category_id,
                transaction_count,
                total_volume,
                report_date

            FROM analytics_category_trends

            WHERE report_date
            BETWEEN p_start_date
            AND p_end_date

            ORDER BY report_date DESC

        ) t;

    ELSE

        RAISE EXCEPTION
        'Invalid report type.';

    END IF;

    RETURN result;

END;
$$ LANGUAGE plpgsql;