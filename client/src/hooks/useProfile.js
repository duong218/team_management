import * as api from "../api/profile";
import { useAsync } from "./useAsync";
export default function useProfile(userId) {
  return useAsync(
    () => (userId ? api.getProfile(userId) : Promise.resolve(null)),
    [userId],
  );
}
