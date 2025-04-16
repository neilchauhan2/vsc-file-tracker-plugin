import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ProjectFile {
  name: string;
  path: string;
  type: "file" | "directory";
  lastModified: number;
}

interface Project {
  id?: string;
  name: string;
  files: ProjectFile[];
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export const firebaseService = {
  async saveProject(
    projectName: string,
    files: ProjectFile[],
    userId: string
  ): Promise<string> {
    const project: Project = {
      name: projectName,
      files,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, "projects"), project);
    return docRef.id;
  },

  async updateProject(projectId: string, files: ProjectFile[]): Promise<void> {
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      files,
      updatedAt: Date.now(),
    });
  },

  async getProjects(userId: string): Promise<Project[]> {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Project)
    );
  },

  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(db, "projects", projectId);
    await deleteDoc(projectRef);
  },
};
