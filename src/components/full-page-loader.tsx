import { Icons } from "./icons";

export default function FullPageLoader() {
  return (
    <div data-lenis-prevent className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Icons.logo className="h-16 w-auto mb-4" />
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 animate-bounce rounded-full bg-primary"></div>
      </div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
