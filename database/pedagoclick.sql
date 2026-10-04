/* =====================================================================
   Pedagoclick - SQL Server (Express) schema + demo seed data
   Target : SQL Server 2019+ / SQL Server Express (also works in Docker)
   Run    : once, on a fresh server. Re-running is safe: existing tables
            are skipped and the seed block only runs when dbo.Users is empty.
   Notes  : - File is plain ASCII on purpose (no encoding problems in sqlcmd).
            - Seeds only the admin account and the students. Teachers and
              advisers register themselves (new accounts start as 'Pending').
            - The admin PasswordHash is a PLACEHOLDER. The API must set a real hash.
            - Final grades are NOT stored; the API computes them from Scores.
   ===================================================================== */
SET NOCOUNT ON;
GO

IF DB_ID(N'Pedagoclick') IS NULL
    CREATE DATABASE Pedagoclick;
GO

USE Pedagoclick;
GO

/* ---------------------------------------------------------------------
   1. SchoolYears  (label like 2026-2027 is computed with an en dash)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.SchoolYears', N'U') IS NULL
CREATE TABLE dbo.SchoolYears (
    SchoolYearId INT IDENTITY(1,1) NOT NULL,
    StartYear    SMALLINT NOT NULL,
    Label        AS (CONCAT(CAST(StartYear AS NVARCHAR(4)), NCHAR(8211), CAST(StartYear + 1 AS NVARCHAR(4)))),
    IsLocked     BIT NOT NULL CONSTRAINT DF_SchoolYears_IsLocked DEFAULT (0),
    CONSTRAINT PK_SchoolYears PRIMARY KEY (SchoolYearId),
    CONSTRAINT UQ_SchoolYears_StartYear UNIQUE (StartYear)
);
GO

/* ---------------------------------------------------------------------
   2. GradingPeriods  (Q1-Q4 per school year; admin "Periods" screen)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.GradingPeriods', N'U') IS NULL
CREATE TABLE dbo.GradingPeriods (
    GradingPeriodId INT IDENTITY(1,1) NOT NULL,
    SchoolYearId    INT NOT NULL,
    Quarter         TINYINT NOT NULL,
    StartDate       DATE NULL,
    EndDate         DATE NULL,
    IsOpen          BIT NOT NULL CONSTRAINT DF_GradingPeriods_IsOpen DEFAULT (0),
    CONSTRAINT PK_GradingPeriods PRIMARY KEY (GradingPeriodId),
    CONSTRAINT FK_GradingPeriods_SchoolYears FOREIGN KEY (SchoolYearId) REFERENCES dbo.SchoolYears (SchoolYearId),
    CONSTRAINT UQ_GradingPeriods_Year_Quarter UNIQUE (SchoolYearId, Quarter),
    CONSTRAINT CK_GradingPeriods_Quarter CHECK (Quarter BETWEEN 1 AND 4),
    CONSTRAINT CK_GradingPeriods_Dates CHECK (StartDate IS NULL OR EndDate IS NULL OR EndDate >= StartDate)
);
GO

/* ---------------------------------------------------------------------
   3. Users  (teacher / adviser / admin)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
CREATE TABLE dbo.Users (
    UserId       INT IDENTITY(1,1) NOT NULL,
    FullName     NVARCHAR(100) NOT NULL,
    Email        NVARCHAR(256) NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    UserRole     VARCHAR(10) NOT NULL,
    Title        NVARCHAR(100) NULL,
    Status       VARCHAR(10) NOT NULL CONSTRAINT DF_Users_Status DEFAULT ('Pending'),
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_UserRole CHECK (UserRole IN ('teacher', 'adviser', 'admin')),
    CONSTRAINT CK_Users_Status CHECK (Status IN ('Active', 'Locked', 'Pending'))
);
GO

/* ---------------------------------------------------------------------
   4. Sections  (Grade 6 - Rizal, etc.; one optional adviser)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Sections', N'U') IS NULL
CREATE TABLE dbo.Sections (
    SectionId     INT IDENTITY(1,1) NOT NULL,
    GradeLevel    TINYINT NOT NULL,
    SectionName   NVARCHAR(50) NOT NULL,
    AdviserUserId INT NULL,
    CONSTRAINT PK_Sections PRIMARY KEY (SectionId),
    CONSTRAINT FK_Sections_Users FOREIGN KEY (AdviserUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT UQ_Sections_Grade_Name UNIQUE (GradeLevel, SectionName),
    CONSTRAINT CK_Sections_GradeLevel CHECK (GradeLevel BETWEEN 1 AND 6)
);
GO

/* ---------------------------------------------------------------------
   5. Subjects
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Subjects', N'U') IS NULL
CREATE TABLE dbo.Subjects (
    SubjectId INT IDENTITY(1,1) NOT NULL,
    Name      NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_Subjects PRIMARY KEY (SubjectId),
    CONSTRAINT UQ_Subjects_Name UNIQUE (Name)
);
GO

/* ---------------------------------------------------------------------
   6. Students  (Lrn = the learner ID shown in the app)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Students', N'U') IS NULL
CREATE TABLE dbo.Students (
    StudentId INT IDENTITY(1,1) NOT NULL,
    Lrn       NVARCHAR(20) NOT NULL,
    FullName  NVARCHAR(150) NOT NULL,
    SectionId INT NOT NULL,
    IsActive  BIT NOT NULL CONSTRAINT DF_Students_IsActive DEFAULT (1),
    CONSTRAINT PK_Students PRIMARY KEY (StudentId),
    CONSTRAINT UQ_Students_Lrn UNIQUE (Lrn),
    CONSTRAINT FK_Students_Sections FOREIGN KEY (SectionId) REFERENCES dbo.Sections (SectionId),
    INDEX IX_Students_SectionId NONCLUSTERED (SectionId)
);
GO

/* ---------------------------------------------------------------------
   7. TeachingAssignments  (teacher + subject + section + school year)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.TeachingAssignments', N'U') IS NULL
CREATE TABLE dbo.TeachingAssignments (
    AssignmentId  INT IDENTITY(1,1) NOT NULL,
    SchoolYearId  INT NOT NULL,
    SectionId     INT NOT NULL,
    SubjectId     INT NOT NULL,
    TeacherUserId INT NOT NULL,
    CONSTRAINT PK_TeachingAssignments PRIMARY KEY (AssignmentId),
    CONSTRAINT FK_TeachingAssignments_SchoolYears FOREIGN KEY (SchoolYearId) REFERENCES dbo.SchoolYears (SchoolYearId),
    CONSTRAINT FK_TeachingAssignments_Sections FOREIGN KEY (SectionId) REFERENCES dbo.Sections (SectionId),
    CONSTRAINT FK_TeachingAssignments_Subjects FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects (SubjectId),
    CONSTRAINT FK_TeachingAssignments_Users FOREIGN KEY (TeacherUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT UQ_TeachingAssignments UNIQUE (SchoolYearId, SectionId, SubjectId),
    INDEX IX_TeachingAssignments_Teacher NONCLUSTERED (TeacherUserId)
);
GO

/* ---------------------------------------------------------------------
   8. GradeItems  (the per-class, per-quarter structure: WW1, WW2, PT1, QA1...)
      Component: WW = Written Work (30%), PT = Performance Tasks (50%),
                 QA = Quarterly Assessment (20%). Max 10 items per component.
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.GradeItems', N'U') IS NULL
CREATE TABLE dbo.GradeItems (
    GradeItemId     INT IDENTITY(1,1) NOT NULL,
    AssignmentId    INT NOT NULL,
    GradingPeriodId INT NOT NULL,
    Component       CHAR(2) NOT NULL,
    ItemNo          TINYINT NOT NULL,
    MaxScore        DECIMAL(6,2) NOT NULL,
    CONSTRAINT PK_GradeItems PRIMARY KEY (GradeItemId),
    CONSTRAINT FK_GradeItems_Assignments FOREIGN KEY (AssignmentId) REFERENCES dbo.TeachingAssignments (AssignmentId),
    CONSTRAINT FK_GradeItems_Periods FOREIGN KEY (GradingPeriodId) REFERENCES dbo.GradingPeriods (GradingPeriodId),
    CONSTRAINT UQ_GradeItems UNIQUE (AssignmentId, GradingPeriodId, Component, ItemNo),
    CONSTRAINT CK_GradeItems_Component CHECK (Component IN ('WW', 'PT', 'QA')),
    CONSTRAINT CK_GradeItems_ItemNo CHECK (ItemNo BETWEEN 1 AND 10),
    CONSTRAINT CK_GradeItems_MaxScore CHECK (MaxScore > 0)
);
GO

/* ---------------------------------------------------------------------
   9. Scores  (one row per student per item; a blank cell = no row)
      Score <= MaxScore spans two tables, so the API must validate it.
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Scores', N'U') IS NULL
CREATE TABLE dbo.Scores (
    ScoreId         INT IDENTITY(1,1) NOT NULL,
    GradeItemId     INT NOT NULL,
    StudentId       INT NOT NULL,
    Score           DECIMAL(6,2) NULL,
    SyncStatus      VARCHAR(10) NOT NULL CONSTRAINT DF_Scores_SyncStatus DEFAULT ('synced'),
    UpdatedByUserId INT NULL,
    UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Scores_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Scores PRIMARY KEY (ScoreId),
    CONSTRAINT FK_Scores_GradeItems FOREIGN KEY (GradeItemId) REFERENCES dbo.GradeItems (GradeItemId) ON DELETE CASCADE,
    CONSTRAINT FK_Scores_Students FOREIGN KEY (StudentId) REFERENCES dbo.Students (StudentId),
    CONSTRAINT FK_Scores_Users FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT UQ_Scores_Item_Student UNIQUE (GradeItemId, StudentId),
    CONSTRAINT CK_Scores_Score CHECK (Score IS NULL OR Score >= 0),
    CONSTRAINT CK_Scores_SyncStatus CHECK (SyncStatus IN ('synced', 'pending', 'failed')),
    INDEX IX_Scores_StudentId NONCLUSTERED (StudentId)
);
GO

/* ---------------------------------------------------------------------
   10. Messages  (adviser <-> subject teacher collaboration)
       StudentId NULL = "Whole class"
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Messages', N'U') IS NULL
CREATE TABLE dbo.Messages (
    MessageId  INT IDENTITY(1,1) NOT NULL,
    FromUserId INT NOT NULL,
    ToUserId   INT NOT NULL,
    SubjectId  INT NULL,
    StudentId  INT NULL,
    Kind       VARCHAR(20) NOT NULL,
    Body       NVARCHAR(2000) NOT NULL,
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Messages_CreatedAt DEFAULT (SYSUTCDATETIME()),
    IsResolved BIT NOT NULL CONSTRAINT DF_Messages_IsResolved DEFAULT (0),
    CONSTRAINT PK_Messages PRIMARY KEY (MessageId),
    CONSTRAINT FK_Messages_From FOREIGN KEY (FromUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT FK_Messages_To FOREIGN KEY (ToUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT FK_Messages_Subjects FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects (SubjectId),
    CONSTRAINT FK_Messages_Students FOREIGN KEY (StudentId) REFERENCES dbo.Students (StudentId),
    CONSTRAINT CK_Messages_Kind CHECK (Kind IN ('Concern', 'Missing grades', 'Info')),
    INDEX IX_Messages_ToUserId NONCLUSTERED (ToUserId),
    INDEX IX_Messages_FromUserId NONCLUSTERED (FromUserId)
);
GO

/* ---------------------------------------------------------------------
   11. MessageReplies
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.MessageReplies', N'U') IS NULL
CREATE TABLE dbo.MessageReplies (
    ReplyId   INT IDENTITY(1,1) NOT NULL,
    MessageId INT NOT NULL,
    UserId    INT NOT NULL,
    Body      NVARCHAR(2000) NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MessageReplies_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_MessageReplies PRIMARY KEY (ReplyId),
    CONSTRAINT FK_MessageReplies_Messages FOREIGN KEY (MessageId) REFERENCES dbo.Messages (MessageId) ON DELETE CASCADE,
    CONSTRAINT FK_MessageReplies_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
    INDEX IX_MessageReplies_MessageId NONCLUSTERED (MessageId)
);
GO

/* ---------------------------------------------------------------------
   12. AuditLogs  (append-only: who did what, when)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
CREATE TABLE dbo.AuditLogs (
    AuditLogId BIGINT IDENTITY(1,1) NOT NULL,
    UserId     INT NULL,
    Action     NVARCHAR(30) NOT NULL,
    Detail     NVARCHAR(500) NOT NULL,
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AuditLogs PRIMARY KEY (AuditLogId),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
    INDEX IX_AuditLogs_CreatedAt NONCLUSTERED (CreatedAt)
);
GO

/* =====================================================================
   SEED DATA - admin account + students only
   Teachers and advisers register themselves; the admin activates them.
   Runs only when dbo.Users is empty.
   ===================================================================== */
