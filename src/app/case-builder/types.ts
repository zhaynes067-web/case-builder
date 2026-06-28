export interface CaseContent {
  type: 'text' | 'image' | 'video' | 'youtube' | 'link';
  content: string;
}

export interface Case {
  id?: string;
  contents: CaseContent[];
  color?: string;
}
