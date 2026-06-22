export interface TaskComment {
  id: string;
  taskId: string;
  authorId?: string | null;
  body: string;
  author?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface TaskStatusLog {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  remarks?: string | null;
  changedBy?: { name: string } | null;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependencyType: string;
  dependsOn: { id: string; taskNumber: string; title: string; status: string };
}

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  estimatedHrs?: number | null;
  actualHrs?: number | null;
  sortOrder: number;
  project?: { id: string; name: string; projectCode: string } | null;
  milestone?: { id: string; title: string } | null;
  assignedTo?: { id: string; employeeCode: string; user: { name: string; email: string } } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  parent?: { id: string; taskNumber: string; title: string } | null;
  subTasks: { id: string; taskNumber: string; title: string; status: string }[];
  comments: TaskComment[];
  dependencies: TaskDependency[];
  dependentBy: { id: string; task: { id: string; taskNumber: string; title: string; status: string } }[];
  statusLogs: TaskStatusLog[];
  createdAt: string;
}

export interface TaskDashboard {
  total: number;
  backlog: number;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  cancelled: number;
}

export interface RecurringTask {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  recurrenceType: string;
  intervalValue?: number | null;
  startDate: string;
  endDate?: string | null;
  nextOccurrence: string;
  isActive: boolean;
  totalGenerated: number;
}

export interface TaskKanban {
  BACKLOG: Task[];
  TODO: Task[];
  IN_PROGRESS: Task[];
  IN_REVIEW: Task[];
  DONE: Task[];
  CANCELLED: Task[];
}
