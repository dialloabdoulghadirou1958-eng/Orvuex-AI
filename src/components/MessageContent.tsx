import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageContentProps {
  content: string;
  isLast?: boolean;
  isStreaming?: boolean;
}

export function MessageContent({ content, isLast, isStreaming }: MessageContentProps) {
  // Le parseur doit être capable de gérer les blocs "incomplets" pendant le streaming
  const preprocessMarkdown = (text: string) => {
    let processed = text;
    const codeBlockCount = (processed.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      processed += '\n```';
    }
    
    // Add cursor effect for the last message if streaming
    if (isLast && isStreaming) {
      // If we are currently inside an unclosed code block, we append the cursor inside it before closing
      if (codeBlockCount % 2 !== 0) {
        processed = processed.replace(/\n```$/, ' ▍\n```');
      } else {
        processed += ' ▍';
      }
    }
    
    return processed;
  };

  const processedContent = preprocessMarkdown(content);

  return (
    <div className="text-[15px] leading-relaxed space-y-4 break-words w-full min-w-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0 text-zinc-100">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-zinc-50">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-zinc-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-zinc-100">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto w-full max-w-full my-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
              <table className="w-full text-left border-collapse min-w-[600px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-800/50">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/50">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-zinc-900/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="text-zinc-100 font-semibold p-3 border-b border-zinc-800/50 whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="p-3 text-zinc-300 align-top">{children}</td>,
          code(props) {
            const { children, className, node, ...rest } = props;
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
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}

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
