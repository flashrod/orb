export interface BoostRecord {
  id: string;
  domain: string;
  css: string;
  js: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewBoost = Omit<BoostRecord, 'createdAt' | 'updatedAt'> & Partial<Pick<BoostRecord, 'createdAt' | 'updatedAt'>>;
