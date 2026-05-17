# Analytics Dashboard API Contract

## Overview
The Admin Dashboard analytics are handled securely on the backend via a Supabase RPC function. The frontend does not need to query individual tables.

---

# How to Fetch Data

Use the Supabase RPC method to call the secure function:

```javascript
const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
```

---

# Expected Response Format

The database will return a single JSON object containing all required metrics.

```json
{
  "total_transaction_volume": 12500.50,
  "pending_flagged_items": 3,
  "weekly_facility_utilization_pct": 85.5,
  "monthly_successful_handoffs": 42
}
```

---

# Security Note

This function is protected by Row Level Security (RLS) and `SECURITY DEFINER`.

If a user who is not logged in as an `admin` attempts to call this function, it will throw an `Access Denied` exception.

Ensure your React UI handles this error state gracefully.

---

# Analytics API Documentation (User Story 1)

## Overview

The Admin Analytics dashboard data is calculated securely on the backend via a Supabase RPC function.

---

## How to Fetch Data

In the `AnalyticsView.jsx` component, call this function inside a `useEffect`:

```javascript
const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
```

---

## Expected Response Format

The function returns a single JSON object.

You can map these exactly to the Stat Cards in the UI:

```json
{
  "total_transaction_volume": 12500.50,
  "pending_flagged_items": 3,
  "weekly_facility_utilization_pct": 85.5,
  "monthly_successful_handoffs": 42
}
```