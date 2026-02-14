
export interface ThumbnailData {
  talentImage: string; // base64 string
  talentImageMimeType: string;
  emotion: string;
  overlayText: string;
  theme: string;
  accentColor: string; // Hex ou nome da cor
  framing: string;
}

export interface ThumbnailResult {
  id: string;
  imageUrl: string;
  overlayText: string;
  textSize: number;
  textY: number;
  textX: number;
  textRotation: number;
  presenterX: number; // 0-100
  presenterY: number; // 0-100
  framing: string;
  suggestion: string;
  isRefining: boolean;
}

export interface GeneratedThumbnail {
  id: string;
  imageUrl: string;
  createdAt: number;
}
