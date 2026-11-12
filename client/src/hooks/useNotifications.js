import { useAsync } from "./useAsync";
import * as api from "../api/notifications";
export default function useNotifications(userId) {
  return useAsync(
    () => (userId ? api.listNotificationsForUser(userId) : Promise.resolve([])),
    [userId],
  );
}
