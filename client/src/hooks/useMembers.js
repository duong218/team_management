import { useAsync } from "./useAsync";
import * as api from "../api/members";
export default function useMembers(id) {
  return useAsync(() => api.listMembers(id), [id]);
}
