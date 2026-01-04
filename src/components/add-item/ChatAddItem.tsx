import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Image, Bot, User, Loader2, Check, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  suggestions?: string[];
}

interface CollectedData {
  imageUrl?: string;
  title?: string;
  content_name?: string;
  characterTag?: string;
  typeTag?: string;
  seriesTag?: string;
  price?: string;
}


const normalizeImageUrl = (raw?: string): string | undefined => {
  if (!raw) return raw;
  if (raw.startsWith("data:")) return raw;

  try {
    const u = new URL(raw);

    // Google画像検索の中継URL → 実画像URLへ
    // 例: https://www.google.com/imgres?imgurl=https%3A%2F%2F...jpg&...
    if ((u.hostname === "www.google.com" || u.hostname === "google.com") && u.pathname === "/imgres") {
      const imgurl = u.searchParams.get("imgurl");
      if (imgurl) return imgurl;
    }
  } catch {
    // ignore
  }

  return raw;
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}がタイムアウトしました`)), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export function ChatAddItem() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "こんにちは！グッズの登録をお手伝いします✨\n\nまずは登録したいグッズの画像を送ってください。画像URLを貼り付けるか、ファイルをアップロードしてくださいね！",
      suggestions: []
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string, imageUrl?: string) => {
    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    if (!content.trim() && !normalizedImageUrl) return;

    const userMessage: Message = { role: "user", content, imageUrl: normalizedImageUrl };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("add-item-chat", {
          body: {
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
              imageUrl: m.imageUrl,
            })),
          },
        }),
        30000,
        "AI応答"
      );

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        suggestions: data.suggestions || []
      };

      setMessages([...newMessages, assistantMessage]);
      
      if (data.collectedData) {
        setCollectedData({
          ...data.collectedData,
          imageUrl: normalizeImageUrl(data.collectedData.imageUrl),
        });
      }
      setIsComplete(data.isComplete || false);
      setIsConfirmed(data.isConfirmed || false);

      // Auto submit if confirmed
      if (data.isConfirmed && data.collectedData) {
        await handleSubmit(data.collectedData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      // Convert to base64 for display and AI
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await sendMessage("この画像のグッズを登録したいです", base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (data: CollectedData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "エラー",
          description: "ログインが必要です",
          variant: "destructive"
        });
        return;
      }

      // Upload image - both base64 and external URLs need to be uploaded to our storage
      let imageUrl = normalizeImageUrl(data.imageUrl) || "";
      
      if (imageUrl.startsWith("data:")) {
        // Base64 image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `item-${Date.now()}.jpg`, { type: blob.type });
        
        const fileName = `${crypto.randomUUID()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await withTimeout(
          supabase.storage.from("kuji_images").upload(filePath, file),
          30000,
          "画像アップロード"
        );

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("kuji_images")
          .getPublicUrl(filePath);
        
        imageUrl = urlData.publicUrl;
      } else if (imageUrl.startsWith("http") && !imageUrl.includes("supabase.co")) {
        // External URL - proxy and upload to our storage
        console.log("Proxying external image:", imageUrl);
        
        const { data: proxyData, error: proxyError } = await withTimeout(
          supabase.functions.invoke("proxy-image", {
            body: { url: imageUrl },
          }),
          15000,
          "画像取得"
        );

        if (proxyError || proxyData?.error) {
          const errorMsg = proxyData?.error || proxyError?.message || "Unknown error";
          console.error("Failed to proxy image:", errorMsg);
          
          // ユーザーに直接アップロードを促すメッセージを追加
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `⚠️ 外部画像の取得に失敗しました。\n\n画像を直接アップロードしてください。左下の画像ボタン📷をタップして、スマホやPCから画像を選んでください。`,
            suggestions: []
          }]);
          setIsSubmitting(false);
          return;
        }

        const imageBlob = proxyData?.imageBlob as string | undefined;
        const contentType = (proxyData?.contentType as string | undefined) || "image/jpeg";

        if (!imageBlob) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `⚠️ 画像データの取得に失敗しました。\n\n画像を直接アップロードしてください。`,
            suggestions: []
          }]);
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(`data:${contentType};base64,${imageBlob}`);
        const blob = await response.blob();

        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const file = new File([blob], `item-${Date.now()}.${ext}`, { type: contentType });

        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await withTimeout(
          supabase.storage.from("kuji_images").upload(filePath, file),
          30000,
          "画像アップロード"
        );

        if (uploadError) {
          console.error("Failed to upload image:", uploadError);
          toast({
            title: "エラー",
            description: "画像のアップロードに失敗しました。再度お試しください。",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("kuji_images")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        console.log("Image uploaded successfully:", imageUrl);
      }

      // Insert the item
      const { data: newItem, error: insertError } = await supabase
        .from("official_items")
        .insert({
          title: data.title || "無題",
          image: imageUrl,
          price: data.price || "0",
          content_name: data.content_name || null,
          created_by: user.id,
          release_date: new Date().toISOString(),
          item_type: "official"
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add tags if available
      if (newItem) {
        // Find or create tags and link them
        for (const [field, category] of [
          ["characterTag", "character"],
          ["typeTag", "type"],
          ["seriesTag", "series"]
        ] as const) {
          const tagName = data[field];
          if (tagName && tagName.trim()) {
            console.log(`Processing tag: ${tagName} for category: ${category}`);
            
            // First try to find existing tag
            let { data: tagData } = await supabase
              .from("tags")
              .select("id")
              .eq("name", tagName.trim())
              .eq("category", category)
              .maybeSingle();

            // If not found, create new tag
            if (!tagData) {
              console.log(`Creating new tag: ${tagName} for category: ${category}`);
              const { data: newTag, error: tagError } = await supabase
                .from("tags")
                .insert({
                  name: tagName.trim(),
                  category: category
                })
                .select("id")
                .single();
              
              if (tagError) {
                console.error(`Failed to create tag: ${tagName}`, tagError);
                continue;
              }
              tagData = newTag;
            }

            if (tagData) {
              console.log(`Linking tag ${tagData.id} to item ${newItem.id}`);
              const { error: linkError } = await supabase
                .from("item_tags")
                .insert({
                  official_item_id: newItem.id,
                  tag_id: tagData.id
                });
              
              if (linkError) {
                console.error(`Failed to link tag: ${tagName}`, linkError);
              }
            }
          }
        }
      }

      toast({
        title: "登録完了！",
        description: "グッズが正常に登録されました"
      });

      // Reset chat
      setMessages([{
        role: "assistant",
        content: "グッズの登録が完了しました！🎉\n\n続けて別のグッズを登録しますか？画像を送ってください！",
        suggestions: []
      }]);
      setCollectedData({});
      setIsComplete(false);
      setIsConfirmed(false);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        title: "エラー",
        description: "登録に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isImageUrl = (text: string) => {
    return text.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i) ||
           text.match(/^https?:\/\/.+\/.*image/i);
  };

  const handleSend = () => {
    if (isImageUrl(input)) {
      sendMessage("この画像のグッズを登録したいです", input);
    } else {
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className={cn(
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            
            <div className={cn(
              "flex flex-col gap-2 max-w-[80%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="Uploaded" 
                  className="max-w-[200px] rounded-lg border"
                />
              )}
              
              <div className={cn(
                "rounded-2xl px-4 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => sendMessage(suggestion)}
                      disabled={isLoading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Collected Data Preview */}
      {Object.keys(collectedData).length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">収集済みの情報:</p>
          <div className="flex flex-wrap gap-1">
            {collectedData.title && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {collectedData.title}
              </span>
            )}
            {collectedData.content_name && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {collectedData.content_name}
              </span>
            )}
            {collectedData.typeTag && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                {collectedData.typeTag}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Image className="h-4 w-4" />
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージまたは画像URLを入力..."
            disabled={isLoading}
            className="flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
