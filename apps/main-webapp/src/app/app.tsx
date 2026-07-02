// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import { Button } from "@store-credit-platform/web-components";

import { ThemeProvider } from "./shared/providers/theme-provider";

export function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Button variant="destructive">Hello</Button>
    </ThemeProvider>
  );
}

export default App;
