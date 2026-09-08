-- Migration: 20260907204500_add_realtime_messages_broadcast_policies
-- Description: Allow authenticated users to publish (INSERT) and receive (SELECT) Realtime broadcast and presence messages on application topics while preserving private live-inspection isolation.

DROP POLICY IF EXISTS "authenticated_broadcast_insert" ON "realtime"."messages";
DROP POLICY IF EXISTS "authenticated_broadcast_select" ON "realtime"."messages";

-- Allow authenticated clients (students, instructors) to publish broadcast and presence messages to non-private channels
CREATE POLICY "authenticated_broadcast_insert"
ON "realtime"."messages"
FOR INSERT
TO authenticated
WITH CHECK (
    "extension" IN ('broadcast', 'presence')
    AND realtime.topic() NOT LIKE 'exam-attempt:%:live-inspection'
);

-- Allow authenticated clients to receive broadcast and presence messages from non-private channels
CREATE POLICY "authenticated_broadcast_select"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (
    "extension" IN ('broadcast', 'presence')
    AND realtime.topic() NOT LIKE 'exam-attempt:%:live-inspection'
);
