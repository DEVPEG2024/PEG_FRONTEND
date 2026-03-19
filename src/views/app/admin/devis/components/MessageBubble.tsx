import ReactMarkdown from 'react-markdown'
import { HiSparkles } from 'react-icons/hi2'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    image?: string
}

interface MessageBubbleProps {
    message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user'
    if (message.role === 'system') return null

    return (
        <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center mt-0.5">
                    <HiSparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
            )}
            <div className="max-w-[75%]">
                {message.image && (
                    <img src={message.image} alt="Logo" className="w-16 h-16 object-contain rounded-lg mb-2 border border-gray-600" />
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                        ? 'bg-indigo-500/15 text-gray-100'
                        : 'text-gray-200'
                }`}>
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_strong]:text-white">
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    )
}
