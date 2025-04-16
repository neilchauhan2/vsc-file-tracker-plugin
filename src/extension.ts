import * as vscode from "vscode";
import { FileTrackerProvider } from "./panels/FileTrackerProvider";
import { authenticate, getStoredUser } from "./authenticate";

export function activate(context: vscode.ExtensionContext) {
  const fileTrackerProvider = new FileTrackerProvider(
    context.extensionUri,
    context
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vsc-file-tracker",
      fileTrackerProvider
    )
  );

  const authCommand = vscode.commands.registerCommand(
    "vsc-file-tracker.authenticateUser",
    async () => {
      try {
        const user = await authenticate(context);
        if (user) {
          // You can use the user data here if needed
          const storedUser = await getStoredUser(context);
          console.log("Authenticated and stored user:", storedUser);
        }
      } catch (err) {
        console.error("Authentication error:", err);
        vscode.window.showErrorMessage(
          "Authentication failed. Please try again."
        );
      }
    }
  );

  context.subscriptions.push(authCommand);
}

export function deactivate() {}
