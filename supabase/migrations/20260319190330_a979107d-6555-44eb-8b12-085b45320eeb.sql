ALTER TABLE public.profiles ADD COLUMN verificado boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET verificado = true;

CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  destination text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own codes"
  ON public.verification_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own codes"
  ON public.verification_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());