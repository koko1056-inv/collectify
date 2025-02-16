
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingSubmissionCardProps {
  submission: {
    id: string;
    title: string;
    image: string;
    created_at: string;
    submitter: {
      username: string;
    };
  };
  onApprove: (id: string) => void;
  onReject: (submission: any) => void;
  isApproving: boolean;
}

export function PendingSubmissionCard({
  submission,
  onApprove,
  onReject,
  isApproving,
}: PendingSubmissionCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <img
          src={submission.image}
          alt={submission.title}
          className="w-16 h-16 object-cover rounded"
        />
        <div>
          <h3 className="font-medium">{submission.title}</h3>
          <p className="text-sm text-gray-500">
            提案者: {submission.submitter?.username}
          </p>
          <p className="text-sm text-gray-500">
            提案日: {format(new Date(submission.created_at), 'yyyy/MM/dd HH:mm')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onApprove(submission.id)}
          disabled={isApproving}
        >
          <Check className="w-4 h-4 mr-2" />
          承認
        </Button>
        <Button
          variant="destructive"
          onClick={() => onReject(submission)}
        >
          <X className="w-4 h-4 mr-2" />
          却下
        </Button>
      </div>
    </div>
  );
}
