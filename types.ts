
export interface Worker {
  id?: number;
  name: string;
  hourlyRate: number;
  createdAt: Date;
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  // Fix: Changed type from Blob to File to correctly type the plan document,
  // which includes properties like `name`.
  planFile?: File;
  aiPlanFile?: File;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimeRecord {
  id?: number;
  workerId: number;
  projectId: number;
  startTime: Date;
  endTime: Date;
  description: string;
}

export interface User {
  username: string;
  role: 'user' | 'admin';
}

export interface SolarTable {
  id?: number;
  projectId: number;
  x: number;
  y: number;
  tableCode: string;
  tableType: 'small' | 'medium' | 'large';
  status: 'pending' | 'completed';
}

export interface TableAssignment {
  id?: number;
  tableId: number;
  workerId: number;
}


export interface PlanMarker {
  id?: number;
  projectId: number;
  workerId: number;
  x: number; // percentage
  y: number; // percentage
  page: number;
}

export interface AttendanceSession {
  id?: number;
  workerId: number;
  startTime: Date;
}

export type AttendanceStatus = 'present' | 'absent' | 'sick' | 'holiday';

export interface DailyLog {
  id?: number;
  date: string; // YYYY-MM-DD
  workerId: number;
  status: AttendanceStatus;
  notes: string;
}

export interface ProjectTask {
  id?: number;
  projectId: number;
  taskType: 'panels' | 'construction' | 'cables';
  description: string;
  
  // Fields for panels
  panelCount?: number;
  pricePerPanel?: number;
  
  // Fields for cables
  tableSize?: 'small' | 'medium' | 'large';
  
  // General fields
  price: number; // This will be the total price for the task
  assignedWorkerId?: number;
  completionDate?: Date;
}


export interface ProjectComponent {
  id?: number;
  projectId: number;
  name: string;
  description: string;
}

export interface AnnotationPath {
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  tool: 'pencil' | 'eraser';
}

export interface PlanAnnotation {
  id?: number;
  projectId: number;
  page: number;
  paths: AnnotationPath[];
}

export interface TableStatusHistory {
  id?: number;
  tableId: number;
  workerId: number;
  status: 'pending' | 'completed';
  timestamp: Date;
}

export interface BackupMetadata {
  appVersion: string;
  itemsCount: {
    workers: number;
    projects: number;
    records: number;
  };
  dataSize: number;
}

export interface Backup {
  id?: number;
  version: string;
  timestamp: Date;
  type: 'auto' | 'manual';
  name?: string;
  data: string; // LZ-compressed JSON string
  metadata: BackupMetadata;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  text: string;
  icon?: string;
}
