-- Comprehensive fix for all critical security issues identified in security review (Fixed)

-- 1. Fix messages table - Only allow senders and receivers to access their messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;

CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  auth.uid() = receiver_id
)
WITH CHECK (
  auth.uid() = receiver_id
);

-- 2. Fix notifications table - Only allow users to access their own notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = user_id
);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  true  -- Allow system to create notifications, but only users can read their own
);

-- 3. Fix admin_accounts table - Only allow admins to access admin account info
DROP POLICY IF EXISTS "Only admins can view admin accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Only admin can insert" ON public.admin_accounts;
DROP POLICY IF EXISTS "Only current admins can view admin accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Only current admins can insert admin accounts" ON public.admin_accounts;

CREATE POLICY "Restricted admin accounts access"
ON public.admin_accounts
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_accounts WHERE is_admin = true
  )
);

CREATE POLICY "Restricted admin accounts insert"
ON public.admin_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.admin_accounts WHERE is_admin = true
  )
);

-- 4. Fix user_points table - Only allow users to access their own points
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;

CREATE POLICY "Users can view their own points"
ON public.user_points
FOR SELECT
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can insert their own points"
ON public.user_points
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own points"
ON public.user_points
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- 5. Fix trade_requests table - Only allow trade participants to access
DROP POLICY IF EXISTS "Users can view their trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can create trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can update received trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can cancel their trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can complete trades" ON public.trade_requests;

CREATE POLICY "Users can view their trade requests"
ON public.trade_requests
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can create trade requests"
ON public.trade_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can update received trade requests"
ON public.trade_requests
FOR UPDATE
USING (
  auth.uid() = receiver_id
)
WITH CHECK (
  status = ANY(ARRAY['accepted'::text, 'rejected'::text])
);

CREATE POLICY "Users can cancel their trade requests"
ON public.trade_requests
FOR UPDATE
USING (
  auth.uid() = sender_id
)
WITH CHECK (
  status = 'cancelled'::text
);

CREATE POLICY "Users can complete trades"
ON public.trade_requests
FOR UPDATE
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
)
WITH CHECK (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);