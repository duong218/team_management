import { useAsync } from "./useAsync";
import * as api from "../api/projects";
export default function useProject(id) {
  return useAsync(() => api.getProject(id), [id]);
}
