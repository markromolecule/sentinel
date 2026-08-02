import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateRooms } from '@sentinel/shared';
import {
    useBulkCreateRoomsMutation,
    useEffectiveInstitutionNamingConventionsQuery,
} from '@sentinel/hooks';
import { RoomInput } from '@sentinel/shared/types';
import { toast } from 'sonner';

const bulkRoomUploadSchema = z.object({
    institution_id: z.string().min(1, 'Institution is required'),
    start_number: z.coerce.number().min(1, 'Start number must be positive'),
    end_number: z.coerce.number().min(1, 'End number must be positive'),
    room_type: z.enum(['LECTURE', 'LABORATORY', 'VIRTUAL']),
    padding: z.coerce.number().min(0).max(5).default(0),
});

export type BulkRoomUploadValues = z.infer<typeof bulkRoomUploadSchema>;

export function useBulkRoomUploadForm(onSuccess: () => void) {
    const form = useForm<BulkRoomUploadValues>({
        resolver: zodResolver(bulkRoomUploadSchema) as Resolver<BulkRoomUploadValues>,
        defaultValues: {
            institution_id: '',
            start_number: 1,
            end_number: 10,
            room_type: 'LECTURE',
            padding: 0,
        },
    });

    const { control } = form;

    const selectedInstitutionId = useWatch({ control, name: 'institution_id' });
    const start = useWatch({ control, name: 'start_number' });
    const end = useWatch({ control, name: 'end_number' });
    const padding = useWatch({ control, name: 'padding' });
    const roomType = useWatch({ control, name: 'room_type' });

    const { data: namingConvention } = useEffectiveInstitutionNamingConventionsQuery(
        selectedInstitutionId || '',
    );

    const generatedRoomsPreview = useMemo(() => {
        if (!namingConvention || !start || !end) return [];

        const roomRules = namingConvention.namingRules?.room;
        const standardPrefix =
            roomRules?.prefix || namingConvention.roomCodeFormat?.replace('{number}', '') || 'RM';
        const virtualPrefix = roomRules?.virtualPrefix || 'VR';
        const standardNamePrefix =
            namingConvention.roomCodeFormat?.replace('{number}', '') || 'Room';
        const namePrefix = roomType === 'VIRTUAL' ? virtualPrefix : standardNamePrefix;
        const codePrefix = roomType === 'VIRTUAL' ? virtualPrefix : standardPrefix;

        return generateRooms({
            namePrefix,
            codePrefix,
            start,
            end,
            padding,
        });
    }, [namingConvention, start, end, padding, roomType]);

    const bulkCreate = useBulkCreateRoomsMutation({
        onSuccess: (data) => {
            toast.success(`${data.length} rooms created successfully.`);
            onSuccess();
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to bulk create rooms.');
        },
    });

    const onSubmit = (values: BulkRoomUploadValues) => {
        const rooms: RoomInput[] = generatedRoomsPreview.map((room) => ({
            institution_id: values.institution_id,
            name: room.name,
            code: room.code,
            room_number: room.number,
            room_type: values.room_type,
        }));

        bulkCreate.mutate(rooms);
    };

    return {
        form,
        generatedRoomsPreview,
        onSubmit,
        isPending: bulkCreate.isPending,
        namingConvention,
    };
}
