'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useOnboardingForm } from "../_hooks/use-onboarding-form";

export function OnboardingForm() {
    const {
        isLoading,
        studentNumber,
        departments,
        selectedDepartmentId,
        setSelectedDepartmentId,
        error,
        institutionId,
        handleStudentNumberChange,
        handleSubmit
    } = useOnboardingForm();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                    id="institution"
                    value="NU DASMARIÑAS"
                    disabled
                    className="bg-[#0f0f10] border-white/10 text-gray-400 cursor-not-allowed"
                />
                <p className="text-[0.8rem] text-gray-500">
                    Default institution
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <div className="relative">
                    <select
                        id="department"
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-[#0f0f10] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        disabled={isLoading || departments.length === 0}
                    >
                        <option value="" disabled>Select Department</option>
                        {departments.map((dept) => (
                            <option key={dept.department_id} value={dept.department_id}>
                                {dept.department_name} {dept.department_code ? `(${dept.department_code})` : ''}
                            </option>
                        ))}
                    </select>
                    {/* Chevron icon for custom select style */}
                    <div className="absolute right-3 top-3 pointer-events-none text-gray-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="studentNumber">Student Number</Label>
                <Input
                    id="studentNumber"
                    placeholder="e.g. 2023-123456"
                    value={studentNumber}
                    onChange={(e) => handleStudentNumberChange(e.target.value)}
                    className="bg-[#0f0f10] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
                    disabled={isLoading}
                    maxLength={12}
                />
            </div>

            {error && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    {error}
                </div>
            )}

            <Button
                type="submit"
                className="w-full h-12 text-base font-semibold group"
                variant="premium-3d"
                size="lg"
                disabled={isLoading || !institutionId}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        Complete Setup
                        <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                    </>
                )}
            </Button>
        </form>
    );
}
