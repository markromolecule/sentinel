export interface SelectionItem {
     id: string;
     code: string;
     name: string;
}

export interface SelectionModalProps {
     visible: boolean;
     onClose: () => void;
     data: SelectionItem[];
     onSelect: (item: SelectionItem) => void;
     title: string;
}