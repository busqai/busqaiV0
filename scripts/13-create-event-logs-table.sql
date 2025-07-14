-- Create event logs table for analytics
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log events
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_name VARCHAR(100),
  p_event_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.event_logs (user_id, event_name, event_data)
  VALUES (auth.uid(), p_event_name, p_event_data);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own events" ON public.event_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own events" ON public.event_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS event_logs_user_id_idx ON public.event_logs(user_id);
CREATE INDEX IF NOT EXISTS event_logs_event_name_idx ON public.event_logs(event_name);
CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON public.event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS event_logs_event_data_idx ON public.event_logs USING GIN(event_data);
