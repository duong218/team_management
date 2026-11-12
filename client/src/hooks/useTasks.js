import { useAsync } from "./useAsync";
import * as api from "../api/tasks";
export default function useTasks(id) {
  return useAsync(() => api.listTasks(id), [id]);
}
