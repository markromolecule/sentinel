import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ExamIdIndex() {
     const { id } = useLocalSearchParams<{ id: string }>();
     return <Redirect href={`/exam/${id}/details`} />;
}
