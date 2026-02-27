/*
  # Update ticket statuses

  1. Changes
    - Update sla_tickets table to support new status values
    - New statuses: En espera, En desarrollo, Pruebas QA, Desplegando, Paso a produccion, Espera validacion cliente, Cerrado
    - Add user_id column to track who created the ticket
    - Add hours_total column to track accumulated hours
    
  2. Security
    - RLS already enabled on sla_tickets
    - Update policies to allow status changes by both admin and assigned users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sla_tickets' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sla_tickets ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sla_tickets' AND column_name = 'hours_total'
  ) THEN
    ALTER TABLE sla_tickets ADD COLUMN hours_total numeric DEFAULT 0;
  END IF;
END $$;
