-- Alternative migration WITHOUT PostGIS (simpler, no spatial extension needed)
-- Use this if PostGIS extension is not available in your Supabase project

-- Create SOS Reports table
CREATE TABLE IF NOT EXISTS sos_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  people_count INTEGER NOT NULL CHECK (people_count > 0),
  urgency TEXT NOT NULL CHECK (urgency IN ('high', 'medium', 'low')),
  description TEXT DEFAULT '',
  has_vulnerable BOOLEAN DEFAULT false,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'rescued')),
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Create simple indexes for location-based queries (without PostGIS)
CREATE INDEX IF NOT EXISTS idx_sos_reports_lat ON sos_reports(lat);
CREATE INDEX IF NOT EXISTS idx_sos_reports_lon ON sos_reports(lon);
CREATE INDEX IF NOT EXISTS idx_sos_reports_lat_lon ON sos_reports(lat, lon);

-- Create index for status and urgency (for filtering)
CREATE INDEX IF NOT EXISTS idx_sos_reports_status ON sos_reports(status);
CREATE INDEX IF NOT EXISTS idx_sos_reports_urgency ON sos_reports(urgency);
CREATE INDEX IF NOT EXISTS idx_sos_reports_created_at ON sos_reports(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE sos_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read SOS reports (public data)
CREATE POLICY "Allow public read access" ON sos_reports
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to insert SOS reports (public can submit)
CREATE POLICY "Allow public insert access" ON sos_reports
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow updates (for status changes - can be restricted later)
CREATE POLICY "Allow public update access" ON sos_reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_sos_reports_updated_at
  BEFORE UPDATE ON sos_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

