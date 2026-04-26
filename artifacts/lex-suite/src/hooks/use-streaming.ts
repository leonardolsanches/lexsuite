import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { useToast } from '@/hooks/use-toast';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const { getToken } = useAuth();
  const { toast } = useToast();

  const startStream = useCallback(async (requestData: any, onComplete?: (fullContent: string) => void) => {
    setIsStreaming(true);
    setStreamContent('');
    let fullContent = '';

    try {
      const token = await getToken();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Analysis failed to start');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No readable stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamContent((prev) => prev + parsed.content);
              }
            } catch (e) {
              // skip parse errors
            }
          }
        }
      }
      
      if (onComplete) {
        onComplete(fullContent);
      }
    } catch (error: any) {
      toast({
        title: 'Streaming Error',
        description: error.message || 'Failed to analyze',
        variant: 'destructive'
      });
    } finally {
      setIsStreaming(false);
    }
  }, [getToken, toast]);

  return { isStreaming, streamContent, startStream, setStreamContent };
}
