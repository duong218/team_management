import { useAsync } from './useAsync'
import * as api from '../api/joinRequests'
export default function useJoinRequests(projectId) {
  return useAsync(() => projectId ? api.listWaiting(projectId) : api.listMine(), [projectId])
}
