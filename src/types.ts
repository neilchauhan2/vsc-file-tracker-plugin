export interface ProjectFile {
  name: string;
  path: string;
  type: "file" | "directory";
  lastModified: number;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}
