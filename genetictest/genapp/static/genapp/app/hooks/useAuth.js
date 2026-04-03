import { getAuth, isAuthed } from "../services/auth.js";

export function useAuth() {
  return {
    isAuthed: isAuthed(),
    auth: getAuth(),
  };
}

export function getRole() {
  return getAuth().role;
}

