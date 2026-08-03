import { type UseFormReturn } from 'react-hook-form';
import { type SubjectOfferingFormValues } from '@sentinel/shared/schema';
import { type MasterSubject } from '@sentinel/shared/types';

export interface SubjectOfferingFormFieldsProps {
    form: UseFormReturn<SubjectOfferingFormValues>;
    isPending: boolean;
    subjectToOffer?: MasterSubject | null;
    open?: boolean;
}
