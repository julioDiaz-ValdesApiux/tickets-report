/*
  # Add Users and Tickets Assignments Tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique, required)
      - `password` (text, required) - Will store hashed passwords
      - `role` (text, default 'user') - Can be 'user' or 'admin'
      - `created_at` (timestamptz, default now())
    
    - `tickets_assignments`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to sla_tickets)
      - `user_id` (uuid, foreign key to users)
      - `created_at` (timestamptz, default now())
      - Composite unique constraint to prevent duplicate assignments

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (authentication handled at application level)
  
  3. Important Notes
    - Users table is empty by default - admin adds users manually
    - Passwords should be hashed before storing
    - Role-based access control happens in the application
    - Tickets assignments link users to specific tickets
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES sla_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tickets_assignments_user_id ON tickets_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignments_ticket_id ON tickets_assignments(ticket_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to tickets_assignments"
  ON tickets_assignments FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to tickets_assignments"
  ON tickets_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to tickets_assignments"
  ON tickets_assignments FOR DELETE
  USING (true);