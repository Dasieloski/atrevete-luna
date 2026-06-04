// Importing fonts from fontsource
// These imports should be done in a central location like layout.tsx or a dedicated fonts.ts file
// Example: import '@fontsource/inter/400.css'; // Inter font with weight 400
// Example: import '@fontsource/open-sans/300.css'; // Open Sans with weight 300
// Example: import '@fontsource/roboto/500.css'; // Roboto with weight 500
// Variable fonts: import '@fontsource/inter/variable.css';

// Since we cannot actually import CSS in a .tsx example file without causing build issues in this context,
// we'll document how to use it and create a hook to check if fonts are loaded (conceptual)

// In practice, you would do:
// 1. Install: npm install @fontsource/inter @fontsource/open-sans @fontsource/roboto
// 2. Import in your root layout (e.g., app/layout.tsx):
//    import '@fontsource/inter/400.css';
//    import '@fontsource/inter/500.css';
//    import '@fontsource/open-sans/400.css';
//    import '@fontsource/roboto/700.css';

// Example usage in a component:
/*
import { useEffect, useState } from 'react';

// Custom hook to detect if a font is loaded (simplified)
export function useFontLoaded(fontFamily: string): boolean {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This is a simplified check - in practice you might use the Font Loading API
    const checkFont = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return false;

      // Test with a wide character
      context.font = '72px sans-serif';
      const baselineWidth = context.measureText('wi').width;

      context.font = `72px '${fontFamily}', sans-serif`;
      const fontWidth = context.measureText('wi').width;

      return fontWidth !== baselineWidth;
    };

    if (checkFont()) {
      setIsLoaded(true);
    } else {
      // Retry a few times
      let attempts = 0;
      const interval = setInterval(() => {
        if (checkFont() || attempts > 10) {
          clearInterval(interval);
          setIsLoaded(true);
        }
        attempts++;
      }, 100);
    }

    return () => clearInterval(interval);
  }, [fontFamily]);

  return isLoaded;
}

// Usage in a component:
function TypographyDemo() {
  const interLoaded = useFontLoaded('Inter');
  const openSansLoaded = useFontLoaded('Open Sans');

  return (
    <div className="p-4 space-y-4">
      <h1 
        className={`text-3xl font-bold ${interLoaded ? 'font-inter' : 'font-sans'}`}
      >
        Heading with Inter Font
      </h1>
      <p 
        className={`text-lg ${openSansLoaded ? 'font-open-sans' : 'font-sans'}`}
      >
        Paragraph with Open Sans Font
      </p>
      {!interLoaded || !openSansLoaded ? (
        <p className="text-sm text-yellow-500">Loading fonts...</p>
      ) : null}
    </div>
  );
}
*/

export {};