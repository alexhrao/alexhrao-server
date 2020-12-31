export interface MicrosoftToken {
    accountName: string;
    token: string;
}

export interface AzureCredentials {
    associatedApplications: {
        applicationId: string;
    }[];
}