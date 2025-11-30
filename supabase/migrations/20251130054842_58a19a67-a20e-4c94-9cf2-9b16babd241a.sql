-- Enable realtime for binder_items table
ALTER TABLE binder_items REPLICA IDENTITY FULL;

-- Enable realtime for binder_decorations table
ALTER TABLE binder_decorations REPLICA IDENTITY FULL;