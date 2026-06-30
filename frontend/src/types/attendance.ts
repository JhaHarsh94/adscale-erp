export interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  totalBreakMins: number;
  totalWorkMins: number;
  status: string;
  isLate: boolean;
  isHalfDay: boolean;
  checkInSelfieUrl?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInLocationVerified: boolean;
  checkInBiometricVerified: boolean;
  employee?: {
    user?: {
      name: string;
      email: string;
    };
  };
}