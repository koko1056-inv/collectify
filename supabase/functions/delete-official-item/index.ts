import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId } = await req.json();
    
    if (!itemId) {
      return new Response(
        JSON.stringify({ error: "itemId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleting official item:", itemId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // まず関連するタグを削除
    const { error: tagError } = await supabase
      .from("item_tags")
      .delete()
      .eq("official_item_id", itemId);

    if (tagError) {
      console.error("Error deleting item_tags:", tagError);
    }

    // アイテムを削除
    const { error: itemError } = await supabase
      .from("official_items")
      .delete()
      .eq("id", itemId);

    if (itemError) {
      console.error("Error deleting official_item:", itemError);
      return new Response(
        JSON.stringify({ error: itemError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully deleted official item:", itemId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
