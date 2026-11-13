import { useAsync } from './useAsync'
import * as api from '../api/joinRequests'
export default function useJoinRequests(projectId, enabled = true) {
  return useAsync(() => enabled ? projectId ? api.listWaiting(projectId) : api.listMine() : Promise.resolve([]), [projectId, enabled])
}
