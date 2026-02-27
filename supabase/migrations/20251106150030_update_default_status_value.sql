/*
  # Update default status for sla_tickets

  1. Changes
    - Update default status from 'open' to 'waiting'
    - This aligns with the new status values
*/

ALTER TABLE sla_tickets ALTER COLUMN status SET DEFAULT 'waiting';
