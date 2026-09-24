import { apiClient } from './apiClient';
import type { AnalyticsSummary } from '../types';

export const analyticsService = {
  getSummary: () => apiClient.get<AnalyticsSummary>('/analytics/summary'),
};
