export * from './auth/login-schema';
export * from './auth/register-schema';
export * from './audio/audio-settings-schema';
export * from './users/user-schema';
export * from './subjects/SubjectSchema';
export * from './subjects/subject-offering-schema';
export * from './announcements/AnnouncementSchema';
export * from './assignments/AssignmentSchema';
export * from './telemetry/telemetry-schema';
export * from './telemetry/telemetry-settings-schema';
export * from './notifications/notification-schema';
export * from './exams/assessment-schema';
export * from './exams/essay-rubric-schema';
export * from './exams/attempt-answer-schema';
export * from './exams/attempt-snapshot-schema';
export * from './exams/exam-create-schema';
export * from './exams/exam-config-schema';
export * from './exams/configuration-schema';
export * from './exams/exam-schema';
export * from './exams/exam-assignment-schema';
export * from './exams/exam-section-assignment-schema';
export * from './exams/monitoring-schema';
export * from './exams/reporting-schema';
export * from './exams/runtime-access-schema';
export * from './exams/lifecycle-schema';
export * from './exams/live-inspection-schema';
export * from './exams/student-override-schema';
export * from './exams/question-schema';
export * from './exams/question-collection-schema';
export * from './exams/question-bank-schema';
export * from './exams/question-type-schema';
export * from './exams/builder-schema';
export * from './exams/grading-schema';
export * from './exams/builder/question-content-schema';
export * as AdminExamConfigSchema from './exams/exam-config-schema';
export * as ProctorExamConfigSchema from './exams/exam-config-schema';

// Backported specific exports
export { announcementFormSchema } from './admin/announcements/announcement-schema';
export type { AnnouncementFormValues } from './admin/announcements/announcement-schema';

// Courses
export { courseSchema } from './superadmin/courses/course-schema';
export type { CourseFormValues } from './superadmin/courses/course-schema';

// Departments
export { departmentSchema } from './superadmin/departments/department-schema';
export type { DepartmentFormValues } from './superadmin/departments/department-schema';

// Institutions
export {
    institutionNamingConventionSchema,
    institutionNamingRulesSchema,
    institutionSchema,
    roomNamingRuleSchema,
    sectionNamingRuleSchema,
} from './superadmin/institutions/institution-schema';
export type {
    InstitutionFormValues,
    InstitutionNamingConventionFormValues,
} from './superadmin/institutions/institution-schema';

// Semesters
export { semesterSchema } from './superadmin/semesters/semester-schema';
export type { SemesterFormValues } from './superadmin/semesters/semester-schema';

// Rooms
export { roomSchema } from './superadmin/rooms/room-schema';
export type { RoomFormValues } from './superadmin/rooms/room-schema';

// Exam Configs
export { examConfigFormSchema } from './exams/exam-config-schema';
export type { ExamConfigFormValues } from './exams/exam-config-schema';

// Subjects
export { subjectFormSchema } from './admin/subjects/subject-schema';
export type { SubjectFormValues } from './admin/subjects/subject-schema';
export {
    subjectClassificationFormSchema,
    subjectClassificationTypeSchema,
} from './subjects/SubjectSchema';
export type { SubjectClassificationFormValues } from './subjects/SubjectSchema';
export {
    classificationSubjectOfferingFormSchema,
    subjectOfferingFormSchema,
    subjectOfferingDuplicateStrategySchema,
    subjectOfferingUpdateFormSchema,
} from './subjects/subject-offering-schema';
export type {
    ClassificationSubjectOfferingFormValues,
    SubjectOfferingDuplicateStrategy,
    SubjectOfferingFormValues,
    SubjectOfferingUpdateFormValues,
} from './subjects/subject-offering-schema';

// Users
export { userFormSchema, userFormBaseSchema } from './admin/users/user-schema';
export type { UserFormValues } from './admin/users/user-schema';

// Student Whitelist
export {
    bulkImportStudentWhitelistSchema,
    createStudentWhitelistSchema,
    deleteStudentWhitelistParamsSchema,
    getStudentWhitelistQuerySchema,
    purgeStudentWhitelistResultSchema,
    purgeStudentWhitelistSchema,
    studentWhitelistBulkImportFailureSchema,
    studentWhitelistBulkImportResultSchema,
    studentWhitelistBulkImportRowSchema,
    studentWhitelistFormSchema,
    studentWhitelistRecordSchema,
    studentWhitelistStatusSchema,
    updateStudentWhitelistParamsSchema,
    updateStudentWhitelistSchema,
} from './admin/student-whitelist/student-whitelist-schema';
export type {
    BulkImportStudentWhitelistSchemaValues,
    CreateStudentWhitelistSchemaValues,
    DeleteStudentWhitelistParamsValues,
    GetStudentWhitelistQueryValues,
    PurgeStudentWhitelistResultValues,
    PurgeStudentWhitelistSchemaValues,
    StudentWhitelistBulkImportFailureValues,
    StudentWhitelistBulkImportResultValues,
    StudentWhitelistBulkImportRowValues,
    StudentWhitelistFormValues,
    UpdateStudentWhitelistParamsValues,
    UpdateStudentWhitelistSchemaValues,
} from './admin/student-whitelist/student-whitelist-schema';

// Classrooms
export {
    classroomFormSchema,
    classroomUpdateFormSchema,
    classroomScopeSummarySchema,
    classroomSummarySchema,
    classroomStudentSchema,
    classroomInstructorSchema,
    classroomDetailSchema,
} from './admin/classrooms/classroom-schema';
export type {
    ClassroomFormValues,
    ClassroomUpdateFormValues,
    ClassroomScopeSummaryValues,
    ClassroomSummaryValues,
    ClassroomStudentValues,
    ClassroomInstructorValues,
    ClassroomDetailValues,
} from './admin/classrooms/classroom-schema';

// Sections
export { sectionSchema } from './admin/sections/section-schema';
export type { SectionFormValues } from './admin/sections/section-schema';

// Assignments
export { assignmentFormSchema } from './assignments/AssignmentSchema';
export type { AssignmentFormValues } from './assignments/AssignmentSchema';

// Auth
export { LoginSchema } from './auth/login-schema';
export type { LoginSchemaType } from './auth/login-schema';
export { RegisterSchema, ApiRegisterSchema } from './auth/register-schema';
export type { RegisterSchemaType, ApiRegisterSchemaType } from './auth/register-schema';

// Onboarding
export { onboardingSchema } from './onboarding/onboarding-schema';
export type { OnboardingSchemaValues } from './onboarding/onboarding-schema';

// Update Password
export * from './auth/update-password-schema';
export { UpdatePasswordSchema } from './auth/update-password-schema';
export type { UpdatePasswordSchemaType } from './auth/update-password-schema';

// Instructor Subjects
export {
    enrollSubjectSchema,
    instructorSubjectEnrollmentSchema,
    instructorSubjectRequestSchema,
    updateEnrollmentRequestSchema,
} from './subjects/enroll-subject-schema';
export type {
    EnrollSubjectFormValues,
    InstructorSubjectEnrollmentFormValues,
    InstructorSubjectRequestValues,
    UpdateEnrollmentRequestValues,
} from './subjects/enroll-subject-schema';

export { studentClassroomSchema } from './subjects/student-classroom-schema';
export type { StudentClassroom } from './subjects/student-classroom-schema';

export * from './subjects/enrollment-request-schema';

// Gemini / AI
export * from './gemini/gemini-schema';

// Access Control
export * from './access-control/access-control-schema';

// Messages
export * from './messages/message-schema';
export * from './feedbacks/feedback-schema';
export * from './pdf-documents';
