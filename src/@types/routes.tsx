import { LayoutType } from './theme';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

export interface Meta {
  pageContainerType?: 'default' | 'gutterless' | 'contained';
  header?: string | ReactNode;
  headerContainer?: boolean;
  extraHeader?: LazyExoticComponent<() => JSX.Element>;
  footer?: boolean;
  layout?: LayoutType;
}

export type Route = {
  key: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: LazyExoticComponent<ComponentType<any>>;
  authority: string[];
  meta?: Meta;
};

export type Routes = Route[];