SET XACT_ABORT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Users)
BEGIN
    BEGIN TRANSACTION;

    /* Admin - placeholder hash, the API must replace it before first login */
    INSERT dbo.Users (FullName, Email, PasswordHash, UserRole, Title, Status) VALUES
        (N'Lourdes Aquino', N'aquino@demo.local', N'!DEMO-PLACEHOLDER-NOT-A-REAL-HASH!',
         'admin', N'Teacher-Support Administrator', 'Active');

    /* Every student must belong to a section, so seed the one they are in (no adviser yet) */
    INSERT dbo.Sections (GradeLevel, SectionName, AdviserUserId) VALUES (6, N'Rizal', NULL);
    DECLARE @rizal INT = (SELECT SectionId FROM dbo.Sections WHERE GradeLevel = 6 AND SectionName = N'Rizal');

    INSERT dbo.Students (Lrn, FullName, SectionId) VALUES
        (N'2026-10-0142', N'Aguilar, Jasmine Rose',      @rizal),
        (N'2026-10-0157', N'Bernardo, Miguel Angelo',    @rizal),
        (N'2026-10-0163', N'Castillo, Andrea Nicole',    @rizal),
        (N'2026-10-0171', N'Dela Cruz, John Paolo',      @rizal),
        (N'2026-10-0188', N'Espino, Trisha Mae',         @rizal),
        (N'2026-10-0194', N'Fernandez, Carlo Emmanuel',  @rizal),
        (N'2026-10-0205', N'Garcia, Bianca Louise',      @rizal),
        (N'2026-10-0219', N'Hernandez, Lance Gabriel',   @rizal);

    COMMIT TRANSACTION;
END
GO
