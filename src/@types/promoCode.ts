export type PromoCode = {
  documentId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: string;
  validUntil?: string;
  minOrderAmount?: number;
  active: boolean;
};

export type PromoCodeValidation = {
  valid: boolean;
  reason?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
};
