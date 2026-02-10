import 'react-hook-form';
import type { ReactElement } from 'react';
import type { FieldValues, FieldPath, ControllerProps as OriginalControllerProps } from 'react-hook-form';

declare module 'react-hook-form' {
  export interface ControllerRenderProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > {
    onChange: (...event: any[]) => void;
    onBlur: () => void;
    value: any;
    name: TName;
    ref: React.Ref<any>;
  }

  export function Controller<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  >(props: OriginalControllerProps<TFieldValues, TName>): ReactElement | null;
}
     