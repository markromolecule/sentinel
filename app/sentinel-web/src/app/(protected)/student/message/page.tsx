"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentMessagePage() {
    return (
        <div className="h-[calc(100vh-12rem)] min-h-[500px] flex gap-6">
            {/* Sidebar / Chat List */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col bg-muted/50 rounded-2xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground">Private Chats</h2>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" />
                            New Chat
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-9 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                    </div>
                </div>

                {/* Empty State for Chat List */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
                        <MessageSquare className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">No chats yet!</h3>
                        <p className="text-sm text-muted-foreground max-w-[200px] mx-auto mt-2">
                            Create your first chat conversation to start chatting.
                        </p>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="w-4 h-4 mr-2" />
                        Start Chatting
                    </Button>
                </div>
            </div>

            {/* Main Chat Area (Empty State) - Hidden on mobile if viewing list */}
            <div className="hidden md:flex flex-1 items-center justify-center bg-muted/50 rounded-2xl border border-border/50">
                <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Your Inbox</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Select a conversation from the left to start chatting, or create a new one.
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Create First Chat
                    </Button>
                </div>
            </div>
        </div>
    );
}
