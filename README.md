# QuickPaperScissors

A modern, real-time multiplayer Rock, Paper, Scissors game built with React, TypeScript, and Vite. This project utilizes PeerJS for peer-to-peer connectivity, allowing users to play against each other without a dedicated backend server.

## 🚀 Technologies

*   **Frontend:** React 19
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Package Manager:** bun
*   **Styling:** Tailwind CSS (with `@tailwindcss/vite`)
*   **Peer-to-Peer:** PeerJS

## 🛠️ Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/bittere/quickpaperscissors.git
    cd quickpaperscissors
    ```

2.  **Install dependencies:**
    This project uses `bun` as the package manager.
    ```bash
    bun install
    ```

## 💻 Available Scripts

In the project directory, you can run:

| Script | Command | Description |
| :--- | :--- | :--- |
| `bun dev` | `vite` | Runs the app in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in the browser. |
| `bun build` | `tsc -b && vite build` | Builds the app for production to the `dist` folder. |
| `bun lint` | `eslint .` | Runs the linter to check for code quality issues. |
| `bun preview` | `vite preview` | Serves the production build locally for testing. |

## 📝 Project Structure

The core application logic resides in the `src/` directory:

*   `src/App.tsx`: Main application component.
*   `src/main.tsx`: Entry point for the React application.
*   `src/components/`: Contains reusable UI components, including game-specific logic and a custom UI library (`ui/`).
*   `src/lib/utils.ts`: Utility functions.