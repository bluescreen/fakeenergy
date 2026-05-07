// Shared types for the website. Kept clean — slop-cleaner should
// produce zero findings on this file.

export type EnergySource = "electricity" | "gas" | "solar" | "heat";

export interface SourceContent {
  title: string;
  tagline: string;
  bullets: string[];
  pricePerKwh: number;
}

export interface QuoteRequest {
  email: string;
  source: EnergySource;
  monthlyKwh: number;
  message: string;
}
