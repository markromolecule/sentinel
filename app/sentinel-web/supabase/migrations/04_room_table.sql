-- =========================
-- ROOMS TABLE
-- =========================

CREATE TABLE public.rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(100) NOT NULL,
  room_code VARCHAR(20),
  institution_id UUID, -- References institutions(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(room_name, institution_id)
);

-- Index for institution filtering
CREATE INDEX idx_rooms_institution_id ON public.rooms(institution_id);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_rooms_updated_at 
BEFORE UPDATE ON public.rooms 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
