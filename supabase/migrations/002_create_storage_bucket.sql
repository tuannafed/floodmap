-- Create storage bucket for SOS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sos-images', 'sos-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to images
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sos-images');

-- Policy: Allow public upload (for SOS submissions)
CREATE POLICY "Allow public upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'sos-images');

-- Policy: Allow public update (for replacing images)
CREATE POLICY "Allow public update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'sos-images');

