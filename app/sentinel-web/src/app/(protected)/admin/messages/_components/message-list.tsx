"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "../_types";

interface MessageListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function MessageList({ conversations, selectedId, onSelect }: MessageListProps) {
    return (
        <div className={cn(
            "w-full md:w-[320px] lg:w-[380px] border-r border-border flex-col h-full bg-card",
            selectedId ? "hidden md:flex" : "flex"
        )}>
            <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold mb-4">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search messages..."
                        className="pl-9 bg-muted/50 border-input focus-visible:ring-primary"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.map((conversation) => {
                    const participant = conversation.participants[0];
                    return (
                        <button
                            key={conversation.id}
                            onClick={() => onSelect(conversation.id)}
                            className={cn(
                                "w-full flex items-start gap-4 p-4 text-left hover:bg-muted/50 transition-colors border-b border-border/50",
                                selectedId === conversation.id && "bg-muted"
                            )}
                        >
                            <div className="relative">
                                <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-background">
                                    <AvatarImage src={participant.avatar} alt={participant.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {participant.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span
                                    className={cn(
                                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                        participant.status === "online" && "bg-emerald-500",
                                        participant.status === "busy" && "bg-amber-500",
                                        participant.status === "offline" && "bg-slate-500"
                                    )}
                                />
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm md:text-base truncate">
                                        {participant.name}
                                    </span>
                                    {conversation.lastMessage && (
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                                                addSuffix: false,
                                            })}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className={cn(
                                        "text-xs md:text-sm truncate pr-2",
                                        conversation.unreadCount && conversation.unreadCount > 0
                                            ? "text-foreground font-medium"
                                            : "text-muted-foreground"
                                    )}>
                                        {conversation.lastMessage?.content || "No messages yet"}
                                    </p>
                                    {conversation.unreadCount && conversation.unreadCount > 0 ? (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                            {conversation.unreadCount}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
