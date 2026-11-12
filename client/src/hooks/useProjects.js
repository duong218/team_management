import * as api from "../api/projects";
import { useAsync } from "./useAsync";
export default function useProjects(userId) {
  return useAsync(() => api.listProjects(userId), [userId]);
}
