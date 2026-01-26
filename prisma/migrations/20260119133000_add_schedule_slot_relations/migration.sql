-- Drop the text fields that are no longer needed
ALTER TABLE "schedule_slots" DROP COLUMN IF EXISTS "teacher";
ALTER TABLE "schedule_slots" DROP COLUMN IF EXISTS "group";

-- Add foreign key constraints
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
