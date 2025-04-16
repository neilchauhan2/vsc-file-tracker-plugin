import express from "express";
import * as vscode from "vscode";
import path from "path";
import { User } from "./types";

export const authenticate = async (context: vscode.ExtensionContext) => {
  return new Promise((resolve, reject) => {
    const server = express();
    let httpServer: any;

    // Parse URL-encoded bodies (as sent by HTML forms)
    server.use(express.urlencoded({ extended: true }));
    // Parse JSON bodies (as sent by API clients)
    server.use(express.json());

    server.get("/authenticated", async (req, res) => {
      const userData = req.query.user;

      try {
        // Parse the user data
        const user = JSON.parse(decodeURIComponent(userData as string));
        console.log("User data:", user);

        // Store user data in global state
        try {
          await context.globalState.update("userData", user);
          console.log("User data saved to global state");

          // Close the server after receiving the user data
          httpServer.close();

          // Send a success message that will close the window
          res.send(`
            <html>
              <body>
                <script>
                  window.close();
                </script>
                Authentication successful! You can close this window.
              </body>
            </html>
          `);

          // reload vscode window
          vscode.commands.executeCommand("workbench.action.reloadWindow");

          // Show success message in VSCode
          vscode.window.showInformationMessage(
            `Logged in as ${user.displayName}`
          );

          // Resolve the promise with the user data
          resolve(user);
        } catch (error: any) {
          console.error("Error saving user data to global state:", error);
          reject(error);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        reject(error);
        res.status(400).send("Authentication failed");
      }
    });

    server.get("/login", (req, res) => {
      res.sendFile(path.join(__dirname, "login.html"));
    });

    server.use(express.static(path.join(__dirname, "public")));

    httpServer = server.listen(4200, () => {
      console.log("Server running on port 4200");
      // Open the login page in the default browser
      vscode.env.openExternal(vscode.Uri.parse("http://localhost:4200/login"));
    });
  });
};

// Helper function to get the user data from global state
export const getStoredUser = async (
  context: vscode.ExtensionContext
): Promise<User> => {
  const user = (await context.globalState.get("userData")) as User;
  console.log("User data from global state:", user);
  return user;
};

// Helper function to clear the user data from global state (for logout)
export const clearStoredUser = async (context: vscode.ExtensionContext) => {
  await context.globalState.update("userData", undefined);
};
