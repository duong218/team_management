import { useAsync } from "./useAsync";
import * as api from "../api/checklist";
export default function useChecklist(taskId) {
  return useAsync(() => api.listChecklist(taskId), [taskId]);
}
