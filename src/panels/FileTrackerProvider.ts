import {
  Uri,
  Webview,
  WebviewViewProvider,
  WebviewView,
  TextDocument,
  window,
  commands,
  ExtensionContext,
} from "vscode";
import { getNonce } from "../utils/getNonce";
import { getUri } from "../utils/getUri";
import { clearStoredUser, getStoredUser } from "../authenticate";
import { firebaseService } from "../firebaseService";
import { workspaceService } from "../worspaceService";
import { User } from "../types";

export class FileTrackerProvider implements WebviewViewProvider {
  _view?: WebviewView;
  _doc?: TextDocument;

  constructor(
    private readonly _extensionUri: Uri,
    private readonly _context: ExtensionContext
  ) {}

  public resolveWebviewView(webviewView: WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      this._extensionUri
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "getUserData":
          try {
            const userData = await getStoredUser(this._context);
            if (userData) {
              webviewView.webview.postMessage({
                type: "userData",
                value: userData,
              });
            } else {
              webviewView.webview.postMessage({
                type: "userDataNotFound",
              });
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            webviewView.webview.postMessage({
              type: "userDataNotFound",
            });
          }
          break;
        case "authenticateUser": {
          console.log("Authenticating user...");
          commands.executeCommand("vsc-file-tracker.authenticateUser");
        }

        case "logout": {
          await clearStoredUser(this._context);
          webviewView.webview.postMessage({ type: "userDataNotFound" });
          break;
        }

        case "getProjects": {
          try {
            const userData = await getStoredUser(this._context);
            if (userData) {
              const projects = await firebaseService.getProjects(userData.uid);
              webviewView.webview.postMessage({
                type: "projects",
                value: projects,
              });
            }
          } catch (error) {
            console.error("Error fetching projects:", error);
          }
          break;
        }

        case "saveProject": {
          try {
            const userData = await getStoredUser(this._context);
            if (userData) {
              const workspaceName = workspaceService.getWorkspaceName();
              if (!workspaceName) {
                window.showErrorMessage("No workspace is currently open");
                return;
              }

              const files = await workspaceService.getCurrentWorkspaceFiles();
              await firebaseService.saveProject(
                workspaceName,
                files,
                userData.uid
              );

              webviewView.webview.postMessage({ type: "projectSaved" });
              window.showInformationMessage("Project saved successfully");
            }
          } catch (error) {
            console.error("Error saving project:", error);
            window.showErrorMessage("Failed to save project");
          }
          break;
        }

        case "updateProject": {
          try {
            const files = await workspaceService.getCurrentWorkspaceFiles();
            await firebaseService.updateProject(data.projectId, files);

            webviewView.webview.postMessage({ type: "projectSaved" });
            window.showInformationMessage("Project updated successfully");
          } catch (error) {
            console.error("Error updating project:", error);
            window.showErrorMessage("Failed to update project");
          }
          break;
        }

        case "deleteProject": {
          try {
            await firebaseService.deleteProject(data.projectId);
            webviewView.webview.postMessage({ type: "projectDeleted" });
            window.showInformationMessage("Project deleted successfully");
          } catch (error) {
            console.error("Error deleting project:", error);
            window.showErrorMessage("Failed to delete project");
          }
          break;
        }

        case "getCurrentWorkspace": {
          const workspaceName = workspaceService.getWorkspaceName();
          webviewView.webview.postMessage({
            type: "currentWorkspace",
            value: workspaceName,
          });
          break;
        }

        case "onInfo": {
          if (!data.value) {
            return;
          }
          window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  public revive(panel: WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: Webview, extensionUri: Uri) {
    const styleResetUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, [
      "out",
      "compiled",
      "index.css",
    ]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, [
      "out",
      "compiled",
      "index.js",
    ]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Security-Policy" content="
              default-src 'none';
              img-src ${webview.cspSource} https:;
              script-src ${webview.cspSource} https://apis.google.com 'unsafe-inline';
              connect-src https://*.googleapis.com https://*.firebaseio.com https://vsc-file-tracker-plugin.firebaseapp.com;
              style-src ${webview.cspSource} 'unsafe-inline';
              frame-src https://dev-06xfynruh52w027s.us.auth0.com https://vsc-file-tracker-plugin.firebaseapp.com;
              font-src ${webview.cspSource};
            ">

            <link href="${styleResetUri}" rel="stylesheet">
				    <link href="${styleVSCodeUri}" rel="stylesheet">
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
            <title>VSC File Tracker</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            <script>
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
            </script>
          </body>
        </html>
      `;
  }
}
