interface ProfileBioProps {
  bio: string | null;
}

export function ProfileBio({ bio }: ProfileBioProps) {
  if (!bio) return null;
  
  return (
    <p className="text-gray-600 whitespace-pre-wrap">{bio}</p>
  );
}