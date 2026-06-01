export type CourseCertificateStatus = 'earned' | 'in_progress' | 'ready';

export interface CourseCertificate {
    id: string;
    course_id: number;
    course_name: string;
    issue_date: string;
    completion_time: string;
    status: CourseCertificateStatus;
    progress?: number;
    difficulty: string | null;
    formatted_number?: string;
}
