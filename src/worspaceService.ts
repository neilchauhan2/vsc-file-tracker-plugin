import * as vscode from "vscode";
import * as path from "path";
import { ProjectFile } from "./types";

export const workspaceService = {
  async getCurrentWorkspaceFiles(): Promise<ProjectFile[]> {
    const files: ProjectFile[] = [];

    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      const workspaceFolder = vscode.workspace.workspaceFolders[0];

      const getAllFiles = async (folderPath: string): Promise<void> => {
        const entries = await vscode.workspace.fs.readDirectory(
          vscode.Uri.file(folderPath)
        );

        for (const [name, type] of entries) {
          const fullPath = path.join(folderPath, name);

          // Skip node_modules and .git directories
          if (name === "node_modules" || name === ".git") {
            continue;
          }

          if (type === vscode.FileType.Directory) {
            files.push({
              name,
              path: fullPath,
              type: "directory",
              lastModified: Date.now(),
            });
            await getAllFiles(fullPath);
          } else {
            files.push({
              name,
              path: fullPath,
              type: "file",
              lastModified: Date.now(),
            });
          }
        }
      };

      await getAllFiles(workspaceFolder.uri.fsPath);
    }

    return files;
  },

  getWorkspaceName(): string | undefined {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      return vscode.workspace.workspaceFolders[0].name;
    }
    return undefined;
  },
};
