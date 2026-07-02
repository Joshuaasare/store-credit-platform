import { Button } from "@store-credit-platform/web-components";

export function NxWelcome({ title }: { title?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="space-y-6 p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {title} works!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Vite + React + Tailwind CSS v4 is running
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="default" size="lg">
            Primary Button
          </Button>
          <Button variant="outline" size="lg">
            Outline Button
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NxWelcome;
