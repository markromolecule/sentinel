export type AdministratorRole = 'superadmin' | 'support';

type AdministratorRoleConfig = {
    role: AdministratorRole;
    tabLabel: string;
    singularLabel: string;
    pluralLabel: string;
    inviteButtonLabel: string;
    inviteTitle: string;
    inviteDescription: string;
    savingLabel: string;
    creatingLabel: string;
    createActionLabel: string;
    pageDescription: string;
    errorTitle: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDescription: string;
    deleteSuccessMessage: string;
    copySuccessMessage: string;
    deleteDescriptionLabel: string;
    formFootnote: string;
    requiresDepartment: boolean;
};

export const ADMINISTRATOR_ROLE_CONFIG: Record<AdministratorRole, AdministratorRoleConfig> = {
    superadmin: {
        role: 'superadmin',
        tabLabel: 'Superadmins',
        singularLabel: 'superadmin',
        pluralLabel: 'superadmin accounts',
        inviteButtonLabel: 'Invite new superadmin',
        inviteTitle: 'Invite new superadmin',
        inviteDescription: 'Create a new superadmin account for the institution.',
        savingLabel: 'Saving Changes...',
        creatingLabel: 'Creating Superadmin...',
        createActionLabel: 'Create Superadmin',
        pageDescription: 'Create and manage superadmin accounts for the institution.',
        errorTitle: 'Failed to load superadmin accounts.',
        searchPlaceholder: 'Search superadmins by email...',
        emptyTitle: 'No superadmins added',
        emptyDescription: 'Create superadmin accounts here for Sentinel core administration.',
        deleteSuccessMessage: 'Superadmin deleted successfully.',
        copySuccessMessage: 'Superadmin ID copied to clipboard.',
        deleteDescriptionLabel: 'superadmin account',
        formFootnote:
            'Superadmin accounts are created with global platform access and are managed from the support portal.',
        requiresDepartment: true,
    },
    support: {
        role: 'support',
        tabLabel: 'Support',
        singularLabel: 'support account',
        pluralLabel: 'support accounts',
        inviteButtonLabel: 'Invite new support account',
        inviteTitle: 'Invite new support account',
        inviteDescription:
            'Create a new institution-scoped support account for support operations.',
        savingLabel: 'Saving Changes...',
        creatingLabel: 'Creating Support Account...',
        createActionLabel: 'Create Support Account',
        pageDescription:
            'Create and manage institution-scoped support accounts for support operations.',
        errorTitle: 'Failed to load support accounts.',
        searchPlaceholder: 'Search support accounts by email...',
        emptyTitle: 'No support accounts added',
        emptyDescription:
            'Create support accounts here for institution-scoped support administration.',
        deleteSuccessMessage: 'Support account deleted successfully.',
        copySuccessMessage: 'Support account ID copied to clipboard.',
        deleteDescriptionLabel: 'support account',
        formFootnote:
            'Support accounts stay scoped to their assigned institution and are managed from the support portal.',
        requiresDepartment: false,
    },
};

export function getAdministratorRoleConfig(role: AdministratorRole) {
    return ADMINISTRATOR_ROLE_CONFIG[role];
}
