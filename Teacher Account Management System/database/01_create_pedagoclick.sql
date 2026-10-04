/*
  Pedagoclick database
  Target: Microsoft SQL Server 2019+
  This is the source database for an EF Core database-first model.
  Generate models after running this script:
    dotnet ef dbcontext scaffold "<connection-string>" Microsoft.EntityFrameworkCore.SqlServer \
      --context PedagoclickDbContext --context-dir Data --output-dir Data/Entities \
      --use-database-names --no-onconfiguring --force
*/

IF DB_ID(N'Pedagoclick') IS NULL
BEGIN
    CREATE DATABASE [Pedagoclick];
END;
GO

USE [Pedagoclick];
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NOT NULL
    DROP TABLE dbo.AuditLogs;
IF OBJECT_ID(N'dbo.AppUserRoles', N'U') IS NOT NULL
    DROP TABLE dbo.AppUserRoles;
IF OBJECT_ID(N'dbo.CollaborationReplies', N'U') IS NOT NULL
    DROP TABLE dbo.CollaborationReplies;
IF OBJECT_ID(N'dbo.CollaborationThreads', N'U') IS NOT NULL
    DROP TABLE dbo.CollaborationThreads;
IF OBJECT_ID(N'dbo.GradeScores', N'U') IS NOT NULL
    DROP TABLE dbo.GradeScores;
IF OBJECT_ID(N'dbo.AssessmentItems', N'U') IS NOT NULL
    DROP TABLE dbo.AssessmentItems;
IF OBJECT_ID(N'dbo.AssessmentComponents', N'U') IS NOT NULL
    DROP TABLE dbo.AssessmentComponents;
IF OBJECT_ID(N'dbo.Enrollments', N'U') IS NOT NULL
    DROP TABLE dbo.Enrollments;
IF OBJECT_ID(N'dbo.ClassAssignments', N'U') IS NOT NULL
    DROP TABLE dbo.ClassAssignments;
IF OBJECT_ID(N'dbo.Classes', N'U') IS NOT NULL
    DROP TABLE dbo.Classes;
IF OBJECT_ID(N'dbo.Sections', N'U') IS NOT NULL
    DROP TABLE dbo.Sections;
IF OBJECT_ID(N'dbo.Subjects', N'U') IS NOT NULL
    DROP TABLE dbo.Subjects;
IF OBJECT_ID(N'dbo.GradeLevels', N'U') IS NOT NULL
    DROP TABLE dbo.GradeLevels;
IF OBJECT_ID(N'dbo.Learners', N'U') IS NOT NULL
    DROP TABLE dbo.Learners;
IF OBJECT_ID(N'dbo.SchoolYears', N'U') IS NOT NULL
    DROP TABLE dbo.SchoolYears;
IF OBJECT_ID(N'dbo.AppUsers', N'U') IS NOT NULL
    DROP TABLE dbo.AppUsers;
IF OBJECT_ID(N'dbo.AppRoles', N'U') IS NOT NULL
    DROP TABLE dbo.AppRoles;
GO

CREATE TABLE dbo.AppRoles (
    RoleId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AppRoles PRIMARY KEY,
    RoleCode varchar(20) NOT NULL CONSTRAINT UQ_AppRoles_RoleCode UNIQUE,
    DisplayName nvarchar(80) NOT NULL
);

CREATE TABLE dbo.AppUsers (
    UserId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AppUsers PRIMARY KEY,
    Email nvarchar(320) NOT NULL CONSTRAINT UQ_AppUsers_Email UNIQUE,
    FullName nvarchar(160) NOT NULL,
    PasswordHash varbinary(512) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_AppUsers_IsActive DEFAULT (1),
    IsLocked bit NOT NULL CONSTRAINT DF_AppUsers_IsLocked DEFAULT (0),
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_AppUsers_CreatedAt DEFAULT (sysutcdatetime()),
    UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_AppUsers_UpdatedAt DEFAULT (sysutcdatetime())
);

