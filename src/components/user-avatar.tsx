import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8 border border-border/70", className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {initials(name) || "LL"}
      </AvatarFallback>
    </Avatar>
  );
}
