import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface CardContainerProps {
  children: ReactNode;
  onClick?: () => void;
  isCompact?: boolean;
}

export function CardContainer({ children, onClick, isCompact }: CardContainerProps) {
  return (
    <Card 
      className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer"
      onClick={onClick}
    >
      {children}
    </Card>
  );
}