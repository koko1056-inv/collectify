import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Package, Users, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserCardProps {
  id: string;
  username: string;
  bio?: string | null;
  avatar_url?: string | null;
  followersCount: number;
  followingCount: number;
  collectionCount: number;
  isFollowing?: boolean;
  onFollow?: () => void;
}

export function UserCard({
  id,
  username,
  bio,
  avatar_url,
  followersCount,
  followingCount,
  collectionCount,
  isFollowing,
  onFollow,
}: UserCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-sm transition-all">
      <Link to={`/user/${id}`} className="flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
          <AvatarImage
            src={avatar_url || undefined}
            alt={username}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {username?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
      </Link>
      
      <div className="flex-1 min-w-0">
        <Link to={`/user/${id}`} className="block group">
          <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {username}
          </div>
          {bio ? (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{bio}</p>
          ) : (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {collectionCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {followersCount}
              </span>
            </div>
          )}
        </Link>
      </div>

      {onFollow && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={onFollow}
          className={cn(
            "h-8 px-3 rounded-full text-xs font-medium transition-all",
            isFollowing 
              ? "border-primary/30 text-primary hover:bg-primary/10" 
              : "shadow-sm"
          )}
        >
          {isFollowing ? (
            <>
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              フォロー中
            </>
          ) : (
            "フォロー"
          )}
        </Button>
      )}
    </div>
  );
}
