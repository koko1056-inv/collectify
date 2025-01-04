import { CollectionLikeButton } from "../collection/CollectionLikeButton";

interface ProfileHeaderProps {
  username: string;
  userId: string;
}

export function ProfileHeader({ username, userId }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">
        {username}さんのコレクション
      </h1>
      <CollectionLikeButton collectionOwnerId={userId} />
    </div>
  );
}