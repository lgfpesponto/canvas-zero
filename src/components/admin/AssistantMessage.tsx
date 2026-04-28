import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantMessage({ role, content }: Props) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-background prose-pre:text-foreground prose-pre:text-xs prose-code:text-xs prose-code:bg-background prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
