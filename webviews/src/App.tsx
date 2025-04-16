import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vscode: any;
  }
}

interface User {
  uid: string;
  displayName: string;
  email: string;
}

interface Project {
  id?: string;
  name: string;
  files: ProjectFile[];
  userId: string;
  createdAt: number;
  updatedAt: number;
}

interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  lastModified: number;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);

  const fetchUserData = async () => {
    try {
      window.vscode.postMessage({ type: "getUserData" });
      window.vscode.postMessage({ type: "getCurrentWorkspace" });
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      window.vscode.postMessage({ type: "authenticateUser" });
    } catch (error) {
      console.error("Error triggering login:", error);
    }
  };

  const handleLogout = () => {
    window.vscode.postMessage({ type: "logout" });
  };

  const handleProjectAction = () => {
    if (!currentWorkspace) return;

    const existingProject = projects.find(p => p.name === currentWorkspace);

    if (existingProject) {
      window.vscode.postMessage({
        type: "updateProject",
        projectId: existingProject.id
      });
    } else {
      window.vscode.postMessage({ type: "saveProject" });
    }
  };

  const handleDeleteProject = (projectId: string) => {
    window.vscode.postMessage({
      type: "deleteProject",
      projectId
    });
  };

  useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "userData":
          setUser(message.value);
          setLoading(false);
          window.vscode.postMessage({ type: "getProjects" });
          break;
        case "userDataNotFound":
          setUser(null);
          setLoading(false);
          break;
        case "projects":
          setProjects(message.value);
          break;
        case "projectSaved":
        case "projectDeleted":
          window.vscode.postMessage({ type: "getProjects" });
          break;
        case "currentWorkspace":
          setCurrentWorkspace(message.value);
          break;
      }
    };

    window.addEventListener('message', messageListener);
    fetchUserData();

    return () => window.removeEventListener('message', messageListener);
  }, []);

  const getCurrentProjectAction = () => {
    if (!currentWorkspace) return null;
    const existingProject = projects.find(p => p.name === currentWorkspace);
    return {
      label: existingProject ? 'Update Project' : 'Save Project',
      action: handleProjectAction
    };
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.name === currentWorkspace) return -1;
    if (b.name === currentWorkspace) return 1;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  const projectAction = getCurrentProjectAction();

  return (
    <div className="container">
      {user ? (
        <>
          <div className="header">
            <h2>Welcome, {user.displayName}</h2>
            <button
              onClick={handleLogout}
              className="logout-btn"
            >
              Logout
            </button>
          </div>

          {currentWorkspace && projectAction && (
            <div className="actions">
              <button
                onClick={projectAction.action}
                className="action-btn"
              >
                {projectAction.label}
              </button>
            </div>
          )}

          <div className="projects-list">
            <h3>Your Projects</h3>
            {currentWorkspace && (
              <p className="workspace-info">
                Current workspace: {currentWorkspace}
              </p>
            )}
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                className={`project-item ${project.name === currentWorkspace ? 'current-project' : ''}`}
              >
                {project.name === currentWorkspace && (
                  <span className="current-label">Current Project</span>
                )}
                <div className="project-header">
                  <h4>
                    {project.name}
                  </h4>
                  <button
                    onClick={() => handleDeleteProject(project.id!)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
                <div className="files-list">
                  {project.files.map((file, index) => (
                    <div key={index} className={`file-item ${project.name === currentWorkspace ? 'current-file-item' : ''}`}>
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={handleLogin}
          className="login-btn"
        >
          Login with Google
        </button>
      )}
    </div>
  );
}