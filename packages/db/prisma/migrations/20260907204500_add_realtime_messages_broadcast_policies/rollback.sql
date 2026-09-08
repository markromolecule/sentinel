-- Rollback for 20260907204500_add_realtime_messages_broadcast_policies

DROP POLICY IF EXISTS "authenticated_broadcast_insert"
ON "realtime"."messages";

DROP POLICY IF EXISTS "authenticated_broadcast_select"
ON "realtime"."messages";
