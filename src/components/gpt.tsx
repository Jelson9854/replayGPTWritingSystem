import React from "react";
import Image from "next/image";
import { Message } from "@/components/types";

type GPTProps = {
  messages?: Message[];
  pasteTexts?: string[];
};

const sleep = (seconds : number) => {
  let timeoutId: NodeJS.Timeout;
  let rejectFn: (reason?: any) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(resolve, seconds * 1000);
  });

  return {
  promise,
  cancel: () => {
    clearTimeout(timeoutId);
    rejectFn(new Error('Sleep cancelled'));
  }
};
};

export default function GPT({ messages = [], pasteTexts = [] }: GPTProps) {
  // Function to check if any paste text matches this message content
  const highlightPastedText = (content: string): React.ReactNode => {
    if (!pasteTexts || pasteTexts.length === 0) {
      return content;
    }

    // Check if any paste text matches (or is contained in) this message
    let hasMatch = false;
    for (const pasteText of pasteTexts) {
      if (pasteText && content.includes(pasteText.trim())) {
        hasMatch = true;
        break;
      }
    }

    // If there's a match, wrap in a highlight span
    if (hasMatch) {
      return (
        <span className="bg-amber-50 rounded px-1">
          {content}
        </span>
      );
    }

    return content;
  };




  return (
    <>
      <h3 className="flex items-center text-[24px] font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="#10a37f"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        ChatGPT Conversation
      </h3>
      <div className="flex flex-col border border-gray-200 rounded-lg !min-w-full overflow-y-auto overflow-x-hidden flex-grow">
        <div className="mb-auto !min-w-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 py-12">
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "w-full py-4 px-4 bg-gray-50 border-b border-gray-200"
                    : "w-full py-4 px-4 bg-white border-b border-gray-200"
                }
              >
                <div className="flex items-center gap-3 mb-2">
                  <Image
                    width={32}
                    height={32}
                    src={
                      m.role === "user"
                        ? "/images/user-icon.png"
                        : "/images/chatgpt-icon.png"
                    }
                    alt={m.role === "user" ? "User" : "ChatGPT"}
                    className="rounded-full"
                  />
                  <div className="font-semibold text-sm text-gray-700">
                    {m.role === "user" ? "User" : "ChatGPT"}
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-gray-800 ml-11 text-xl">
                  {highlightPastedText(m.content)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
