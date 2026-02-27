/*
  # Create SLA Tickets and Development Hours Tables

  1. New Tables
    - `sla_tickets`
      - `id` (uuid, primary key)
      - `ticket_number` (text, unique, required) - Unique identifier for the ticket
      - `title` (text, required) - Brief description of the ticket
      - `description` (text) - Detailed description of the work
      - `status` (text, default 'open') - Current status: open, in_progress, completed
      - `priority` (text, default 'medium') - Priority level: low, medium, high, critical
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `development_hours`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to sla_tickets) - Reference to the ticket
      - `developer_name` (text, required) - Name of the developer
      - `hours` (numeric, required) - Number of hours worked
      - `work_date` (date, required) - Date when the work was performed
      - `notes` (text) - Additional notes about the work
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since no auth is implemented)
    - Anyone can read, insert, update, and delete records
  
  3. Important Notes
    - Using numeric type for hours to allow decimal values (e.g., 2.5 hours)
    - Added indexes on foreign keys and frequently queried columns for performance
    - Status and priority fields use text with default values
    - Updated_at trigger ensures automatic timestamp updates on sla_tickets
*/

CREATE TABLE IF NOT EXISTS sla_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS development_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES sla_tickets(id) ON DELETE CASCADE,
  developer_name text NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0),
  work_date date NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_development_hours_ticket_id ON development_hours(ticket_id);
CREATE INDEX IF NOT EXISTS idx_development_hours_work_date ON development_hours(work_date);
CREATE INDEX IF NOT EXISTS idx_sla_tickets_status ON sla_tickets(status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sla_tickets_updated_at'
  ) THEN
    CREATE TRIGGER update_sla_tickets_updated_at
      BEFORE UPDATE ON sla_tickets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE sla_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sla_tickets"
  ON sla_tickets FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to sla_tickets"
  ON sla_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sla_tickets"
  ON sla_tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to sla_tickets"
  ON sla_tickets FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to development_hours"
  ON development_hours FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to development_hours"
  ON development_hours FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to development_hours"
  ON development_hours FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to development_hours"
  ON development_hours FOR DELETE
  USING (true);