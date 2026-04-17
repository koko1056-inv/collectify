import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RoomFurniture } from "@/components/room3d/FurnitureItem3D";
import { PlacementType } from "@/hooks/useMyRoom";

// Default furniture for new rooms (2D shelf layout)
// 棚+台座を置いた簡素な初期状態
const DEFAULT_FURNITURE: Omit<RoomFurniture, "id">[] = [
  { furniture_id: "shelf_tier2", position_x: 30, position_y: 85, placement: "floor", scale: 1, rotation_y: 0 },
  { furniture_id: "stand_pedestal", position_x: 65, position_y: 85, placement: "floor", scale: 1, rotation_y: 0 },
];

export function useRoomFurniture(roomId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["room-furniture", roomId];

  // Fetch furniture from DB
  const { data: furniture = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await supabase
        .from("room_furniture")
        .select("*")
        .eq("room_id", roomId)
        .order("z_index", { ascending: true });

      if (error) {
        // Table might not exist yet — fall back to defaults
        console.warn("room_furniture query failed, using defaults:", error.message);
        return DEFAULT_FURNITURE.map((f, i) => ({ ...f, id: `default_${i}` })) as RoomFurniture[];
      }
      return (data || []).map((row) => ({
        id: row.id,
        furniture_id: row.furniture_id,
        position_x: row.position_x,
        position_y: row.position_y,
        placement: row.placement as PlacementType,
        scale: row.scale,
        rotation_y: row.rotation_y,
      })) as RoomFurniture[];
    },
    enabled: !!roomId,
  });

  // Add furniture
  const addFurniture = useMutation({
    mutationFn: async (f: Omit<RoomFurniture, "id">) => {
      if (!roomId) throw new Error("Room not found");
      const { data, error } = await supabase
        .from("room_furniture")
        .insert({
          room_id: roomId,
          furniture_id: f.furniture_id,
          position_x: f.position_x,
          position_y: f.position_y,
          placement: f.placement,
          scale: f.scale,
          rotation_y: f.rotation_y,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast.error("家具の追加に失敗しました"),
  });

  // Update furniture position/scale
  const updateFurniture = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoomFurniture> & { id: string }) => {
      const { error } = await supabase
        .from("room_furniture")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  // Delete furniture
  const deleteFurniture = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("room_furniture")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("家具を削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  // Seed default furniture for a new room
  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!roomId) throw new Error("Room not found");
      const rows = DEFAULT_FURNITURE.map((f) => ({
        room_id: roomId,
        ...f,
      }));
      const { error } = await supabase.from("room_furniture").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    furniture,
    isLoading,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    seedDefaults,
  };
}
