import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export function EventList() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          event_participants: event_participants(count),
          group: groups(name),
          created_by_profile: profiles!events_created_by_fkey(username)
        `)
        .order("start_date", { ascending: true })
        .gte("start_date", new Date().toISOString());
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events?.map((event) => (
        <Card key={event.id} className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              {event.group && (
                <p className="text-sm text-gray-600 mt-1">
                  {event.group.name} 主催
                </p>
              )}
            </div>
            <Button variant="outline">参加する</Button>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <time>
                {format(new Date(event.start_date), "M月d日(E) HH:mm", {
                  locale: ja,
                })}
              </time>
              {event.end_date && (
                <>
                  <span className="mx-2">-</span>
                  <time>
                    {format(new Date(event.end_date), "M月d日(E) HH:mm", {
                      locale: ja,
                    })}
                  </time>
                </>
              )}
            </div>
            {event.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                {event.location}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              {event.event_participants?.[0]?.count || 0} 人が参加予定
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}