import { useState, useEffect } from 'react';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export function usePdf() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.pdfjsLib) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setIsLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // document.body.removeChild(script); // leave it for other components
    };
  }, []);

  const extractText = async (file: File): Promise<string> => {
    if (!isLoaded || !window.pdfjsLib) throw new Error('PDF.js not loaded');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }

    return fullText;
  };

  return { isLoaded, extractText };
}
