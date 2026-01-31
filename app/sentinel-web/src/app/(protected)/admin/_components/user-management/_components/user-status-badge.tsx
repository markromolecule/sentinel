import { Badge } from "@/components/ui/badge";
import { AdminUser } from "@/app/(protected)/admin/_types";

interface UserStatusBadgeProps {
    status: AdminUser["status"];
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
    const getStatusVariant = (status: AdminUser["status"]) => {
        switch (status) {
            case "active":
                return "default";
            case "inactive":
                return "secondary";
            case "suspended":
                return "destructive";
            case "archived":
                return "outline";
            default:
                return "outline";
        }
    };

    return (
        <Badge variant={getStatusVariant(status)}>
            {status}
        </Badge>
    );
}
