"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Send, MoreVertical, Phone, Video, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Conversation, Message } from "../_types";

interface ChatWindowProps {
    conversation: Conversation | null;
    messages: Message[];
    currentUserId: string;
    onSendMessage: (content: string) => void;
    onBack: () => void;
}

export function ChatWindow({
    conversation,
    messages,
    currentUserId,
    onSendMessage,
    onBack,
}: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!conversation) {
        return (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-muted/10 p-8 text-center h-full">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground max-w-sm">
                    Choose a contact from the list to start messaging or view previous chats.
                </p>
            </div>
        );
    }

    const participant = conversation.participants[0];

    return (
        <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden w-full">
            {/* Header */}
            <div className="h-16 md:h-20 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-border">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {participant.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-sm md:text-base">{participant.name}</h3>
                        <div className="flex items-center gap-1.5">
                            <span
                                className={cn(
                                    "h-2 w-2 rounded-full",
                                    participant.status === "online" && "bg-emerald-500",
                                    participant.status === "busy" && "bg-amber-500",
                                    participant.status === "offline" && "bg-slate-500"
                                )}
                            />
                            <span className="text-xs text-muted-foreground capitalize">
                                {participant.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <Button variant="ghost" size="icon" className="hidden md:flex">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hidden md:flex">
                        <Video className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Search in Conversation</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-muted/5 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUserId;
                    const showAvatar =
                        !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                    return (
                        <div
                            key={msg.id}
                            className={cn("flex gap-3 max-w-[85%] md:max-w-[70%]", isMe ? "ml-auto flex-row-reverse" : "")}
                        >
                            {!isMe && (
                                <div className="w-8 flex-shrink-0">
                                    {showAvatar && (
                                        <Avatar className="h-8 w-8 border border-border">
                                            <AvatarImage src={participant.avatar} />
                                            <AvatarFallback>
                                                {participant.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )}

                            <div
                                className={cn(
                                    "p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-card border border-border rounded-tl-sm text-foreground"
                                )}
                            >
                                {msg.content}
                                <div
                                    className={cn(
                                        "text-[10px] mt-1 opacity-70 flex justify-end",
                                        isMe ? "text-primary-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {format(new Date(msg.timestamp), "h:mm a")}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-card border-t border-border mt-auto shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="flex-1 bg-muted/50 border-input focus:ring-primary h-12"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        size="icon"
                        className="h-12 w-12 shrink-0 bg-primary hover:bg-primary/90 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
