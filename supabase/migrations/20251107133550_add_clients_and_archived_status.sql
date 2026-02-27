/*
  # Add clients table and archive functionality

  1. New Tables
    - `clients` - For storing client information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
  2. Changes to existing tables
    - Add `client_id` to `sla_tickets` for client reference
    - Add `is_archived` to `sla_tickets` to track archived status
    - Modify `development_hours` to add `status_after` to track state changes

  3. Security
    - Enable RLS on `clients` table
    - Add policies for admin-only client management
    - Update policies on `sla_tickets` for archived tickets
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sla_tickets' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE sla_tickets ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sla_tickets' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE sla_tickets ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'development_hours' AND column_name = 'status_after'
  ) THEN
    ALTER TABLE development_hours ADD COLUMN status_after text;
  END IF;
END $$;
