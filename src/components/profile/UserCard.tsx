
import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { Link } from "react-router-dom";
import { FollowButton } from "./FollowButton";

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
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center space-x-3">
        <Link to={`/user/${id}`}>
          <Avatar className="h-12 w-12 border-2 border-white">
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={username}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full">
                <User className="h-6 w-6 text-gray-500" />
              </div>
            )}
          </Avatar>
        </Link>
        
        <div className="flex-1">
          <Link to={`/user/${id}`} className="block">
            <div className="font-semibold text-gray-900">{username}</div>
            {bio && <p className="text-sm text-gray-500 line-clamp-1">{bio}</p>}
          </Link>
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <div className="text-center">
          <div>{followingCount}</div>
          <div>フォロー中</div>
        </div>
        <div className="text-center">
          <div>{followersCount}</div>
          <div>フォロワー</div>
        </div>
        <div className="text-center">
          <div>{collectionCount}</div>
          <div>コレクション</div>
        </div>
      </div>

      <div className="mt-3">
        {onFollow ? (
          <Button
            variant={isFollowing ? "outline" : "default"}
            className="w-full"
            onClick={onFollow}
          >
            {isFollowing ? "フォロー中" : "フォローする"}
          </Button>
        ) : (
          <FollowButton userId={id} />
        )}
      </div>
    </div>
  );
}
