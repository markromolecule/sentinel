import {
    CardHeader,
    CardTitle,
    CardDescription,
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@sentinel/ui';
import { MoreHorizontal, Share2, Trash2, Pencil, Globe, Lock } from 'lucide-react';
import { ExamCardProps } from '@sentinel/shared/types';
import { useRouter } from 'next/navigation';
import { buildInstructorExamAssignHref } from '@/lib/routes/exam-management-routes';

interface ExamCardHeaderProps {
    exam: ExamCardProps['exam'];
    statusClass: string;
    showActions: boolean;
    onDeleteClick: () => void;
    onEditClick: () => void;
}

/**
 * Renders the exam card header actions and status badges.
 */
export function ExamCardHeader({
    exam,
    statusClass,
    showActions,
    onDeleteClick,
    onEditClick,
}: ExamCardHeaderProps) {
    const router = useRouter();

    const handleShare = () => {
        router.push(buildInstructorExamAssignHref(exam.id));
    };

    return (
        <CardHeader className="gap-2 px-4 pb-0">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="outline"
                        className={`text-[10px] tracking-wider uppercase ${statusClass}`}
                    >
                        {exam.status}
                    </Badge>
                    {exam.isPublic ? (
                        <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] font-medium tracking-wider text-emerald-700 uppercase hover:bg-emerald-500/10 dark:text-emerald-400"
                        >
                            <Globe className="h-3 w-3" />
                            Public
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-zinc-500/20 bg-zinc-500/10 text-[10px] font-medium tracking-wider text-zinc-700 uppercase hover:bg-zinc-500/10 dark:text-zinc-400"
                        >
                            <Lock className="h-3 w-3" />
                            Private
                        </Badge>
                    )}
                </div>
                {showActions ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground h-8 w-8"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                                <Share2 className="mr-2 h-4 w-4" />
                                Share / Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={onEditClick}
                                className="cursor-pointer font-medium"
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={onDeleteClick}
                                className="cursor-pointer text-red-500"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Exam
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>
            <CardTitle
                className="line-clamp-1 text-base font-semibold tracking-tight"
                title={exam.title}
            >
                {exam.title}
            </CardTitle>
            <CardDescription
                className={`line-clamp-2 min-h-8 text-xs break-words ${exam.description ? '' : 'opacity-0'}`}
                aria-hidden={!exam.description}
            >
                {exam.description || 'No description'}
            </CardDescription>
        </CardHeader>
    );
}
