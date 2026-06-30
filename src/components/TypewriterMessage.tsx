import { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MessageContentProps } from '../types';

const MarkdownComponents = {
  p: ({ children }: any) => <p className="mb-4 last:mb-0 text-zinc-100">{children}</p>,
  strong: ({ children }: any) => <strong className="font-bold text-zinc-50">{children}</strong>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 text-zinc-100">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-zinc-100">{children}</ol>,
  li: ({ children }: any) => <li className="pl-1">{children}</li>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto w-full max-w-full my-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
      <table className="w-full text-left border-collapse min-w-[600px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-zinc-800/50">{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-zinc-800/50">{children}</tbody>,
  tr: ({ children }: any) => <tr className="hover:bg-zinc-900/30 transition-colors">{children}</tr>,
  th: ({ children }: any) => <th className="text-zinc-100 font-semibold p-3 border-b border-zinc-800/50 whitespace-nowrap">{children}</th>,
  td: ({ children }: any) => <td className="p-3 text-zinc-300 align-top">{children}</td>,
  code(props: any) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    const inline = !match && !className?.includes('language-');
    
    if (inline) {
      return (
        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-200" {...rest}>
          {children}
        </code>
      );
    }
    
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');
    
    return <CodeBlock language={language} code={codeString} />;
  }
};

function CodeBlock({ language, code }: { language: string, code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 w-full min-w-0">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copié</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copier le code</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto w-full text-sm font-mono">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function TypewriterMessage({ content, isLast, isStreaming }: MessageContentProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const bufferRef = useRef('');
  const lastProcessedContentRef = useRef('');

  useEffect(() => {
    // Detect new content added to total content
    if (content.length > lastProcessedContentRef.current.length) {
      const newContent = content.slice(lastProcessedContentRef.current.length);
      bufferRef.current += newContent;
      lastProcessedContentRef.current = content;
    }
  }, [content]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    const interval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        // Take a larger chunk from the buffer for less frequent, smoother updates
        const chunk = bufferRef.current.slice(0, 20); 
        bufferRef.current = bufferRef.current.slice(20);
        setDisplayedContent(prev => prev + chunk);
      }
    }, 100); // 10fps ~ 100ms pour maximiser la fluidité et réduire la charge UI

    return () => clearInterval(interval);
  }, [isStreaming, content]);

  // Handle the cursor
  const display = isStreaming ? `${displayedContent}▍` : displayedContent;

  return (
    <div className="text-[15px] leading-relaxed break-words w-full min-w-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents as any}
      >
        {display}
      </Markdown>
    </div>
  );
}
