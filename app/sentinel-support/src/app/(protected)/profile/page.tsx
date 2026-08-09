'use client';

import { useState } from 'react';
import { useProfileQuery, useUpdatePasswordMutation } from '@sentinel/hooks';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Separator,
} from '@sentinel/ui';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function SupportProfilePage() {
    const { profile, isLoading } = useProfileQuery();
    const updatePasswordMutation = useUpdatePasswordMutation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            toast.error('Password cannot be empty');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        updatePasswordMutation.mutate(
            { password },
            {
                onSuccess: () => {
                    toast.success('Password updated successfully');
                    setPassword('');
                    setConfirmPassword('');
                },
                onError: (error: Error) => {
                    toast.error(error.message || 'Failed to update password');
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl animate-pulse space-y-6 p-4 md:p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                    <div className="md:col-span-4">
                        <Card className="border-border/50 bg-card overflow-hidden">
                            <CardContent className="flex flex-col items-center space-y-4 p-6">
                                <div className="bg-muted h-24 w-24 rounded-full" />
                                <div className="bg-muted h-6 w-36 rounded" />
                                <div className="bg-muted h-4 w-48 rounded" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-8">
                        <Card className="border-border/50 bg-card overflow-hidden">
                            <CardHeader>
                                <div className="bg-muted h-6 w-40 rounded" />
                            </CardHeader>
                            <CardContent className="bg-muted/20 h-64" />
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`;

    return (
        <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Left Column - Profile Summary */}
                <div className="md:col-span-4">
                    <Card className="border-border/50 bg-card h-full border-t-[3px] border-t-[#323d8f] shadow-sm">
                        <CardContent className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
                            <Avatar className="border-background ring-border/20 h-24 w-24 border-4 shadow-xl ring-1">
                                <AvatarImage
                                    src={profile?.avatarUrl || undefined}
                                    alt={`${profile?.firstName || ''} avatar`}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-2xl font-bold text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-foreground mt-4 text-xl font-bold">
                                {profile?.firstName} {profile?.lastName}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-xs break-all">
                                {profile?.email}
                            </p>
                            <Badge variant="secondary" className="mt-3 font-semibold capitalize">
                                {profile?.role || 'Support'}
                            </Badge>
                            {profile?.institution && (
                                <p className="text-muted-foreground mt-4 text-xs font-medium">
                                    <span className="font-bold text-[#323d8f]">@ </span>
                                    {profile.institution}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Details & Security */}
                <div className="md:col-span-8">
                    <Card className="border-border/50 bg-card overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Account Profile</CardTitle>
                            <CardDescription>
                                View your identity details and manage security credentials.
                            </CardDescription>
                        </CardHeader>
                        <Separator className="bg-border" />
                        <CardContent className="space-y-5 p-5">
                            <div>
                                <h3 className="text-foreground mb-3 text-sm font-semibold">
                                    Personal Information
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                            First Name
                                        </span>
                                        <p className="text-foreground text-base font-semibold">
                                            {profile?.firstName || '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                            Last Name
                                        </span>
                                        <p className="text-foreground text-base font-semibold">
                                            {profile?.lastName || '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                            Role
                                        </span>
                                        <p className="text-foreground text-base font-semibold capitalize">
                                            {profile?.role || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-border" />

                            {/* Security Settings */}
                            <div>
                                <div className="mb-4 flex items-center gap-2">
                                    <Lock className="text-muted-foreground h-4 w-4" />
                                    <h3 className="text-foreground text-sm font-semibold">
                                        Security Settings
                                    </h3>
                                </div>
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input
                                                id="new-password"
                                                type="password"
                                                placeholder="Enter new password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted/30 h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirm-password">
                                                Confirm New Password
                                            </Label>
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted/30 h-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="submit"
                                            disabled={updatePasswordMutation.isPending}
                                            size="sm"
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                        >
                                            {updatePasswordMutation.isPending
                                                ? 'Updating...'
                                                : 'Update Password'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
