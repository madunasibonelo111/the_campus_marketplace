# Sprint 4 Backend Architecture & API Guide

Hey team! Since I am handling the database architecture for Sprint 4, I wanted to share the setup. To make the frontend work easier and keep our database secure, we are using a **Database-First approach (RPC Functions)**.

This means nobody needs to write complex Supabase queries or multi-table joins in React! You just call the specific function for your user story.

## User Story 1: Analytics (Dineo & Kelly)

**RPC Function:**  
`supabase.rpc('get_admin_dashboard_stats')`

## User Story 2: Moderation (Sibonelo)

**Fetch RPC:**  
`supabase.rpc('get_pending_flags')`

**Action RPC:**  
`supabase.rpc('resolve_flagged_item')`

> **Note for Sibonelo:** The database has triggers to automatically handle the timestamps and immutable audit logs. You just need to call the action function when a button is clicked!

## User Story 3: Exports (Sandisiwe)

**RPC Function:**  
`supabase.rpc('generate_export_report')`

> **Note for Sandisiwe:** This function handles the JSON aggregation. You can just pass it the date ranges from your UI form and convert the output to CSV.

---

Let's crush Sprint 4! Let me know if anyone needs me to tweak the database functions for their components.