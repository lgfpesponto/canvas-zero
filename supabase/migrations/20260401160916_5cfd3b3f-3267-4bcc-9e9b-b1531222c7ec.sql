CREATE POLICY "Users can delete own verification codes" ON verification_codes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);