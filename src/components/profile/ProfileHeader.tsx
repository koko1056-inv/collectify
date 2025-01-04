interface ProfileHeaderProps {
  username: string;
  userId?: string;
  onShare?: () => void;
}

export function ProfileHeader({ username, userId, onShare }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">{username}</h1>
      {userId && (
        <Button variant="outline" onClick={onShare}>
          共有
        </Button>
      )}
    </div>
  );
}
