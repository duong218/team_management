import * as api from '../api/reports'
import { useAsync } from './useAsync'
export default function useReport(projectId) {
  return useAsync(() => api.getReport(projectId), [projectId])
}