CREATE TABLE dbo.AppUserRoles (
    UserId int NOT NULL,
    RoleId int NOT NULL,
    CONSTRAINT PK_AppUserRoles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_AppUserRoles_Users FOREIGN KEY (UserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT FK_AppUserRoles_Roles FOREIGN KEY (RoleId) REFERENCES dbo.AppRoles(RoleId)
);

CREATE TABLE dbo.SchoolYears (
    SchoolYearId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_SchoolYears PRIMARY KEY,
    YearLabel varchar(9) NOT NULL CONSTRAINT UQ_SchoolYears_YearLabel UNIQUE,
    StartsOn date NOT NULL,
    EndsOn date NOT NULL,
    IsCurrent bit NOT NULL CONSTRAINT DF_SchoolYears_IsCurrent DEFAULT (0),
    CONSTRAINT CK_SchoolYears_Dates CHECK (EndsOn > StartsOn)
);

CREATE TABLE dbo.GradeLevels (
    GradeLevelId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_GradeLevels PRIMARY KEY,
    GradeCode varchar(20) NOT NULL CONSTRAINT UQ_GradeLevels_GradeCode UNIQUE,
    DisplayName nvarchar(80) NOT NULL
);

CREATE TABLE dbo.Subjects (
    SubjectId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Subjects PRIMARY KEY,
    SubjectCode varchar(30) NOT NULL CONSTRAINT UQ_Subjects_SubjectCode UNIQUE,
    SubjectName nvarchar(120) NOT NULL
);

CREATE TABLE dbo.Sections (
    SectionId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sections PRIMARY KEY,
    SectionName nvarchar(80) NOT NULL,
    GradeLevelId int NOT NULL,
    CONSTRAINT FK_Sections_GradeLevels FOREIGN KEY (GradeLevelId) REFERENCES dbo.GradeLevels(GradeLevelId),
    CONSTRAINT UQ_Sections_Grade_Section UNIQUE (GradeLevelId, SectionName)
);

CREATE TABLE dbo.Classes (
    ClassId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Classes PRIMARY KEY,
    SchoolYearId int NOT NULL,
    SectionId int NOT NULL,
    SubjectId int NOT NULL,
    AdviserUserId int NULL,
    CONSTRAINT FK_Classes_SchoolYears FOREIGN KEY (SchoolYearId) REFERENCES dbo.SchoolYears(SchoolYearId),
    CONSTRAINT FK_Classes_Sections FOREIGN KEY (SectionId) REFERENCES dbo.Sections(SectionId),
    CONSTRAINT FK_Classes_Subjects FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId),
    CONSTRAINT FK_Classes_Adviser FOREIGN KEY (AdviserUserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT UQ_Classes_SchoolYear_Section_Subject UNIQUE (SchoolYearId, SectionId, SubjectId)
);

CREATE TABLE dbo.ClassAssignments (
    ClassAssignmentId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClassAssignments PRIMARY KEY,
    ClassId int NOT NULL,
    TeacherUserId int NOT NULL,
    AssignedAt datetime2(0) NOT NULL CONSTRAINT DF_ClassAssignments_AssignedAt DEFAULT (sysutcdatetime()),
    IsActive bit NOT NULL CONSTRAINT DF_ClassAssignments_IsActive DEFAULT (1),
    CONSTRAINT FK_ClassAssignments_Classes FOREIGN KEY (ClassId) REFERENCES dbo.Classes(ClassId),
    CONSTRAINT FK_ClassAssignments_Teacher FOREIGN KEY (TeacherUserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT UQ_ClassAssignments_Class_Teacher UNIQUE (ClassId, TeacherUserId)
);

CREATE TABLE dbo.Learners (
    LearnerId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Learners PRIMARY KEY,
    Lrn varchar(20) NOT NULL CONSTRAINT UQ_Learners_Lrn UNIQUE,
    FullName nvarchar(160) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Learners_IsActive DEFAULT (1),
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Learners_CreatedAt DEFAULT (sysutcdatetime()),
    UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_Learners_UpdatedAt DEFAULT (sysutcdatetime())
);

CREATE TABLE dbo.Enrollments (
    EnrollmentId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Enrollments PRIMARY KEY,
    ClassId int NOT NULL,
    LearnerId int NOT NULL,
    EnrolledAt datetime2(0) NOT NULL CONSTRAINT DF_Enrollments_EnrolledAt DEFAULT (sysutcdatetime()),
    IsActive bit NOT NULL CONSTRAINT DF_Enrollments_IsActive DEFAULT (1),
    CONSTRAINT FK_Enrollments_Classes FOREIGN KEY (ClassId) REFERENCES dbo.Classes(ClassId),
    CONSTRAINT FK_Enrollments_Learners FOREIGN KEY (LearnerId) REFERENCES dbo.Learners(LearnerId),
    CONSTRAINT UQ_Enrollments_Class_Learner UNIQUE (ClassId, LearnerId)
);

CREATE TABLE dbo.AssessmentComponents (
    AssessmentComponentId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AssessmentComponents PRIMARY KEY,
    ClassId int NOT NULL,
    Quarter tinyint NOT NULL,
    ComponentCode varchar(4) NOT NULL,
    ComponentName nvarchar(80) NOT NULL,
    Weight decimal(5,4) NOT NULL,
    SortOrder tinyint NOT NULL,
    CONSTRAINT FK_AssessmentComponents_Classes FOREIGN KEY (ClassId) REFERENCES dbo.Classes(ClassId),
    CONSTRAINT CK_AssessmentComponents_Quarter CHECK (Quarter BETWEEN 1 AND 4),
    CONSTRAINT CK_AssessmentComponents_Weight CHECK (Weight >= 0 AND Weight <= 1),
    CONSTRAINT UQ_AssessmentComponents_Class_Quarter_Code UNIQUE (ClassId, Quarter, ComponentCode)
);

CREATE TABLE dbo.AssessmentItems (
    AssessmentItemId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AssessmentItems PRIMARY KEY,
    AssessmentComponentId int NOT NULL,
    ItemCode varchar(12) NOT NULL,
    MaxScore decimal(7,2) NOT NULL,
    SortOrder tinyint NOT NULL,
    CONSTRAINT FK_AssessmentItems_Components FOREIGN KEY (AssessmentComponentId) REFERENCES dbo.AssessmentComponents(AssessmentComponentId),
    CONSTRAINT CK_AssessmentItems_MaxScore CHECK (MaxScore > 0),
    CONSTRAINT UQ_AssessmentItems_Component_ItemCode UNIQUE (AssessmentComponentId, ItemCode)
);

CREATE TABLE dbo.GradeScores (
    GradeScoreId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_GradeScores PRIMARY KEY,
    AssessmentItemId int NOT NULL,
    EnrollmentId int NOT NULL,
    Score decimal(7,2) NULL,
    SyncStatus varchar(12) NOT NULL CONSTRAINT DF_GradeScores_SyncStatus DEFAULT ('synced'),
    RowVersion rowversion NOT NULL,
    UpdatedByUserId int NOT NULL,
    UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_GradeScores_UpdatedAt DEFAULT (sysutcdatetime()),
    CONSTRAINT FK_GradeScores_Items FOREIGN KEY (AssessmentItemId) REFERENCES dbo.AssessmentItems(AssessmentItemId),
    CONSTRAINT FK_GradeScores_Enrollments FOREIGN KEY (EnrollmentId) REFERENCES dbo.Enrollments(EnrollmentId),
    CONSTRAINT FK_GradeScores_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT CK_GradeScores_SyncStatus CHECK (SyncStatus IN ('synced', 'pending', 'failed')),
    CONSTRAINT UQ_GradeScores_Item_Enrollment UNIQUE (AssessmentItemId, EnrollmentId)
);

CREATE TABLE dbo.CollaborationThreads (
    ThreadId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_CollaborationThreads PRIMARY KEY,
    FromUserId int NOT NULL,
    ToUserId int NOT NULL,
    ClassId int NULL,
    LearnerId int NULL,
    Subject nvarchar(160) NOT NULL,
    ThreadType varchar(20) NOT NULL,
    Body nvarchar(4000) NOT NULL,
    IsResolved bit NOT NULL CONSTRAINT DF_CollaborationThreads_IsResolved DEFAULT (0),
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_CollaborationThreads_CreatedAt DEFAULT (sysutcdatetime()),
    ResolvedAt datetime2(0) NULL,
    CONSTRAINT FK_CollaborationThreads_FromUser FOREIGN KEY (FromUserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT FK_CollaborationThreads_ToUser FOREIGN KEY (ToUserId) REFERENCES dbo.AppUsers(UserId),
    CONSTRAINT FK_CollaborationThreads_Classes FOREIGN KEY (ClassId) REFERENCES dbo.Classes(ClassId),
    CONSTRAINT FK_CollaborationThreads_Learners FOREIGN KEY (LearnerId) REFERENCES dbo.Learners(LearnerId),
    CONSTRAINT CK_CollaborationThreads_Type CHECK (ThreadType IN ('Concern', 'Missing grades', 'Info'))
);

CREATE TABLE dbo.CollaborationReplies (
    ReplyId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_CollaborationReplies PRIMARY KEY,
    ThreadId bigint NOT NULL,
    UserId int NOT NULL,
    Body nvarchar(4000) NOT NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_CollaborationReplies_CreatedAt DEFAULT (sysutcdatetime()),
    CONSTRAINT FK_CollaborationReplies_Threads FOREIGN KEY (ThreadId) REFERENCES dbo.CollaborationThreads(ThreadId),
    CONSTRAINT FK_CollaborationReplies_Users FOREIGN KEY (UserId) REFERENCES dbo.AppUsers(UserId)
);

CREATE TABLE dbo.AuditLogs (
    AuditLogId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    UserId int NOT NULL,
    ActionCode varchar(40) NOT NULL,
    EntityName varchar(80) NOT NULL,
    EntityId varchar(80) NULL,
    Detail nvarchar(1000) NOT NULL,
    OccurredAt datetime2(0) NOT NULL CONSTRAINT DF_AuditLogs_OccurredAt DEFAULT (sysutcdatetime()),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.AppUsers(UserId)
);
GO

CREATE INDEX IX_Classes_SchoolYear ON dbo.Classes (SchoolYearId);
CREATE INDEX IX_ClassAssignments_Teacher ON dbo.ClassAssignments (TeacherUserId, IsActive);
CREATE INDEX IX_Enrollments_Learner ON dbo.Enrollments (LearnerId, IsActive);
CREATE INDEX IX_GradeScores_Enrollment ON dbo.GradeScores (EnrollmentId);
CREATE INDEX IX_CollaborationThreads_ToUser ON dbo.CollaborationThreads (ToUserId, IsResolved, CreatedAt DESC);
CREATE INDEX IX_AuditLogs_OccurredAt ON dbo.AuditLogs (OccurredAt DESC);
GO

INSERT dbo.AppRoles (RoleCode, DisplayName)
VALUES ('teacher', 'Subject Teacher'), ('adviser', 'Class Adviser'), ('admin', 'Administrator');

INSERT dbo.AppUsers (Email, FullName)
VALUES
    ('corazon.villanueva@deped.gov.ph', 'Ma. Corazon Villanueva'),
    ('ramon.bautista@deped.gov.ph', 'Ramon D. Bautista'),
    ('lourdes.aquino@deped.gov.ph', 'Lourdes Aquino'),
    ('josefina.reyes@deped.gov.ph', 'Josefina P. Reyes'),
    ('eduardo.manalo@deped.gov.ph', 'Eduardo S. Manalo'),
    ('grace.tolentino@deped.gov.ph', 'Grace Anne Tolentino');

INSERT dbo.AppUserRoles (UserId, RoleId)
SELECT u.UserId, r.RoleId
FROM dbo.AppUsers u
JOIN dbo.AppRoles r ON r.RoleCode =
    CASE
        WHEN u.Email IN ('corazon.villanueva@deped.gov.ph', 'josefina.reyes@deped.gov.ph',
                         'eduardo.manalo@deped.gov.ph') THEN 'teacher'
        WHEN u.Email IN ('ramon.bautista@deped.gov.ph', 'grace.tolentino@deped.gov.ph') THEN 'adviser'
        WHEN u.Email = 'lourdes.aquino@deped.gov.ph' THEN 'admin'
    END;

INSERT dbo.SchoolYears (YearLabel, StartsOn, EndsOn, IsCurrent)
VALUES ('2026-2027', '2026-06-01', '2027-04-30', 1);

INSERT dbo.GradeLevels (GradeCode, DisplayName)
VALUES ('5', 'Grade 5'), ('6', 'Grade 6');

INSERT dbo.Subjects (SubjectCode, SubjectName)
VALUES ('MATH5', 'Mathematics 5'), ('MATH6', 'Mathematics 6'), ('FIL6', 'Filipino 6');

INSERT dbo.Sections (SectionName, GradeLevelId)
SELECT v.SectionName, g.GradeLevelId
FROM (VALUES ('Rizal', '6'), ('Bonifacio', '6'), ('Mabini', '5')) v(SectionName, GradeCode)
JOIN dbo.GradeLevels g ON g.GradeCode = v.GradeCode;

INSERT dbo.Learners (Lrn, FullName)
VALUES
    ('2026-10-0142', 'Aguilar, Jasmine Rose'),
    ('2026-10-0157', 'Bernardo, Miguel Angelo'),
    ('2026-10-0163', 'Castillo, Andrea Nicole'),
    ('2026-10-0171', 'Dela Cruz, John Paolo'),
    ('2026-10-0188', 'Espino, Trisha Mae'),
    ('2026-10-0194', 'Fernandez, Carlo Emmanuel'),
    ('2026-10-0205', 'Garcia, Bianca Louise'),
    ('2026-10-0219', 'Hernandez, Lance Gabriel');

INSERT dbo.Classes (SchoolYearId, SectionId, SubjectId, AdviserUserId)
SELECT sy.SchoolYearId, s.SectionId, sub.SubjectId,
       CASE WHEN s.SectionName = 'Rizal' THEN u.UserId END
FROM dbo.SchoolYears sy
JOIN dbo.Sections s ON 1 = 1
JOIN dbo.Subjects sub ON
    (s.SectionName IN ('Rizal', 'Bonifacio') AND sub.SubjectCode = 'MATH6')
    OR (s.SectionName = 'Mabini' AND sub.SubjectCode = 'MATH5')
    OR (s.SectionName = 'Rizal' AND sub.SubjectCode = 'FIL6')
LEFT JOIN dbo.AppUsers u ON u.Email = 'ramon.bautista@deped.gov.ph'
WHERE sy.YearLabel = '2026-2027';

INSERT dbo.ClassAssignments (ClassId, TeacherUserId)
SELECT c.ClassId, u.UserId
FROM dbo.Classes c
JOIN dbo.Sections s ON s.SectionId = c.SectionId
JOIN dbo.Subjects sub ON sub.SubjectId = c.SubjectId
JOIN dbo.AppUsers u ON u.Email =
    CASE WHEN sub.SubjectCode IN ('MATH5', 'MATH6') THEN 'corazon.villanueva@deped.gov.ph'
         ELSE 'ramon.bautista@deped.gov.ph' END;

INSERT dbo.Enrollments (ClassId, LearnerId)
SELECT c.ClassId, l.LearnerId
FROM dbo.Classes c
JOIN dbo.Sections s ON s.SectionId = c.SectionId
JOIN dbo.Learners l ON 1 = 1
WHERE s.SectionName = 'Rizal';

INSERT dbo.AssessmentComponents
    (ClassId, Quarter, ComponentCode, ComponentName, Weight, SortOrder)
SELECT c.ClassId, q.Quarter, v.ComponentCode, v.ComponentName, v.Weight, v.SortOrder
FROM dbo.Classes c
CROSS JOIN (VALUES (1), (2), (3), (4)) q(Quarter)
CROSS JOIN (VALUES
    ('WW', 'Written Work', 0.3000, 1),
    ('PT', 'Performance Tasks', 0.5000, 2),
    ('QA', 'Quarterly Assessment', 0.2000, 3)
) v(ComponentCode, ComponentName, Weight, SortOrder);

INSERT dbo.AssessmentItems (AssessmentComponentId, ItemCode, MaxScore, SortOrder)
SELECT ac.AssessmentComponentId, x.ItemCode, x.MaxScore, x.SortOrder
FROM dbo.AssessmentComponents ac
CROSS APPLY (
    SELECT CONCAT(ac.ComponentCode, n.SortOrder) AS ItemCode, n.MaxScore, n.SortOrder
    FROM (VALUES
        ('WW', 1, 20.00), ('WW', 2, 15.00), ('WW', 3, 25.00),
        ('PT', 1, 30.00), ('PT', 2, 20.00),
        ('QA', 1, 50.00)
    ) n(ComponentCode, SortOrder, MaxScore)
    WHERE n.ComponentCode = ac.ComponentCode
) x;

INSERT dbo.GradeScores
    (AssessmentItemId, EnrollmentId, Score, UpdatedByUserId)
SELECT ai.AssessmentItemId, e.EnrollmentId, scores.Score, u.UserId
FROM (VALUES
    ('2026-10-0142', 'WW1', 18.00), ('2026-10-0142', 'WW2', 14.00), ('2026-10-0142', 'WW3', 22.00), ('2026-10-0142', 'PT1', 27.00), ('2026-10-0142', 'PT2', 18.00), ('2026-10-0142', 'QA1', 44.00),
    ('2026-10-0157', 'WW1', 15.00), ('2026-10-0157', 'WW2', 11.00), ('2026-10-0157', 'WW3', 19.00), ('2026-10-0157', 'PT1', 24.00), ('2026-10-0157', 'PT2', 15.00), ('2026-10-0157', 'QA1', 36.00),
    ('2026-10-0163', 'WW1', 20.00), ('2026-10-0163', 'WW2', 15.00), ('2026-10-0163', 'WW3', 24.00), ('2026-10-0163', 'PT1', 29.00), ('2026-10-0163', 'PT2', 19.00), ('2026-10-0163', 'QA1', 47.00),
    ('2026-10-0171', 'WW1', 12.00), ('2026-10-0171', 'WW2', 9.00), ('2026-10-0171', 'WW3', 16.00), ('2026-10-0171', 'PT1', 21.00), ('2026-10-0171', 'PT2', 13.00), ('2026-10-0171', 'QA1', 30.00),
    ('2026-10-0188', 'WW1', 17.00), ('2026-10-0188', 'WW2', 13.00), ('2026-10-0188', 'WW3', 20.00),
    ('2026-10-0194', 'WW1', 14.00), ('2026-10-0194', 'WW2', 12.00), ('2026-10-0194', 'WW3', 18.00), ('2026-10-0194', 'PT1', 23.00), ('2026-10-0194', 'PT2', 16.00), ('2026-10-0194', 'QA1', 33.00),
    ('2026-10-0205', 'WW1', 19.00), ('2026-10-0205', 'WW2', 14.00), ('2026-10-0205', 'WW3', 23.00), ('2026-10-0205', 'PT1', 26.00), ('2026-10-0205', 'PT2', 17.00), ('2026-10-0205', 'QA1', 41.00)
) scores(Lrn, ItemCode, Score)
JOIN dbo.Learners l ON l.Lrn = scores.Lrn
JOIN dbo.Enrollments e ON e.LearnerId = l.LearnerId
JOIN dbo.Classes c ON c.ClassId = e.ClassId
JOIN dbo.Subjects sub ON sub.SubjectId = c.SubjectId AND sub.SubjectCode = 'MATH6'
JOIN dbo.Sections s ON s.SectionId = c.SectionId AND s.SectionName = 'Rizal'
JOIN dbo.AssessmentComponents ac ON ac.ClassId = c.ClassId AND ac.Quarter = 2
JOIN dbo.AssessmentItems ai ON ai.AssessmentComponentId = ac.AssessmentComponentId
    AND ai.ItemCode = scores.ItemCode
JOIN dbo.AppUsers u ON u.Email = 'corazon.villanueva@deped.gov.ph';
GO
