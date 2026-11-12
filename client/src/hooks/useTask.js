import { useAsync } from "./useAsync";
import * as api from "../api/tasks";
export default function useTask(id) {
  return useAsync(() => api.getTask(id), [id]);
}
