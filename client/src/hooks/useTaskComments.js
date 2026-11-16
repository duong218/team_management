import { useAsync } from "./useAsync";
import * as api from "../api/tasks";

export default function useTaskComments(taskId) {
  return useAsync(async () => ({ taskId, rows: taskId ? await api.listComments(taskId) : [] }), [taskId]);
}
