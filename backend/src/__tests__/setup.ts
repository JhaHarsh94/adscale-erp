if (!Object.hasOwn) {
  Object.hasOwn = (obj: object, key: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(obj, key);
}

if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search: any, replace: any) {
    if (search instanceof RegExp) {
      return this.replace(search, replace);
    }
    return this.split(String(search)).join(String(replace));
  };
}

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(),
  AttendanceMethod: {
    NORMAL: "NORMAL",
    QR: "QR",
    SELFIE: "SELFIE",
    GPS: "GPS",
    BIOMETRIC: "BIOMETRIC",
    MANUAL: "MANUAL",
  },
  AttendanceStatus: {
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    HALF_DAY: "HALF_DAY",
    LATE: "LATE",
    ON_LEAVE: "ON_LEAVE",
  },
  AttendanceRequestStatus: {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
  },
  BiometricProvider: {
    WEBAUTHN: "WEBAUTHN",
    MANTRA: "MANTRA",
    SECUGEN: "SECUGEN",
    ZKTECO: "ZKTECO",
    ESSL: "ESSL",
    OTHER: "OTHER",
  },
  EmploymentStatus: {
    ACTIVE: "ACTIVE",
    ON_PROBATION: "ON_PROBATION",
    INACTIVE: "INACTIVE",
    RESIGNED: "RESIGNED",
    TERMINATED: "TERMINATED",
  },
  SkillLevel: {
    BEGINNER: "BEGINNER",
    INTERMEDIATE: "INTERMEDIATE",
    ADVANCED: "ADVANCED",
    EXPERT: "EXPERT",
  },
  EmployeeDocumentType: {
    AADHAAR: "AADHAAR",
    PAN: "PAN",
    RESUME: "RESUME",
    OFFER_LETTER: "OFFER_LETTER",
    EXPERIENCE_LETTER: "EXPERIENCE_LETTER",
    CERTIFICATE: "CERTIFICATE",
    OTHER: "OTHER",
  },
  LeaveStatus: {
    PENDING: "PENDING",
    TEAM_LEAD_APPROVED: "TEAM_LEAD_APPROVED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
  },
  LeaveDayType: {
    FULL_DAY: "FULL_DAY",
    HALF_DAY: "HALF_DAY",
  },
  LeaveApprovalAction: {
    APPLIED: "APPLIED",
    TEAM_LEAD_APPROVED: "TEAM_LEAD_APPROVED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
  },
  UserStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
  },
  TeamMemberRole: {
    TEAM_LEAD: "TEAM_LEAD",
    MEMBER: "MEMBER",
    INTERN: "INTERN",
    FREELANCER: "FREELANCER",
  },
}));
