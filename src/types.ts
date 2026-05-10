export interface Memory {
  id: string;
  url: string;
  title?: string;
}

export interface HandData {
  landmarks: { x: number; y: number; z: number }[][];
  gestures?: string[];
}

export interface HandTrackingState {
  rotation: { x: number; y: number };
  zoom: number;
  isActive: boolean;
}
