export type FieldWidth = 25 | 33 | 50 | 66 | 75 | 100;

export type Option = { label: string; value: string };

export type FieldCategory = 'basic' | 'advanced' | 'layout';

export type Field = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  width: FieldWidth;
  defaultValue?: string;
  options?: Option[];
  // Layout-specific
  columns?: number;
  content?: string;
  panelTitle?: string;
  tabs?: string[];
  rows?: number;
  cols?: number;
};

export type BannerConfig = {
  imageDataUrl?: string;
  title?: string;
  subtitle?: string;
};

export type FormStructure = {
  banner?: BannerConfig;
  fields: Field[];
};

export type FieldDef = {
  type: string;
  label: string;
  iconChar: string;
  color: string;
  category: FieldCategory;
};
