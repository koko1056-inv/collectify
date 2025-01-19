import { Badge } from "@/components/ui/badge";

interface FeedPostContentProps {
  post: any;
}

export function FeedPostContent({ post }: FeedPostContentProps) {
  return (
    <>
      <div className="mt-4">
        <img
          src={post.image}
          alt={post.title}
          className="rounded-lg w-full object-cover aspect-square"
        />
      </div>

      <div className="mt-4">
        <h3 className="font-medium">{post.title}</h3>
        <p className="mt-1 text-gray-600">{post.description}</p>
      </div>

      {post.user_item_tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.user_item_tags.map(
            (tag: any) =>
              tag.tags && (
                <Badge key={tag.tags.id} variant="secondary">
                  {tag.tags.name}
                </Badge>
              )
          )}
        </div>
      )}
    </>
  );
}